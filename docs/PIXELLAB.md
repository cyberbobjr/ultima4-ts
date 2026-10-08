# PixelLab — AI pixel-art generation for the tile packs

[PixelLab](https://www.pixellab.ai/docs) is a hosted API specialised in **pixel art**. Unlike a general
diffusion model run through ComfyUI (the first HD attempt: blurry results that had to be reduced, lost
shapes, inconsistent animation frames), its models produce native pixel art at the requested size,
can be forced onto a palette, and have dedicated tools for tilesets and animations.

- API: `https://api.pixellab.ai/v2`, `Authorization: Bearer <token>`.
- Reference: [OpenAPI](https://api.pixellab.ai/v2/openapi.json), [interactive docs](https://api.pixellab.ai/v2/docs),
  [LLM summary](https://api.pixellab.ai/v2/llms.txt); official JS and Python SDKs and an MCP server exist.
- The token goes in `.env` as `PIXELLAB_KEY=...` (git-ignored). `tools/packs/pixellab.mjs` is a small client:
  it reads the token from `.env`, never prints it, retries while the free plan's single job slot is busy,
  and polls background jobs. `node tools/packs/pixellab.mjs balance` shows the remaining credits.

## Endpoints useful for Ultima IV tiles

| Need | Endpoint | Why |
|---|---|---|
| Redraw an original tile at 32/64 px | `POST /create-image-bitforge` (max 200×200 area) | `init_image` + `init_image_strength` (how much the original is kept), `color_image` (**forced palette**: the 16 EGA colours), `style_image` + `style_strength` (match an approved tile), `outline`, `shading`, `detail`, `view`, `seed`. Synchronous, cheap (1 generation). |
| Same, larger images | `POST /create-image-pixflux` (32×32 to 400×400) | Init image, forced palette, transparent background. No style image. |
| Consistent set from approved tiles | `POST /generate-with-style-v2` (1–4 style images, async) | New tiles in the style of reference tiles (output size = style size). |
| Terrain transitions | `POST /create-tileset` (Wang set: 16 or 25 tiles; `lower_description`/`upper_description`, `transition_size`, `tile_size` 16/32 or 64 in `mode: "pro"`, reference images per terrain, `color_image`) | Seamless grass ↔ water ↔ swamp … sets. The game has fixed shore tiles (0x31–0x34), so a Wang set would only feed those and a future smoother coastline. |
| Terrain/feature tiles in one call | `POST /create-tiles-pro` (`tile_type: "square_topdown"`, `tile_view: "top-down"`, `tile_size` 16–128, numbered descriptions "1). grass 2). forest…", `style_images`) | Several variations at once, consistent with each other. Pro tool (more expensive). |
| Animation frames from frame 0 | `POST /animate-with-text-v3` (first frame + action, 4–16 frames), `POST /interpolation-v2` (first + last frame) | Frames derived from one image, so the design stays the same — the main failure of the ComfyUI attempt. |
| Edit several frames together | `POST /edit-images-v2` (1–16 images, `edit_with_text` or `edit_with_reference`) | Applies the same change to all frames of a monster at once. Pro tool. |
| Clean-up | `POST /reduce-colors` (`palette_image`: force frames onto the EGA palette together), `POST /correct-pixelart`, `POST /resize` | Shared palette across an animation; fix stray pixels. |
| Characters with directions | `POST /create-character-with-4-directions` | Not needed by Ultima IV (front-facing sprites), useful for a remake. |

Pro tools (`*-v2`, `*-pro`, objects, tiles-pro) cost **20–40 generations** per call; bitforge/pixflux cost 1.

## First test (2 tiles, bitforge, 64×64, EGA palette forced)

Input: the original 16×16 tile enlarged ×4 (nearest), `color_image` = the 16 EGA colours,
`outline: "single color black outline"`, `shading: "basic shading"`, `detail: "medium detail"`,
`view: "high top-down"`, `seed: 1`. Script: `test-output/pixellab/try.mjs` (local, not versioned).

| Tile | `init_image_strength` 500 | `init_image_strength` 200 |
|---|---|---|
| Castle (0x0B) | identical to the original (nothing gained) | redrawn but **distorted** (towers/gate rearranged) |
| Orc (0xC0) | identical to the original | **good**: same pose, colours and silhouette, real detail, clean pixels |

Findings:
- Output is real pixel art on the EGA palette: no blur, no reduction step, no colour cleanup needed.
- The **init strength is the key setting** and depends on the tile: buildings and terrain need to stay close
  to the original (≈ 300–400), creatures can be reinterpreted more freely (≈ 150–250). Tune per category.
- Text adds what the 16×16 original cannot show (horns, eyes, armour…), so each tile needs a short description
  (the ones in `docs/PIXEL_ART_PROMPTS.md` can be reused).

## Pilot (21 tiles + 1 animation frame, `tools/packs/pixellab-pilot.mjs`)

Bitforge 64×64, EGA palette forced, init = original ×4, strength 350 (terrain, places), 300 (objects),
220 (people, monsters); 22 generations. The script writes a review sheet and a test pack
`assets/packs/pixellab-derived` (Scale4x for the other tiles): try it with `?pack=pixellab-derived`.

| Category | Result |
|---|---|
| People (Avatar, mage, guard, king) and monsters (orc, skeleton, dragon) | **Convincing**: same pose, colours and silhouette as the original, real detail, crisp pixels, readable at game size. |
| Animation frame (orc frame 2 with frame 1 as `style_image`) | **Consistent** with frame 1 (same design and colours, pose of the original frame 2): the approach works for monster animations. |
| Objects (chest, ankh, ship) | Small improvements; the ship gains detail. |
| Terrain (grass, forest, mountains, water, swamp) and places (town, castle, village, dungeon, shrine, moongate) at 350 | **Almost unchanged** from the original (a few stray pixels); the swamp turned into grey blocks and the forest trunks into yellow. A lower strength (≈ 250) and better descriptions are needed, with seam checks, or a dedicated terrain tool (`create-tiles-pro` / `create-tileset`). |

Conclusion: worth it for people, monsters and their animations (≈ 110 tiles: classes, townsfolk, the 36
monsters × 2–4 frames); terrain and places need another round of tuning (or keep Scale4x for them).

## Proposed pipeline (for a `pixellab-derived` pack)

1. **Style anchor**: generate and hand-pick 3–4 key tiles (grass, castle, avatar, orc) with bitforge at
   64 px; they become the `style_image` of every later call so the whole pack shares one look.
2. **Static tiles** (terrain, places, objects): bitforge, init = original ×4, EGA palette, style anchor,
   strength by category; terrain tiles checked for seams in 3×3 (regenerate with another seed if needed).
3. **Animated tiles** (monsters 4 frames, people 2 frames, moongate 4 frames, ships/horses):
   generate frame 0 as in step 2, then derive the other frames from it — `interpolation-v2` / `animate-with-text-v3`
   guided by the original frames, or bitforge per frame with frame 0 as `style_image` and a higher strength —
   then `reduce-colors` on all frames together with the EGA `palette_image`.
4. **Water, lava, fields** keep their original vertical scrolling: generate one seamless tile; the renderer
   scrolls it (pack `animations`).
5. Review on a contact sheet next to the original and the Scale4x pack, regenerate rejects, assemble the
   atlas (`assets/packs/pixellab-derived/`, local branch only: it is derived from the original tiles).

## Cost

The account is on the trial: 40 generations (11 left after the tests and the pilot). A full pack is at least 256 bitforge
calls plus retries and animation work (Pro tools at 20–40 generations each), so it needs a paid plan; the
free plan also runs **one job at a time**. Start with a pilot of ~20 tiles (one of each category) to
validate the settings before generating the rest.
