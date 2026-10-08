# Ultima IV — TypeScript + three.js + Tauri

*[Version française](README.fr.md)*

A reimplementation of **Ultima IV: Quest of the Avatar** (DOS version, as sold by GOG) written in
TypeScript, rendered with three.js and packaged as a desktop app with Tauri v2.

The engine was rebuilt by reverse engineering the original game: the data file formats were decoded
and the executables (`AVATAR.EXE`, after removing its EXEPACK compression, and `TITLE.EXE`) were
decompiled with Ghidra. Game rules, formulas and tables cite the original function addresses
(`1000:xxxx`) and data offsets (`DS:xxxx`) in comments. See `docs/RE_NOTES.md`.

## You need the original game files

No original code is executed (no DOSBox, no emulation), but the game **data** is read at runtime:
`WORLD.MAP`, `SHAPES.EGA`, `CHARSET.EGA`, town maps (`*.ULT`), dialogues (`*.TLK`), combat arenas
(`*.CON`), dungeons (`*.DNG`), pictures (`*.EGA`), and `TITLE.EXE` (read as data for the intro texts
and tables).

These files are **not included** in this repository. Ultima IV is available for free on GOG.
By default they are read from:

```
C:\Program Files\GOG Galaxy\Games\Ultima 4
```

Set the `U4_GAME_DIR` environment variable to use another location. The original install is never
modified: saves go to the app data directory (Tauri) or to `localStorage` (browser mode).

> Note for redistribution: `src/data/tables.ts` and `src/game/town/strings.ts` currently contain text
> extracted from `AVATAR.EXE`. They should be loaded from the user's copy at runtime (as the intro
> already does with `TITLE.EXE`) before publishing builds.

## Running

A Node.js runtime is provided in `.nodeenv`; Rust (MSVC toolchain) is required for Tauri.

PowerShell:

```powershell
$env:Path = "E:\IdeaProjects\u4\.nodeenv\Scripts;" + $env:Path
npm install
npm run tauri dev   # desktop app, front-end hot reload
npm run dev         # browser only: http://127.0.0.1:1420
npm run build       # type check + production bundle
```

Git Bash: `export PATH="/e/IdeaProjects/u4/.nodeenv/Scripts:$PATH"`, then the same commands.

In dev mode, `http://127.0.0.1:1420/?skipintro` starts directly on the overworld (used by the
automated tests); the game instance is exposed as `window.__game`.

## Project layout

| Path | Contents |
|---|---|
| `src/formats` | decoders for the original files: RLE/LZW pictures (`compression.ts`), EGA tiles/font, WORLD.MAP / ULT / CON / DNG, TLK dialogues, PARTY.SAV (byte-exact round trip) |
| `src/render` | three.js renderer: tile atlas + instanced 11x11 tile grid, 320x200 UI layer, scissored 3D viewport |
| `src/game` | engine: main loop and commands (`game.ts`), conversations (`talk.ts`), shops and Lord British (`shops.ts`), combat (`combat.ts`), dungeons (`dungeon.ts`), spells (`magic.ts`), items (`items.ts`), shrines (`shrine.ts`), intro (`intro.ts`) |
| `src/intro` | title screen and character creation (gypsy cards), driven by data read from `TITLE.EXE` |
| `src/dungeon` | first-person dungeon view (three.js) and dungeon tables |
| `src/data` | rule tables extracted from `AVATAR.EXE` (monsters, weapons, armour, spells, shops, karma events...) |
| `src-tauri` | Tauri v2 shell: reads game files, stores saves |
| `docs` | reverse-engineering notes |

## Controls (keyboard, as in the original)

Arrows: move · A)ttack · B)oard · C)ast · D)escend · E)nter · F)ire · G)et chest · H)ole up ·
I)gnite torch · J)immy · K)limb · L)ocate · M)ix · N)ew order · O)pen · P)eer · Q)uit & save ·
R)eady · S)earch · T)alk · U)se · W)ear · X)it · Y)ell · Z)tats · Space: pass

In dungeons: Up/Down to advance/retreat, Left/Right to turn.

## Status

Implemented: intro and character creation, overworld (moons, moongates, wind, ships, horses,
wandering monsters), towns (NPCs, line of sight, doors, conversations, all shops, inns, healers,
Lord British, Hawkwind, companions), tactical combat, 3D dungeons (rooms, altars, stones), spells and
mixing, items, shrines and meditation, and the endgame (Abyss, Codex).

Some details are interpretations rather than exact ports (timings that depended on CPU speed in the
original, the 3D look of the dungeons); they are marked in the source.
