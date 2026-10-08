// Equipment rules (R)eady / W)ear and the inventory panel): stock, class masks, swaps.
import { describe, expect, it } from "vitest";
import type { PlayerRecord, SaveGame } from "../src/formats/save";
import { armourChoices, classMayUseArmour, classMayUseWeapon, equipArmour, equipWeapon, weaponChoices } from "../src/game/equipment";

const MAGE = 0, FIGHTER = 2, PALADIN = 5;

function setup(klass: number, weapon = 0, armour = 0) {
  const p = { klass, weapon, armour } as PlayerRecord;
  const s = { weapons: new Array(16).fill(0), armour: new Array(8).fill(0) } as SaveGame;
  return { p, s };
}

describe("equipment rules", () => {
  it("class masks (bit 0x80 >> class)", () => {
    expect(classMayUseWeapon(MAGE, 1)).toBe(true); // staff: everyone
    expect(classMayUseWeapon(MAGE, 6)).toBe(false); // sword 0x6f: not mage
    expect(classMayUseWeapon(FIGHTER, 6)).toBe(true);
    expect(classMayUseWeapon(MAGE, 14)).toBe(true); // wand 0xd0
    expect(classMayUseWeapon(FIGHTER, 14)).toBe(false);
    expect(classMayUseArmour(MAGE, 3)).toBe(false); // chain 0x2c
    expect(classMayUseArmour(PALADIN, 6)).toBe(true); // magic plate 0x04
    expect(classMayUseArmour(FIGHTER, 6)).toBe(false);
  });

  it("swaps with the stock", () => {
    const { p, s } = setup(FIGHTER, 1);
    s.weapons[6] = 2;
    expect(equipWeapon(s, p, 6)).toBe("ok");
    expect(p.weapon).toBe(6);
    expect(s.weapons[6]).toBe(1);
    expect(s.weapons[1]).toBe(1); // the staff went back
    expect(equipWeapon(s, p, 0)).toBe("ok"); // hands: always, never counted
    expect(s.weapons[6]).toBe(2);
    expect(s.weapons[0]).toBe(0);
  });

  it("refuses items not in stock, then the class (in that order)", () => {
    const { p, s } = setup(MAGE, 1, 1);
    expect(equipWeapon(s, p, 6)).toBe("noneLeft");
    s.weapons[6] = 1;
    expect(equipWeapon(s, p, 6)).toBe("notAllowed");
    expect(p.weapon).toBe(1);
    expect(s.weapons[6]).toBe(1);
    expect(equipArmour(s, p, 3)).toBe("noneLeft");
    s.armour[3] = 1;
    expect(equipArmour(s, p, 3)).toBe("notAllowed");
    expect(equipArmour(s, p, 0)).toBe("ok");
    expect(p.armour).toBe(0);
    expect(s.armour[1]).toBe(1);
  });

  it("the held item alone is not in stock: re-readying it fails like the original", () => {
    const { p, s } = setup(FIGHTER, 6);
    expect(equipWeapon(s, p, 6)).toBe("noneLeft");
    expect(p.weapon).toBe(6);
  });

  it("lists the choices: held, hands/skin, and usable items in stock", () => {
    const { p, s } = setup(MAGE, 1, 1);
    s.weapons[6] = 3; s.weapons[2] = 1; s.weapons[14] = 1;
    expect(weaponChoices(s, p)).toEqual([0, 1, 2, 14]);
    s.armour[2] = 1; s.armour[3] = 1;
    expect(armourChoices(s, p)).toEqual([0, 1]); // leather 0x7f and chain 0x2c: not for mages
    p.klass = FIGHTER;
    expect(armourChoices(s, p)).toEqual([0, 1, 2, 3]);
  });
});
