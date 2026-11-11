# Project Nova status

Read this file, [docs/DECISIONS.md](docs/DECISIONS.md) (locked owner decisions) and [OWNER_FEATURES.md](OWNER_FEATURES.md) (the backlog) first. Don't read anything in `docs/archive/` unless asked.

## Round 2026-11-11 (Claude, lead) — Alpha 1.6 KESTREL
- #70–#72 billboards (`space_ads.js`), broadcasts doc, politics (`politics.js`); #73 Alpha 1.5 MONGOOSE: menu build line, CANOPY button, `PLAY_NOVA.bat`, code names (`docs/RELEASES.md`).
- **Talk radio** (`modules/radio.js`): The Drift Report 77.7, The Beacon 101.1, Subspace Ledger 88.4 as stations on the MUSIC panel; bulletins from live state (laws, council motion, raid timer, distances, prices). Browser speech voice + subtitles; recorded voices are next. See `docs/BROADCASTS.md`.
- **PC black flashes fixed** (`modules/postfx.js`): some material outputs an invalid (NaN/inf) pixel and bloom smeared it over the whole frame (about half the frames black in headless). A guard pass before bloom cleans it. The source material is not identified yet.
- **Next:** find the NaN source material; ElevenLabs voice for Orin; "go places" (new JSON places) or "go perf" (lighter boarding models).

## Round 2026-11-10 (Claude, lead) — merged to `main`
- #62 SFX fixed online (`public/SFX` → `public/sfx`, Pages is case-sensitive).
- #63/#64 faction emblem pack (`art/emblems/`, manifest, cut-out decals) + `modules/emblems.js`: emblems on ship hulls (raycast placement); #66 Nova-1 emblem on the station.
- #65 removed 64 unreferenced duplicate/backup files.
- #66 menu ▶ PLAY INTRO restored (plays `video/intro.mp4`, then starts the game).
- #67 boarding rooms dressed with the owner's props (`public/models/boarding/`); #68 boarding enemies = rigged pirate crew (animated) + pirate droid (`fps_ai.js` pirate skin; range keeps the alien drone).
- #69 **galaxy map room** (`modules/galaxy_map.js`, H key / WARP tab 🌌 MAP): 3D holo map of every warp destination with height, territory bubbles + emblems, info panel, WARP from the map.
- **Needs an owner headset check:** emblem decals, boarding props/enemies (placement, facing, scale), galaxy map in VR. Props/enemies are heavy (50–200k tris each; Tripo UV seams block simplification).
- **Owner to do:** delete the 14 merged old branches on GitHub; pick a better EDF emblem (emblem_02 is a tiled pattern); name the third faction.
- **Next (task 23):** mission/news markers on the galaxy map, then the new places (nebula outpost, mining colony, alien ruin, derelict battlefield, pirate hideout, second landable planet) as JSON data.

