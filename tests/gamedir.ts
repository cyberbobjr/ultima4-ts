// Shared helper for tests that need the original game files (skipped when absent).
import fs from "node:fs";
import path from "node:path";

export const GAME_DIR = process.env.U4_GAME_DIR ?? "C:/Program Files/GOG Galaxy/Games/Ultima 4";
export const hasGame = fs.existsSync(path.join(GAME_DIR, "AVATAR.EXE"));
export const readGame = (f: string) => new Uint8Array(fs.readFileSync(path.join(GAME_DIR, f)));
