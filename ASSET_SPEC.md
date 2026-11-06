# Asset Spec

Every AI and tool that makes art for Project Nova follows this file. It keeps assets drop-in ready, so Claude (or whoever owns the game code) can wire them in without reworking them. Read [AI_CONTEXT.md](AI_CONTEXT.md) first for creative rules: new lore, names and designs are **proposals** until the owner approves them.

## Folders and names

| Asset | Folder | File name pattern | Example |
|---|---|---|---|
| VFX sprite sheets | `public/vfx/` | `vfx_<effect>_<variant>_<cols>x<rows>.png` | `vfx_explosion_large_8x8.png` |
| UI icons, reticles, decals | `public/art/` | `<purpose>_<name>.png` | `reticle_lock.png` |
| Textures (planets, hulls, skyboxes) | `public/art/textures/` | `tex_<subject>_<size>.jpg` or `.png` | `tex_planet_red_2048.jpg` |
| 3D models (game-ready) | `public/models/` | `<slug>.glb`, plus `<slug>_lo.glb` for a low-detail version | `pirate_raider.glb` |
| Concept art (reference only, not loaded by the game) | `Concept art/` | anything descriptive | `ship livery1.png` |
| Music | `public/music/` | `<mood_or_track>.mp3` | `battle_market.mp3` |

- Use lowercase and underscores. **No spaces** (spaces break URLs; the current `VFX/*.jpg` files are legacy names).
- Never overwrite an existing asset with a different design. Add a new variant name and say which one it replaces in your PR or handoff.

## VFX sprite sheets

The game draws effects with **additive blending**: black shows as transparent, and brighter means more glow.

- **Canvas:** square and a power of two: 1024×1024 (small effects) or 2048×2048 (big explosions, shields).
- **Grid:** equal frames, written in the file name (`_8x8` = 8 columns × 8 rows = 64 frames). Frames run left to right, top to bottom.
- **No grid lines, borders, labels or watermarks.** The existing 1024×572 sheets have white grid lines, which show up in-game.
- **Background:** pure black `#000000` (or a fully transparent PNG). No vignette or gradient.
- **Content:** centered in every frame, with about 5% empty padding so nothing touches the frame edge. The last frames fade fully to black.
- **Looping effects** (laser bolt, shield shimmer, engine glow, lightning): the last frame flows back into the first.
- **Color:** neutral white/grey sheets are the most flexible, because the game tints them. Use full color only when the color is the design (fire, plasma).
- **Format:** PNG (lossless). JPG is acceptable only for very large sheets, never for sprites with transparency.

**Effect list** (what the game currently needs):
- `laser_player`: cyan/teal bolt, looping
- `laser_enemy`: red/orange bolt, looping
- `muzzle_flash`: short burst of 8–16 frames
- `explosion_small` and `explosion_large`: one-shot, 32–64 frames
- `shield_hit`: ripple from a central point, one-shot
- `shield_dome`: hexagon/energy shimmer, looping and tileable
- `engine_glow`: looping
- `lightning_arc`: looping, horizontal, with the edges fading to black
- `warp_streaks`: looping

## UI and icons

- PNG with transparency, square, power of two (128, 256 or 512). Icon strips (like `oh_icons.png`) are one row of equal squares.
- Must stay readable at small size in a VR headset: bold shapes, thick strokes, high contrast, no fine text.
- The palette follows the HUD: cyan `#00f0ff`, green `#00ffaa`, amber `#ffcc00`, alert red `#ff3344` on dark `#060e18`.

## 3D models

These rules match [optimize_nova.py](optimize_nova.py), which does the final shrinking and scaling. Run `optimize_nova.bat` on raw exports before committing.

- **Format:** GLB (binary glTF) with embedded textures.
- **Orientation:** +Y up, nose pointing **−Z**, origin at the center of mass (pivot at the hinge for cockpit levers, sticks and buttons).
- **Scale:** real metres. The optimizer rescales by the longest side using its rules table; add a new rule there for any new model type.
- **Budgets:**

| Type | Longest side | Max triangles | Max texture |
|---|---|---|---|
| Fighters, drones | 3–5 m | 15–20k | 1024 |
| Gunships, raiders, haulers | 11–30 m | 12k | 1024 |
| Capital ships, stations | 70–520 m | 15–25k | 1024 |
| Asteroids, containers, missiles | 4–40 m | 5k | 512 |
| Cockpit parts (seen up close in VR) | 0.1–2 m | 12–25k | 1024 |

- **Materials:** PBR (metallic/roughness), at most 2–3 per model. No emissive wiring or animation needed unless asked for.
- **Low-detail versions:** large ships also get a `<slug>_lo.glb` at about 25% of the triangles.
- **Naming in the tool:** include the optimizer's match text in the source file name (e.g. "pirate raider …"), so `optimize_nova.py` picks the right slug and budget.
- After optimizing, commit both the `.glb` and the updated `public/models/manifest.json`.

## Hand-in checklist

1. The file is in the right folder with the right name.
2. It meets the size, grid and budget rules above.
3. Commit it on your own branch (`gemini/...`, `codex/...`, etc.) or upload it to a branch through the GitHub website. Don't commit to `main`.
4. Add a line to the **Done / handoffs** section of `AI_STATUS.md` (or tell the owner) saying what it is and what it is for.
5. Claude (or the current code owner) wires it into the game and tests it.
