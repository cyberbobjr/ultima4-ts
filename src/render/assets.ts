import { loadGameFile } from "../io/gamefs";
import { decodeCharset, decodeScreen, decodeTiles, type IndexedImage } from "../formats/ega";

export interface Assets {
  tiles: IndexedImage[];
  glyphs: IndexedImage[];
  frame: IndexedImage; // START.EGA: the in-game screen border
}

export async function loadAssets(): Promise<Assets> {
  const [shapes, charset, start] = await Promise.all([loadGameFile("SHAPES.EGA"), loadGameFile("CHARSET.EGA"), loadGameFile("START.EGA")]);
  return { tiles: decodeTiles(shapes), glyphs: decodeCharset(charset), frame: decodeScreen(start) };
}
