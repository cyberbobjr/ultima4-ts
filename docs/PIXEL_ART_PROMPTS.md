# Test prompts — pixel-art tile generation

Prompts to test an image model (text-to-image, or image-to-image from an original tile) on the two
families of game tiles: **terrain** and **characters / monsters**.

## Common constraints (what to check in a result)

- **Grid**: one tile is 16×16 pixels in the original. Generate larger (512 or 1024 px), then reduce
  with **nearest neighbour** to 16, 32 or 64 px. Asking for a "32x32 grid of big pixels" makes that
  reduction easier.
- **Palette**: the 16 EGA colours (black, blue, green, cyan, red, magenta, brown, light grey, dark grey,
  light blue, light green, light cyan, light red, light magenta, yellow, white). Quantize the result to
  this palette after generation.
- **View**: top-down for terrain; characters front-facing, full body, centred.
- **Background**: pure black for characters and objects (the engine shows it as is).
- **Terrain**: the tile must **repeat without seams** (left/right and top/bottom edges match).
- **Animation**: monsters have 2 or 4 frames, water and fields scroll vertically. An animated tile must
  stay **the same drawing** from frame to frame (see "Animation sheets").
- No text, frame, border, drop shadow outside the tile, and no 3/4 perspective.

### Common negative prompt (for models that accept one)

```
blurry, anti-aliasing, gradient shading, soft edges, photorealistic, 3d render, isometric, perspective,
text, letters, watermark, signature, frame, border, drop shadow, noise, jpeg artifacts, extra colors
```

### Common style prefix

```
pixel art game tile, 32x32 pixel grid, each pixel a crisp square block, limited 16-color EGA palette,
flat colors, no anti-aliasing, 1980s computer RPG style (Ultima, early CRPG), clean readable shapes
```

---

## 1. Terrain tiles (top-down, tileable)

| Tile | Prompt (append after the prefix) |
|---|---|
| Grass | `top-down grassland tile, black ground with scattered small bright green grass tufts, sparse and evenly distributed, seamless tileable texture` |
| Scrub | `top-down scrubland tile, low green bushes and grass tufts on black ground, a bit denser than grassland, seamless tileable texture` |
| Forest | `top-down dense forest tile, rounded green tree crowns packed together with dark gaps, seamless tileable texture` |
| Hills | `top-down rolling hills tile, soft green and dark green rounded mounds on black, seamless tileable texture` |
| Mountains | `top-down mountain range tile, jagged grey and white rock peaks drawn as stacked zigzag ridges on black, impassable, seamless tileable texture` |
| Swamp | `top-down swamp tile, dark green muddy ground with small murky puddles and reeds, seamless tileable texture` |
| Deep water | `top-down deep ocean tile, dark blue water with thin horizontal wave strokes, seamless tileable texture, designed to scroll vertically` |
| Water | `top-down sea tile, medium blue water with short horizontal wave lines, seamless tileable texture, designed to scroll vertically` |
| Shallows | `top-down shallow water tile, light blue water with sandy specks, seamless tileable texture` |
| Lava | `top-down lava tile, glowing red and orange molten rock with dark cracks, seamless tileable texture, designed to scroll vertically` |
| Poison field | `top-down poison gas field tile, swirling green bubbles on black, seamless tileable texture` |
| Energy field | `top-down crackling energy field tile, bright cyan and white electric arcs on black, seamless tileable texture` |
| Fire field | `top-down fire field tile, small red and yellow flames on black, seamless tileable texture` |
| Brick floor | `top-down brick floor tile, small rectangular bricks in a running bond pattern, cyan and black, seamless tileable texture` |
| Wooden floor | `top-down wooden plank floor tile, brown boards with dark seams, seamless tileable texture` |
| Shore (corner) | `top-down shoreline corner tile, grass in three quarters, blue water in the north-east corner, curved coast, matches grass and water tiles` |

**Seam test**: lay the tile out 3×3 (or 4×4) and check that no seam shows. For water and lava, scroll
the tile by 1 pixel per frame (as the game does) and check that the motion stays smooth.

### World map places (single tile, not tileable)

| Tile | Prompt |
|---|---|
| Town | `small walled medieval town seen from the side, white stone wall with battlements, two orange roofed towers, a dark gate in the middle, on black background` |
| Castle | `small stone castle seen from the front, white walls with battlements, two round towers with blue bases, a red flag on top, a dark gate, on black background` |
| Village | `three small red-roofed huts on black ground with a few green grass tufts` |
| Dungeon entrance | `dark cave entrance in a grey rocky hill, black opening, on black background` |
| Shrine | `small circle of grey standing stones seen from above, on black ground` |
| Moongate | `glowing magic portal, a blue gateway between two golden pillars, on black background` |

