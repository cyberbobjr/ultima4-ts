// Equipment rules shared by R)eady / W)ear (1000:7631 / 1000:7732) and the inventory panel.
// A member holds one weapon and one armour; the party stock counts the items not held.
// Index 0 (Hands / Skin) is always available and never counted.
import type { PlayerRecord, SaveGame } from "../formats/save";
import { ARMOURS, WEAPONS } from "../data/tables";

/** "ok" (applied), "noneLeft" (not in stock) or "notAllowed" (class mask). */
export type EquipResult = "ok" | "noneLeft" | "notAllowed";

/** Equipment masks: bit 0x80 >> class. */
export const classMayUseWeapon = (klass: number, w: number): boolean => (WEAPONS[w].classMask & (0x80 >> klass)) !== 0;
export const classMayUseArmour = (klass: number, a: number): boolean => (ARMOURS[a].classMask & (0x80 >> klass)) !== 0;

/** Checks then swaps: the old item goes back to the stock, the new one is taken from it. */
function equip(stock: number[], held: number, item: number, allowed: boolean): { result: EquipResult; held: number } {
  if (item !== 0 && stock[item] <= 0) return { result: "noneLeft", held };
  if (!allowed) return { result: "notAllowed", held };
  if (held !== 0) stock[held]++;
  if (item !== 0) stock[item]--;
  return { result: "ok", held: item };
}

/** Readies weapon `w` for `p` (stock in `s.weapons`). */
export function equipWeapon(s: SaveGame, p: PlayerRecord, w: number): EquipResult {
  const r = equip(s.weapons, p.weapon, w, classMayUseWeapon(p.klass, w));
  p.weapon = r.held;
  return r.result;
}

/** Wears armour `a` for `p` (stock in `s.armour`). */
export function equipArmour(s: SaveGame, p: PlayerRecord, a: number): EquipResult {
  const r = equip(s.armour, p.armour, a, classMayUseArmour(p.klass, a));
  p.armour = r.held;
  return r.result;
}

/** Weapons `p` may switch to: the one held, Hands, and those in stock its class may use. */
export function weaponChoices(s: SaveGame, p: PlayerRecord): number[] {
  return WEAPONS.map((_, w) => w).filter((w) => w === p.weapon || ((w === 0 || s.weapons[w] > 0) && classMayUseWeapon(p.klass, w)));
}

/** Armours `p` may switch to: the one worn, Skin, and those in stock its class may use. */
export function armourChoices(s: SaveGame, p: PlayerRecord): number[] {
  return ARMOURS.map((_, a) => a).filter((a) => a === p.armour || ((a === 0 || s.armour[a] > 0) && classMayUseArmour(p.klass, a)));
}
