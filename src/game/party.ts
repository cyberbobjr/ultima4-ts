// Party member state checks shared by the whole engine.
import type { PlayerRecord } from "../formats/save";

/** 1000:0E82: member able to act ('G'ood or 'P'oisoned). */
export const canAct = (p: PlayerRecord) => p.status === "G" || p.status === "P";

/** 1000:0E4E: member alive ('G', 'P' or 'S'leeping). */
export const isAlive = (p: PlayerRecord) => p.status === "G" || p.status === "P" || p.status === "S";

/** FUN_1000_097D: experience, capped at 9999. */
export function addXp(p: PlayerRecord, n: number) { p.xp = Math.min(9999, p.xp + n); }
