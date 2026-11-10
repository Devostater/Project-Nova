# Asset Backlog (models and textures)

What Project Nova needs next, in priority order. Every asset follows [ASSET_SPEC.md](ASSET_SPEC.md). Mark an item **In progress (name)** when you start it and **Delivered** when it is on a branch. Claude wires delivered assets into the game and tests them.

Who makes what:
- **Owner:** 3D models (Tripo / Blender, then `optimize_nova.bat`) and anything hand-made.
- **Gemini (API, run by Claude) or AI Studio (by hand):** 2D textures and sprite sheets.
- **Claude:** cutting and cleaning textures (`tools/vfx_cut.py`), wiring them in, testing, PRs.

How to deliver: upload to the right folder on a new branch through the GitHub website (**Add file → Upload files → "Create a new branch"**), or drop the files in chat and Claude commits them.

## P1: VFX upgrade (biggest visual win)

Sources: `art_src/gemini/` (made with `gemini-3.1-flash-image`). Rebuild the textures with `python3 tools/vfx_build.py`.

The current effects are cut from low-resolution catalog sheets (explosion frames are only about 100 px). Make proper sheets to `ASSET_SPEC.md`: square, no grid lines, black background.

| Item | File | Size / grid | Notes | Status |
|---|---|---|---|---|
| Large explosion | `public/fx/vfx_explosion_8x8.jpg` | 2048², 8×8 | Fireball → smoke, fades fully to black by the last frame | **Delivered + in game** (Gemini fireball and smoke, animated by `tools/vfx_build.py`) |
| Small explosion / hit | `public/fx/vfx_explosion_small_4x4.png` | 512², 4×4 | Quick spark burst for bullet hits and asteroid chips | **Delivered**, not wired yet |
| Shield hex (tileable) | `public/fx/vfx_shield_hex.png` | 1024², 1 frame | Seamless honeycomb, white/cyan lines on black | **Delivered** (Gemini, Claude) |
| Player laser | `public/fx/vfx_laser.png` | 128×512 | Vertical bolt, head at the **bottom**, white core (tinted in game) | **Delivered + in game** (Gemini, grayscale) |
| Muzzle flash | `public/fx/vfx_muzzle_4x4.png` | 512², 4×4 | Short, star-shaped | **Delivered**, not wired yet. The single star is in game as `vfx_flare.png` |
| Engine glow | `public/fx/vfx_engine_glow.png` | 256² | Soft round glow, white/blue | **Delivered**, not wired yet |
| Warp streaks | `public/fx/vfx_warp_streaks.png` | 1024² | Radial lines for hyperspace, tileable around the circle | **Delivered**, not wired yet |

## P2: Docking (supports GPT's docking update)

Confirm with the docking work what is needed before making these.

| Item | File | Notes | Status |
|---|---|---|---|
| Landing pad markings | `public/art/textures/tex_landing_pad_1024.png` | Top-down pad decal: guide lines and numbers; transparent PNG | |
| Docking guide hologram | `public/fx/vfx_dock_guide.png` | Square ring/chevron, additive (black background) | |
| Docking clamp / bay (3D, optional) | `public/models/dock_clamp.glb` | Small station-side docking arm, 5–10 m, under 8k triangles | |

## P3: Side panels (supports AI Studio's panel layout)

| Item | File | Notes | Status |
|---|---|---|---|
| Panel icon strip | `public/art/panel_icons.png` | One row of 128 px square icons on transparent background, HUD palette | |
| Panel background | `public/art/panel_bg.png` | 1024×512, subtle sci-fi frame, mostly transparent so text stays readable in VR | |

## P4: Models

The game already loads 29 model types (ships for every faction, stations, cockpit parts, Obi). Known gaps:

| Item | File | Size / budget | Notes | Status |
|---|---|---|---|---|
| Player ship check | `public/models/player_ship.glb` | 5 m, 20k | Exists but isn't used in the game yet (for an outside/hangar view). Owner: keep or replace? | |
| Cargo container | `public/models/container.glb` | 10 m, 5k | Exists but unused; could be hauling/docking cargo | |
| Holo panel | `public/models/holo_panel.glb` | 0.78 m, 4k | Exists but unused; may suit the side panels | |
| New ships / stations | `public/models/<slug>.glb` | see `ASSET_SPEC.md` | Owner's choice. Add a rule to `optimize_nova.py` for each new type | |

### P4A: First station cantina kit (Tripo / Blender)

Target layout: a **16 m × 22 m × 6 m** modular room, viewed at human scale in desktop and Quest VR. The owner's neon industrial cantina reference sets the direction: layered pipes/cables, cyan-magenta signage, a busy bar, booths, a raised rear landing and readable crew/news terminals. Keep walkable surfaces clean and reserve detail for eye level. Use real-world scale, origins at floor center, +Y up, forward toward −Z, PBR textures at 1024 px (2048 px only for the hero shell/bar on MAX/ULTRA), and simple named collision meshes where noted.