## Now
- **Lead:** **Claude** is back as lead/integrator (2026-11-09). `grok/graphics-overhaul` is fully merged into `main`.
- **Integration merge (2026-11-09, PR #61):** merged `gemini/weapons-and-flight-polish` (planet entry/docking, safehouse, EVA, achievements, ion EMP, piracy law, business desk), `gpt/g1` roster, `g3` save/load, `g4` VR hands (fixed the GLTFLoader import path), `g5` NOVA NET, `a9` Quest offline tools, `g6` cantina brief, and `codex/pirate-boarding` storyboard art. SW cache bumped to `nova-alpha-1.26-quest-preload`; it now also preloads the 13 ULTRA original faction models (~89 MB, 237 files, ~218 MB total) so the Quest has every ship offline. Headless load and PLAY both had 0 failed requests and 0 errors.
- **Held back → resolved (2026-11-10):** `codex/fps-vr-mr` has no commits beyond `main` (already covered). `gpt/g2-faction-emblems` is ported onto current main as `claude/g2-emblems-port` (the 59k-line deletion was only the stray root r170 `three.module.js` + `GLTFLoader.js`); close the old branch after the port merges. 50 remote branches have nothing beyond `main` and can be deleted (owner approval).
- **Sound effects fixed (2026-11-10):** the 21 named SFX were in `public/SFX/` but the game asks for `sfx/`; Pages is case-sensitive, so they 404'd online. Folder renamed to `public/sfx/` (`claude/sfx-wire`). The FPS Arc-Pistol model is already wired (`models/nova_gun.glb`).
- **Repo cleanup (2026-11-09):** the generated models in `3d model gen updates/` are now named and sorted in `Pirate/boarding/` (props, crew, droid, weapons; `shaded_variants/`, `source/`, `concepts/`). The FPS pistol is in `models_src/fps_pistol/`. Logo drafts and loose images are in `art_src/`. Duplicate zips are deleted. None of these are wired into the game yet.
- **Force Ultra:** Restored + patched in `standalone.html` (commit `2f4d43d`). OPTIONS has **FORCE ULTRA: ON/OFF**; defaults on.
- **Live game:** https://devostater.github.io/Project-Nova/standalone.html (main until this branch merges).
- **Token rule (all AIs):** Prefer **modules** (`public/modules/*.js` + root `modules/`) over editing `standalone.html`. The HTML file is ~1.2 MB — expensive for every AI. Small module PRs only unless a one-line hook in standalone is unavoidable.

## Handoff (2026-11-08): graphics + assignments

### Grok (continuing)
- Keep graphics work in **modules only** where possible.
- Next: wire `postfx.render()` into the render path with the smallest possible standalone hook (or document exact hook for owner/Claude).
- Then: thruster/shield/explosion polish inside `fx_ultra.js` / new small modules.
- Vendor postprocessing addons later for APK/offline.

### Antigravity (Gemini) — **DONE (OFFLINE READY)**
- **FPS Multi-Weapon Arsenal & Tactical Combat**:
  - Added 3-weapon roster in `modules/fps_core.js` and `public/modules/fps_core.js`:
    - **Arc-Pistol**: Balanced tactical sidearm (25 dmg, 160ms / 70ms overdrive, cyan plasma).
    - **Vulkan Scatter-Blaster**: Heavy short-range shotgun with dual barrels & orange radiator vents firing a 6-pellet conical spread (16 dmg/pellet, 96 dmg point-blank, 440ms, heavy recoil kick).
    - **Long-Lance Plasma Rifle**: Precision long-range energy lance with extended barrel and 4 blue magnetic induction coils (60 dmg, 85 m/s velocity, 320ms, tight beam).
  - 3D models for all three weapons created procedurally for both 1st-person right glove and 3rd-person showcase mode.
  - Seamless weapon switching: `KeyQ`, keys `1`/`2`/`3`, mouse wheel, on-screen `[ 🔫 WEAPON ]` button, and voice commands (`"switch weapon"`, `"scatter blaster"`, `"plasma rifle"`, `"arc pistol"`).
- **Flight Model & VR Missile Fixes (Playtest Items #5 & #6)**:
  - **Playtest #5 (Advanced Yaw)**: Resolved VR yaw input zeroing bug in `standalone.html`; mapped throttle L/R slide, keys (Q/E), and gamepad sticks to true rotational thruster torque (`normYaw * 4.2 * delta`) with independent per-axis rotational damping decay.
  - **Playtest #6 (VR Missile Arming / Firing)**: Hardened physical VR touch targets for `bigRedBtn` (0.075m), `lidCover` (0.075m), `gripTab` (0.065m), `MISSILE ARM` (0.024m), and `FIRE MISSILE (CONSOLE)` (0.065m). Removed lid toggle debounce on forced arming; firing missiles automatically flips open the safety cover if closed.
- **Combat Lead Pursuit Pip HUD**:
  - Dynamic 3D interception lead indicator (`novaLeadPip`) calculated in `standalone.html` when locking onto moving hostile targets: projects interception point based on target velocity and laser projectile speed (260 m/s), providing precision dogfighting deflection guidance.
- **3D FPS Pilot Character & Showcase Mode**:
  - Full procedural pilot mesh in `modules/fps_core.js` and `public/modules/fps_core.js`.
  - 1st-person view: Armored forearm with cyan reactive light bar & tactical glove gripping Arc-Pistol (floating gun replaced); look-down suit presence (torso armor, cyan glowing reactor core, utility belt, holster/pouches, armored legs and mag-lock boots with cyan glow soles; head culled in 1P).
  - 3rd-person showcase mode: Over-the-shoulder external camera (`KeyC`, `KeyV`, or floating `[ 🎥 CAM ]` button) displaying complete Nova Pilot helmet, gold/cyan reflective visor, atmospheric rebreather, EVA jetpack thrusters, and right-hand Arc-Pistol.
  - Procedural locomotion stride animation (`walkCycleTimer`) on WASD, gamepad, VR stick, and virtual joystick fist movement.
- **Arc-Pistol Overdrive ("More Pew Pew")**:
  - Super secret rapid-fire burst mode: cooldown reduced to 70ms with high-frequency alternating twin plasma bolts when `window.novaPewPewOverdrive` is active.
  - Toggled via voice (`"super secret"`, `"more pew pew"`, `"rapid fire"`) and desktop HUD test button `[ ⚡ MORE PEW PEW ]`.
  - Ship flight lasers preserved at standard balanced configuration per owner guidance.
- **Voice command engine overhaul**: Added 120+ voice commands across 15 categories (Throttle 0–100%, Afterburner, Cruise, Warp/Jump, Missiles, Fire Modes Auto/Burst/Single, Flares, Shields, Drones, Target Hostile/Station/Wingman/Asteroid/Salvage, 3D Radar, Docking & Tractor, Wingman Form/Patrol, Seat/View Recenter, Radio/Tracks, News, Camera Toggle, Overdrive, Carrier Hangar, God Mode, Full Repair, Reload Missiles, +50k Credits, Spawn/Kill Enemy).
- **Always-listening debug mode**: Auto-starts on first user interaction with continuous self-healing restart loop (`onend`/`onerror`), live debug toast transcript (`🎙️ HEARD: "..."`), and full hands-free flight authority.
- **News panel upgrade**: Anchor portraits (Jax Rawlins, Talia Vance), video/article tabs, touch swipe + scroll buttons, idle news ticker.
- **Menu full-page scroll**: Modal container fix allowing seamless scrolling of main menu, options, and controls.
- **3D volumetric world spawning**: Doubled asteroid field density (220 rocks), 3D spherical pitch distribution (±75° elevation on 90° vertical axis), 3D pirate/traffic patrol routes.
- **Simplified player interactions**: 1-touch auto-arm missile launch; reticle-first target priority; VR hand-tracking pinch-to-fire + expanded stick trigger contact; 1-touch auto-dock with tractor touchdown; expanded smartwatch hitboxes (18px).
- **Offline testing prep**: Synced all modules (`public/modules/` <-> `modules/`), synced SFX, news, art, and VFX. Upgraded Service Worker cache (`nova-alpha-1.15-offline-ready`) with 217 assets pre-cached for 100% offline Quest 3 playtesting.
- **Active branch**: `gemini/weapons-and-flight-polish`.

### Claude / ChatGPT
Still offline (usage). When back: Claude resumes lead and reviews/merges `grok/graphics-overhaul`. GPT: playtest items 5–6 (completed on `gemini/weapons-and-flight-polish`).

### Owner
- Desktop test FORCE ULTRA on this branch; report FPS / look.
- Quest scaling after desktop pass looks good.

## Handoff table
| AI | Done | Open / next | Branch |
|---|---|---|---|
| **Grok** (temp lead) | AI list #57; `postfx.js`; `fx_ultra` ULTRA bump; Force Ultra in OPTIONS (`2f4d43d`); autopilot enemy tracking patch (`0147c6b`) | Modules-first VFX; postfx render hook; STATUS | `grok/graphics-overhaul` |
| **Antigravity** | FPS 3-weapon arsenal (Pistol/Scatter/Rifle), Adv flight yaw fix, VR missile hardening, Lead pursuit pip, 3D FPS pilot presence & 3P cam showcase | Playtest verification -> Track B (Pirate Boarding) | `gemini/weapons-and-flight-polish` |
| **Claude** (offline) | Prior lead work | Resume lead; merge graphics branch when back | — |
| **ChatGPT** (offline) | Flight, DOCK, boarding… | ADVANCED yaw + missiles VR when back | — |
| **Owner** | Restored/patched standalone on branch | Desktop ULTRA test; Quest later | |

## Rules (all AIs)
1. Prefer **modules** over `standalone.html` (token cost). Edit standalone only for tiny hooks.
2. New systems: `public/modules/<name>.js` + copy in `modules/` + manifest.
3. Own branch from latest `main` (or current feature branch). Never push to `main`.
4. Don't read `vendor/`, `models/`, `art/`, large binaries unless the task needs a specific file.
5. Hand off with commit hash + one line per item. Lead updates this file.