---

## 2. Characters (front view, full body, black background)

Prefix to add: `single character sprite, full body, front view, centered, standing on the bottom of
the tile, pure black background, readable silhouette at small size`.

| Character | Prompt |
|---|---|
| Avatar | `young hero with a brown hat, green tunic, red trousers, a white shield with a black cross in the left hand and a short sword in the right hand` |
| Mage | `old mage in a long blue robe with a pointed hat and a wooden staff` |
| Bard | `bard in a green and yellow tunic holding a lute` |
| Fighter | `fighter in grey chain armour with a round shield and a sword` |
| Druid | `druid in a brown hooded robe with a gnarled staff and a leaf crown` |
| Tinker | `tinker in a leather apron with a hammer and a tool belt` |
| Paladin | `paladin knight in shining silver plate armour with a white tabard and a long sword` |
| Ranger | `ranger in a dark green cloak with a longbow` |
| Shepherd | `shepherd in simple brown clothes with a crook` |
| Guard | `town guard in grey armour with a helmet and a long spear` |
| Merchant | `townsperson merchant in a red coat with a coin purse` |
| Beggar | `beggar in torn grey rags, hunched, holding out a bowl` |
| Jester | `jester in a red and yellow motley outfit with a belled hat` |
| King | `king with a golden crown, a purple royal robe with white fur and a sceptre` |

---

## 3. Monsters (front view, black background)

Same prefix as the characters, with "character" replaced by "monster".

| Monster | Prompt |
|---|---|
| Orc | `green orc warrior with small red horns, blue eyes, a loincloth, arms raised` |
| Skeleton | `white skeleton warrior with a rusty sword, glowing eye sockets` |
| Troll | `big grey-green troll with a club, hunched` |
| Giant rat | `giant brown rat seen from the side, long tail` |
| Bat | `black bat with spread wings, red eyes` |
| Giant spider | `giant black spider with red markings, eight legs spread` |
| Ghost | `pale white ghost with a trailing wispy body and dark eyes` |
| Slime | `green slime blob with bubbles` |
| Gremlin | `small green gremlin with big ears, crouching` |
| Mimic | `wooden treasure chest monster with teeth and a tongue` |
| Reaper | `hooded reaper in a black robe with a scythe` |
| Gazer | `floating eye monster with a large single eye and small tentacles` |
| Evil mage | `evil mage in a red robe casting a spell` |
| Liche | `undead lich king in a dark robe with a crown and a glowing staff` |
| Lava lizard | `red and orange lava lizard, side view` |
| Daemon | `red winged demon with horns and a trident` |
| Hydra | `three-headed green hydra` |
| Dragon | `green dragon seen from the side, wings raised, breathing a small flame` |
| Balron | `huge dark balron demon with bat wings, horns and a flaming whip` |
| Sea serpent | `green sea serpent rising from blue water` |
| Pirate ship | `pirate sailing ship seen from above with a black flag` |

---

## 4. Animation sheets (consistency between frames)

The main flaw of frame-by-frame generation is that the character changes from one frame to the next.
To test consistency, ask for **all frames in a single sheet**, then cut it:

```
pixel art sprite sheet, 4 frames side by side in one row, each frame a 32x32 pixel grid, the SAME
<character/monster description> in every frame, identical colors, identical design and proportions,
only a small walk/idle animation changes between frames (arms and legs move by one or two pixels),
pure black background, no gaps between frames, no text
```

For the moongate (4 frames: opening → open):

```
pixel art sprite sheet, 4 frames side by side, the same blue magic portal between two golden pillars,
frame 1 barely visible thin glow, frame 2 half open, frame 3 almost open, frame 4 fully open bright
portal, identical pillars in every frame, pure black background
```

Criteria: same silhouette, same colours, same framing from frame to frame; only the animated parts move.

## 5. Image-to-image (from the original tiles)

Enlarge the original 16×16 tile with nearest neighbour (×32 → 512 px), then:

```
Redraw this image as a cleaner pixel art tile on the same 16x16 pixel grid (each original pixel stays a
square block), keep exactly the same shapes, silhouette, colors and position; only refine edges and add
one shade per color. Pure black background stays black.
```

Use a low denoise (0.3 to 0.5): above that the model invents details and loses the shapes, as in the
first attempt (distorted castles, inconsistent animations).

## Recommended post-processing

1. Reduce with nearest neighbour to the target size (16, 32 or 64 px).
2. Quantize to the EGA palette (16 colours) without dithering.
3. For terrain, check the seams in 3×3; for animations, compare the frames side by side.
4. Compare with the algorithmic pack (`npx tsx tools/packs/upscale.ts --algo scale4x`), the fidelity
   reference.
