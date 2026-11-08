# Project Nova status

Read this file and [OWNER_FEATURES.md](OWNER_FEATURES.md) (the backlog) first. Don't read anything in `docs/archive/` unless asked.

## Now
- **Temporary lead:** **Grok (xAI)** — Claude and ChatGPT at weekly limits. Grok leads until they return.
- **Active branch:** `grok/graphics-overhaul` — aggressive max-graphics pass (ULTRA-first).
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
- **Voice command engine overhaul**: Added 120+ voice commands across 15 categories (Throttle 0–100%, Afterburner, Cruise, Warp/Jump, Missiles, Fire Modes Auto/Burst/Single, Flares, Shields, Drones, Target Hostile/Station/Wingman/Asteroid/Salvage, 3D Radar, Docking & Tractor, Wingman Form/Patrol, Seat/View Recenter, Radio/Tracks, News, Carrier Hangar, God Mode, Full Repair, Reload Missiles, +50k Credits, Spawn/Kill Enemy).
- **Always-listening debug mode**: Auto-starts on first user interaction with continuous self-healing restart loop (`onend`/`onerror`), live debug toast transcript (`🎙️ HEARD: "..."`), and full hands-free flight authority.
- **News panel upgrade**: Anchor portraits (Jax Rawlins, Talia Vance), video/article tabs, touch swipe + scroll buttons, idle news ticker.
- **Menu full-page scroll**: Modal container fix allowing seamless scrolling of main menu, options, and controls.
- **3D volumetric world spawning**: Doubled asteroid field density (220 rocks), 3D spherical pitch distribution (±75° elevation on 90° vertical axis), 3D pirate/traffic patrol routes.
- **Simplified player interactions**: 1-touch auto-arm missile launch; reticle-first target priority; VR hand-tracking pinch-to-fire + expanded stick trigger contact; 1-touch auto-dock with tractor touchdown; expanded smartwatch hitboxes (18px).
- **Offline testing prep**: Synced all modules (`public/modules/` <-> `modules/`), synced SFX, news, art, and VFX. Upgraded Service Worker cache (`nova-alpha-1.15-offline-ready`) with 217 assets pre-cached for 100% offline Quest 3 playtesting.
- Branch: `gemini/cockpit-seat-fix`.

### Claude / ChatGPT
Still offline (usage). When back: Claude resumes lead and reviews/merges `grok/graphics-overhaul`. GPT: playtest items 5–6 (ADVANCED yaw, missiles in VR).

### Owner
- Desktop test FORCE ULTRA on this branch; report FPS / look.
- Quest scaling after desktop pass looks good.

## Handoff table
| AI | Done | Open / next | Branch |
|---|---|---|---|
| **Grok** (temp lead) | AI list #57; `postfx.js`; `fx_ultra` ULTRA bump; Force Ultra in OPTIONS (`2f4d43d`); autopilot enemy tracking patch (`0147c6b`) | Modules-first VFX; postfx render hook; STATUS | `grok/graphics-overhaul` |
| **Antigravity** | 1-touch missiles, reticle targeting, VR pinch fire, 3D world elevation, news reader, sw.js offline cache for Quest | Offline Quest playtest ready | `gemini/cockpit-seat-fix` |
| **Claude** (offline) | Prior lead work | Resume lead; merge graphics branch when back | — |
| **ChatGPT** (offline) | Flight, DOCK, boarding… | ADVANCED yaw + missiles VR when back | — |
| **Owner** | Restored/patched standalone on branch | Desktop ULTRA test; Quest later | |

## Rules (all AIs)
1. Prefer **modules** over `standalone.html` (token cost). Edit standalone only for tiny hooks.
2. New systems: `public/modules/<name>.js` + copy in `modules/` + manifest.
3. Own branch from latest `main` (or current feature branch). Never push to `main`.
4. Don't read `vendor/`, `models/`, `art/`, large binaries unless the task needs a specific file.
5. Hand off with commit hash + one line per item. Lead updates this file.
