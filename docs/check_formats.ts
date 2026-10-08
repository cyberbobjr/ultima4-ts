// Dev check: node-run sanity test of the decoders against the real data files.
import fs from "node:fs";
import path from "node:path";
import { decodeSave, encodeSave } from "../src/formats/save";
import { decodeTalk } from "../src/formats/tlk";
import { decodeTown } from "../src/formats/maps";
const G = process.env.U4_GAME_DIR ?? "C:/Program Files/GOG Galaxy/Games/Ultima 4";
const rd = (f: string) => new Uint8Array(fs.readFileSync(path.join(G, f)));
for (const f of ["PARTY.NEW", "PARTY.SAV"]) {
  const raw = rd(f); const s = decodeSave(raw);
  const back = encodeSave(s);
  console.log(f, "roundtrip", Buffer.compare(Buffer.from(raw), Buffer.from(back)) === 0);
  console.log(JSON.stringify({ ...s, players: s.players.filter((p) => p.name).map((p) => `${p.name} cls${p.klass} hp${p.hp}/${p.hpMax} xp${p.xp} s${p.str} d${p.dex} i${p.int} w${p.weapon} a${p.armour} ${p.status} sex${p.sex}`) }));
}
console.log(decodeTalk(rd("LCB.TLK")).map((d) => d && `${d.name}:${d.keyword1}/${d.keyword2}`).join(" | "));
console.log(decodeTown(rd("LCB_1.ULT")).npcs.map((n) => `${n.tile.toString(16)}@${n.x},${n.y} m${n.movement} t${n.talk}`).join(" "));
{
  const raw = rd("PARTY.SAV"); const back = encodeSave(decodeSave(raw));
  const diffs: string[] = [];
  raw.forEach((b, i) => { if (b !== back[i]) diffs.push(`${i}:${b.toString(16)}/${back[i].toString(16)}`); });
  console.log("diffs", diffs.slice(0, 20).join(" "), diffs.length);
}
