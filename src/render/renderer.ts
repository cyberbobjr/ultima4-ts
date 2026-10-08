// three.js presentation layer. Everything is laid out in the original 320x200 screen space:
// - a 2D UI canvas (frame, text, status) uploaded as a texture on top,
// - an instanced 11x11 tile grid for the map views (towns, overworld, combat),
// - an optional perspective scene drawn inside the map viewport (dungeons).
import * as THREE from "three";
import { EGA_PALETTE } from "../formats/ega";
import { SCROLL_TILES } from "../game/tiles";
import type { Assets } from "./assets";

export const SCREEN_W = 320, SCREEN_H = 200;
export const VIEW_X = 8, VIEW_Y = 8, VIEW_TILES = 11, TILE = 16;

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly ui: CanvasRenderingContext2D;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, SCREEN_W, 0, SCREEN_H, -10, 10);
  private readonly uiTexture: THREE.CanvasTexture;
  private readonly atlasData: Uint8Array<ArrayBuffer>;
  readonly atlas: THREE.DataTexture;
  private readonly tileAttr: THREE.InstancedBufferAttribute;
  private readonly mapMesh: THREE.InstancedMesh;
  private readonly glyphAtlas: HTMLCanvasElement;
  /** Optional 3D view rendered inside the map viewport (dungeons). */
  view3d: { scene: THREE.Scene; camera: THREE.Camera } | null = null;

  constructor(canvas: HTMLCanvasElement, readonly assets: Assets) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.gl.setClearColor(0x000000);
    this.gl.autoClear = false;

    // Tile atlas: 16x16 grid of 16x16 tiles.
    this.atlasData = new Uint8Array(256 * 256 * 4);
    assets.tiles.forEach((tile, t) => this.blitTile(t, tile.pixels));
    this.atlas = new THREE.DataTexture(this.atlasData, 256, 256, THREE.RGBAFormat);
    this.atlas.magFilter = this.atlas.minFilter = THREE.NearestFilter;
    this.atlas.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(TILE, TILE);
    const count = VIEW_TILES * VIEW_TILES;
    this.tileAttr = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.tileAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aTile", this.tileAttr);
    const mat = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: this.atlas } },
      vertexShader: /* glsl */ `
        attribute float aTile;
        varying vec2 vUv; varying float vTile;
        void main() {
          vUv = uv; vTile = aTile;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas; varying vec2 vUv; varying float vTile;
        void main() {
          if (vTile < 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
          float t = floor(vTile + 0.5);
          vec2 cell = vec2(mod(t, 16.0), floor(t / 16.0));
          vec2 px = clamp(floor(vUv * 16.0), 0.0, 15.0);
          gl_FragColor = texture2D(atlas, (cell * 16.0 + px + 0.5) / 256.0);
        }`,
      side: THREE.DoubleSide,
    });
    this.mapMesh = new THREE.InstancedMesh(geo, mat, count);
    this.mapMesh.frustumCulled = false;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const x = i % VIEW_TILES, y = Math.floor(i / VIEW_TILES);
      m.makeTranslation(VIEW_X + x * TILE + TILE / 2, VIEW_Y + y * TILE + TILE / 2, 0);
      this.mapMesh.setMatrixAt(i, m);
      this.tileAttr.setX(i, -1);
    }
    this.scene.add(this.mapMesh);

    // UI layer.
    const uiCanvas = document.createElement("canvas");
    uiCanvas.width = SCREEN_W; uiCanvas.height = SCREEN_H;
    this.ui = uiCanvas.getContext("2d")!;
    this.ui.imageSmoothingEnabled = false;
    this.uiTexture = new THREE.CanvasTexture(uiCanvas);
    this.uiTexture.flipY = false;
    this.uiTexture.magFilter = this.uiTexture.minFilter = THREE.NearestFilter;
    this.uiTexture.colorSpace = THREE.NoColorSpace;
    const uiMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      new THREE.MeshBasicMaterial({ map: this.uiTexture, transparent: true, side: THREE.DoubleSide }),
    );
    uiMesh.position.set(SCREEN_W / 2, SCREEN_H / 2, 1);
    this.scene.add(uiMesh);

    // Glyph atlas for text (one row of 8x8 glyphs).
    this.glyphAtlas = document.createElement("canvas");
    this.glyphAtlas.width = assets.glyphs.length * 8;
    this.glyphAtlas.height = 8;
    const gctx = this.glyphAtlas.getContext("2d")!;
    const img = gctx.createImageData(this.glyphAtlas.width, 8);
    assets.glyphs.forEach((g, c) => {
      for (let i = 0; i < 64; i++) {
        const [r, gg, b] = EGA_PALETTE[g.pixels[i]];
        img.data.set([r, gg, b, 255], ((i >> 3) * this.glyphAtlas.width + c * 8 + (i & 7)) * 4);
      }
    });
    gctx.putImageData(img, 0, 0);

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private blitTile(t: number, pixels: Uint8Array) {
    const ox = (t % 16) * 16, oy = Math.floor(t / 16) * 16;
    for (let i = 0; i < 256; i++) {
      const [r, g, b] = EGA_PALETTE[pixels[i]];
      this.atlasData.set([r, g, b, 255], ((oy + (i >> 4)) * 256 + ox + (i & 15)) * 4);
    }
  }

  /** Water, fields and lava scroll one pixel row per tick, as in the original. */
  animateTiles() {
    for (const t of SCROLL_TILES) {
      const p = this.assets.tiles[t].pixels;
      const last = p.slice(240, 256);
      p.copyWithin(16, 0, 240);
      p.set(last, 0);
      this.blitTile(t, p);
    }
    this.atlas.needsUpdate = true;
  }

  /** 121 tile ids in row-major order; -1 renders black. null hides the grid. */
  setView(tiles: ArrayLike<number> | null) {
    this.mapMesh.visible = tiles !== null;
    if (!tiles) return;
    for (let i = 0; i < VIEW_TILES * VIEW_TILES; i++) this.tileAttr.setX(i, tiles[i]);
    this.tileAttr.needsUpdate = true;
  }

  /** Copies a full 320x200 indexed picture into the UI layer. */
  drawPicture(pixels: Uint8Array, transparentBlack = false) {
    const img = this.ui.createImageData(SCREEN_W, SCREEN_H);
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = EGA_PALETTE[pixels[i]];
      img.data.set([r, g, b, transparentBlack && pixels[i] === 0 ? 0 : 255], i * 4);
    }
    this.ui.putImageData(img, 0, 0);
  }

  drawGlyph(code: number, col: number, row: number) {
    this.ui.drawImage(this.glyphAtlas, (code & 0x7f) * 8, 0, 8, 8, col * 8, row * 8, 8, 8);
  }

  drawText(text: string, col: number, row: number) {
    for (let i = 0; i < text.length; i++) this.drawGlyph(text.charCodeAt(i), col + i, row);
  }

  /** Draws a tile into the UI layer at pixel coordinates. */
  drawTileUI(t: number, x: number, y: number) {
    const img = this.ui.createImageData(16, 16);
    const p = this.assets.tiles[t].pixels;
    for (let i = 0; i < 256; i++) {
      const [r, g, b] = EGA_PALETTE[p[i]];
      img.data.set([r, g, b, 255], i * 4);
    }
    this.ui.putImageData(img, x, y);
  }

  clearRect(x: number, y: number, w: number, h: number) { this.ui.clearRect(x, y, w, h); }

  fillRect(x: number, y: number, w: number, h: number, color: number) {
    const [r, g, b] = EGA_PALETTE[color];
    this.ui.fillStyle = `rgb(${r},${g},${b})`;
    this.ui.fillRect(x, y, w, h);
  }

  resize() {
    // The original 320x200 mode was shown on a 4:3 monitor (non-square pixels).
    const aspect = 4 / 3;
    let w = window.innerWidth, h = window.innerHeight;
    if (w / h > aspect) w = Math.floor(h * aspect); else h = Math.floor(w / aspect);
    this.gl.setPixelRatio(window.devicePixelRatio);
    this.gl.setSize(w, h);
  }

  render() {
    this.uiTexture.needsUpdate = true;
    const size = this.gl.getSize(new THREE.Vector2());
    this.gl.setScissorTest(false);
    this.gl.setViewport(0, 0, size.x, size.y);
    this.gl.clear();
    this.gl.render(this.scene, this.camera);
    if (this.view3d) {
      // Map viewport in GL coordinates (origin bottom-left), drawn over the (hidden) tile grid.
      const sx = size.x / SCREEN_W, sy = size.y / SCREEN_H;
      const vw = VIEW_TILES * TILE * sx, vh = VIEW_TILES * TILE * sy;
      const vx = VIEW_X * sx, vy = size.y - (VIEW_Y * sy + vh);
      this.gl.setViewport(vx, vy, vw, vh);
      this.gl.setScissor(vx, vy, vw, vh);
      this.gl.setScissorTest(true);
      this.gl.clearDepth();
      this.gl.render(this.view3d.scene, this.view3d.camera);
      this.gl.setScissorTest(false);
      this.gl.setViewport(0, 0, size.x, size.y);
    }
  }
}
