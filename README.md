# Ultima IV — TypeScript + three.js + Tauri

*[Version française](README.fr.md)*

A reimplementation of **Ultima IV: Quest of the Avatar** (DOS version, as sold by GOG) written in
TypeScript, rendered with three.js and packaged as a desktop app with Tauri v2.

The engine was rebuilt by reverse engineering the original game: the data file formats were decoded
and the executables (`AVATAR.EXE`, after removing its EXEPACK compression, and `TITLE.EXE`) were
decompiled with Ghidra. Game rules, formulas and tables cite the original function addresses
(`1000:xxxx`) and data offsets (`DS:xxxx`) in comments. See `docs/RE_NOTES.md`.

## You need the original game files

No original code is executed (no DOSBox, no emulation), and the engine does not read the original
files either: their content is **extracted once** into modern formats (PNG pictures, JSON maps,
dialogues, tables and text catalogs) by a TypeScript tool, and the game only reads that folder.

These files **are not included** in this repository. Ultima IV is available for free on GOG.
After installing it, run once:

```powershell
npm run extract -- --game-dir "C:\Program Files\GOG Galaxy\Games\Ultima 4"
```

The tool (`tools/extract-assets.ts`) unpacks `AVATAR.EXE` (EXEPACK) in memory, reads its texts and
`TITLE.EXE`'s at the offsets declared in the source, and writes `assets/original/` (git-ignored).
Without `--game-dir` it uses `U4_GAME_DIR` or the GOG Galaxy location above. The original install is
never modified: saves go to the app data directory (Tauri) or to `localStorage` (browser mode).

The source only declares *where* each original text lives (for example `talk.youSay: 0x2a62`, a DS
offset in `AVATAR.EXE`); the texts themselves come from the extracted catalog at runtime.

## Running

A Node.js runtime is provided in `.nodeenv`; Rust (MSVC toolchain) is required for Tauri.

PowerShell:

```powershell
$env:Path = "E:\IdeaProjects\u4\.nodeenv\Scripts;" + $env:Path
npm install
npm run tauri dev   # desktop app, front-end hot reload
npm run dev         # browser only: http://127.0.0.1:1420
npm run build       # type check + production bundle
npm test            # unit tests (Vitest); format tests are skipped without the install
node tools/scenarios.mjs [--ref]  # headless screenshot regression (dev server running)
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

## iPad / touch

The game can be played with a mouse or a touch screen; every tap is turned into the original keys.

- Overworld and towns: tap a square to walk there (step by step; any key, a prompt or a fight stops
  the walk). Tap a neighbour (townsperson, monster) for Talk / Attack / Look, a door for Open /
  Jimmy, the party for what is under it (Get chest, Klimb, Descend, Enter, Board, X-it).
- Dungeons: swipe up/down to advance/retreat, left/right to turn; tap for the dungeon commands.
- Combat: tap a foe next to the active member to attack it, any other square to step towards it.
- The command bar gives the other commands and a text field for conversations. Walking by tapping
  can be turned off in the settings (`controls.tapToMove`).

On an iPad, build the game (`npm run build`, with the extracted files) and serve `dist/` from a
machine on the same network (`npx vite preview --host`); service workers and installation need
HTTPS (or localhost). In Safari: Share > Add to Home Screen. The game then starts full screen and
keeps its files in the cache after the first visit.

## Status

Implemented: intro and character creation, overworld (moons, moongates, wind, ships, horses,
wandering monsters), towns (NPCs, line of sight, doors, conversations, all shops, inns, healers,
Lord British, Hawkwind, companions), tactical combat, 3D dungeons (rooms, altars, stones), spells and
mixing, items, shrines and meditation, and the endgame (Abyss, Codex).

Some details are interpretations rather than exact ports (timings that depended on CPU speed in the
original, the 3D look of the dungeons); they are marked in the source.