| Item | Clean file | Real-world size / triangle budget | Required parts and notes | Status |
|---|---|---|---|---|
| Cantina room shell | `public/models/cantina_shell.glb` | 16 × 22 × 6 m; 35k close / 12k LOD | Floor, walls, ceiling ribs, rear mezzanine at +2.4 m, 1.4 m stair, two 1.2 m door openings; separate `COLLIDER_*` floor/walls/steps | **Needed — highest priority** |
| Modular wall/pipe kit | `public/models/cantina_wall_kit.glb` | 2 m and 4 m modules; 18k total / 6k LOD | Straight/corner wall bays, ceiling pipe cluster, cable tray, vent, pillar; tileable materials and no baked text | Needed |
| Hero bar counter | `public/models/cantina_bar.glb` | 7 × 1.1 × 1.2 m; 22k / 8k LOD | Straight 1 m modules plus 90° return, foot rail, bartender opening, under-counter emissive strips; counter collision | **Owner reports uploaded; verify filename/scale** |
| Bar stool | `public/models/cantina_stool.glb` | 0.48 × 0.48 × 0.78 m; 5k / 1.5k LOD | Swivel seat, foot ring, stable base; origin centered on floor for repeated placement | **Owner reports uploaded; verify filename/scale** |
| Booth set | `public/models/cantina_booth.glb` | 2.4 × 1.8 × 1.35 m; 16k / 5k LOD | Two benches, table, privacy back, optional divider; seats and tabletop named for interaction | **Owner reports uploaded; verify filename/scale** |
| Glassware set | `public/models/cantina_glassware.glb` | 0.08–0.28 m; 8k total / 2k LOD | 6 reusable glasses/mugs; shared material; emissive liquid variants are materials, not duplicate meshes | **Owner reports uploaded; verify filename/scale** |
| Bottle set | `public/models/cantina_bottles.glb` | 0.18–0.42 m; 12k total / 3k LOD | 8–12 silhouettes on one atlas; no readable real-world labels; named meshes for instancing | **Owner reports uploaded; verify filename/scale** |
| Bartender work station | `public/models/cantina_backbar.glb` | 5 × 0.7 × 2.6 m; 18k / 6k LOD | Shelves, sink/dispenser, bottle lights, storage and clear 1 m path for the alien-pilot bartender | Needed |
| Crew-network terminal | `public/models/crew_terminal.glb` | 1.1 × 0.65 × 1.55 m; 9k / 3k LOD | Angled screen frame, hand-rest edge, floor pedestal; screen plane named `SCREEN_CREW` and large VR press zone | Needed |
| NOVA NET wall terminal | `public/models/novanet_terminal.glb` | 1.8 × 0.25 × 1.25 m; 10k / 3k LOD | 16:9 screen plane named `SCREEN_NOVANET`, bezel, speaker/light strip; reachable center at 1.45 m | Needed |
| Airlock / dock door | `public/models/cantina_airlock.glb` | 2.4 × 0.45 × 3 m; 14k / 5k LOD | Two leaves, frame, status lamp, keypad, separate collision; animation-ready pivots | Needed |
| Ambient patron kit | `public/models/cantina_patron_kit.glb` | 1.55–2.1 m; 45k total / 15k LOD | 3 body silhouettes, seated/standing pose compatibility, separate heads/hands; reuse existing alien pilot as bartender first | Needed after shell/terminals |
| Ceiling light/sign kit | `public/models/cantina_sign_kit.glb` | 0.4–3 m pieces; 12k total / 4k LOD | Housings only; text/emblems stay on swappable texture/canvas planes for localization and factions | Needed |
| Small clutter kit | `public/models/cantina_clutter.glb` | 0.05–0.8 m; 15k total / 4k LOD | Trays, cases, utensils, coasters, wall boxes; atlas-ready and instanced in game | Nice to have |

**Scene budget:** hero room at MAX/ULTRA ≤180k visible triangles before characters, ≤60 draw calls for static environment, ≤12 unique environment materials, and no more than 20 uninstanced clutter objects. Prepare LODs so the same kit can target Quest without reducing the MAX/ULTRA close-up source. Do not merge props into one mesh when they need interaction, animation, instancing, or faction skin swaps.

**Ingest order:** shell → bar/stool/booth validation → airlock → crew/NOVA NET terminals → backbar/glass/bottle dressing → wall/pipe/sign kit → patrons/clutter. Run `optimize_nova.bat`, add a named optimizer rule for each file, confirm scale in `models/manifest.json`, then mirror under `models/` and `public/models/`.

## P5: Texture upgrades (nice to have)

| Item | Now | Upgrade |
|---|---|---|
| `asteroid.jpg` | 512² | 1024² seamless rock |
| `matrix_holo.jpg` | 512² | 1024² |
| `cargo_icons.jpg` | 384², JPG | 512² PNG icon strip with transparency |
| Planets (`planet_*.jpg`) | 1024×512 | 2048×1024 equirectangular |

## Ready-to-use prompts

**Gemini / AI Studio (texture):**
```
Game texture for Project Nova (VR space sim), used with additive blending.
[Describe the item from ASSET_BACKLOG.md.] [Size, grid.]
Pure solid black background (#000000). Flat, evenly lit, centered.
No text, labels, grid lines, borders or watermark.
```

**Tripo (3D model):**
```
[Item] for a VR starfighter sim, seen up close from a Quest 3 cockpit.
Real-world size: [size] m. Hard-surface sci-fi, clean silhouette, PBR materials.
Game-ready: under [budget] triangles, textures 1024 px max. Export GLB.
```
Then run `optimize_nova.bat`, check the result in `public/models/manifest.json`, and upload it.
