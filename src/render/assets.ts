import { assets, type LoadedPack } from "../assets/store";
import type { IndexedImage } from "../formats/ega";

export interface Assets {
  tiles: IndexedImage[];
  glyphs: IndexedImage[];
  frame: IndexedImage; // START.EGA: the in-game screen border
  /** Tile pack of the map views (the original one, or HD...). */
  pack: LoadedPack;
}

export async function loadAssets(packName = "original"): Promise<Assets> {
  const [tiles, glyphs, frame] = await Promise.all([assets.tiles(), assets.glyphs(), assets.screen("START.EGA")]);
  let pack: LoadedPack;
  try { pack = await assets.loadPack(packName); } catch (e) {
    console.warn(`tile pack "${packName}" unavailable, using the original tiles`, e);
    pack = await assets.loadPack("original");
  }
  return { tiles, glyphs, frame, pack };
}
