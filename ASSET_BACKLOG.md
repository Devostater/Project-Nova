# Asset Backlog (models and textures)

What Project Nova needs next, in priority order. Every asset follows [ASSET_SPEC.md](ASSET_SPEC.md). Mark an item **In progress (name)** when you start it and **Delivered** when it is on a branch. Claude wires delivered assets into the game and tests them.

Who makes what:
- **Owner:** 3D models (Tripo / Blender, then `optimize_nova.bat`) and anything hand-made.
- **Gemini (API, run by Claude) or AI Studio (by hand):** 2D textures and sprite sheets.
- **Claude:** cutting and cleaning textures (`tools/vfx_cut.py`), wiring them in, testing, PRs.

How to deliver: upload to the right folder on a new branch through the GitHub website (**Add file → Upload files → "Create a new branch"**), or drop the files in chat and Claude commits them.

## P1: VFX upgrade (biggest visual win)

The current effects are cut from low-resolution catalog sheets (explosion frames are only about 100 px). Make proper sheets to `ASSET_SPEC.md`: square, no grid lines, black background.

| Item | File | Size / grid | Notes | Status |
|---|---|---|---|---|
| Large explosion | `public/fx/vfx_explosion_large_8x8.png` | 2048², 8×8 | Fireball → smoke, fades fully to black by the last frame | |
| Small explosion / hit | `public/fx/vfx_explosion_small_4x4.png` | 1024², 4×4 | Quick spark burst for bullet hits and asteroid chips | |
| Shield hex (tileable) | `public/fx/vfx_shield_hex.png` | 1024², 1 frame | Seamless honeycomb, white/cyan lines on black | |
| Player laser | `public/fx/vfx_laser_player.png` | 128×512 | Vertical bolt, head at the **bottom**, white core (tinted in game) | |
| Muzzle flash | `public/fx/vfx_muzzle_4x4.png` | 512², 4×4 | Short, star-shaped | |
| Engine glow | `public/fx/vfx_engine_glow.png` | 256² | Soft round glow, white/blue | |
| Warp streaks | `public/fx/vfx_warp_streaks.png` | 1024² | Radial lines for hyperspace, tileable around the circle | |

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
