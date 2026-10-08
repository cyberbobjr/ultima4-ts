import { assets } from "../assets/store";
import type { IndexedImage } from "../formats/ega";

export interface Assets {
  tiles: IndexedImage[];
  glyphs: IndexedImage[];
  frame: IndexedImage; // START.EGA: the in-game screen border
}

export async function loadAssets(): Promise<Assets> {
  const [tiles, glyphs, frame] = await Promise.all([assets.tiles(), assets.glyphs(), assets.screen("START.EGA")]);
  return { tiles, glyphs, frame };
}
