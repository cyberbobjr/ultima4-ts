// Karma (save.karma[8]): the only implementation of the original's karma routines.
import type { Game } from "./game";
import { putc } from "./prompts";
import { TALK } from "./town/strings";

export const enum Virtue { Honesty, Compassion, Valor, Justice, Sacrifice, Honor, Spirituality, Humility }

/** karma_inc 1000:09F8: no change once elevated (0), else +n capped at 99. */
export function karmaInc(g: Game, v: number, n: number) {
  const k = g.save.karma;
  if (k[v] === 0 || n <= 0) return;
  k[v] = Math.min(99, k[v] + n);
}

/** karma_dec 1000:0A17: an elevated virtue (0) falls back to 99 with "Thou hast lost an Eighth!"; floor 1. */
export function karmaDec(g: Game, v: number, n: number) {
  const k = g.save.karma;
  if (k[v] === 0) { k[v] = 99; for (const ch of TALK.lostEighth) putc(g, ch); }
  const old = k[v];
  k[v] = old - n;
  if (old < n || k[v] === 0) k[v] = 1;
}

/** Signed convenience wrapper over karmaInc/karmaDec. */
export function adjustKarma(g: Game, v: number, delta: number) {
  if (delta >= 0) karmaInc(g, v, delta); else karmaDec(g, v, -delta);
}

/** Gains throttled to one per 16 moves (DS:0x9330 = save.lastVirtue, compared with moves >> 4). */
export function virtueReady(g: Game): boolean {
  const m = Math.floor(g.save.moves / 16);
  return m > 0xffff || m !== g.save.lastVirtue;
}
export function markVirtue(g: Game) { g.save.lastVirtue = Math.floor(g.save.moves / 16) & 0xffff; }
