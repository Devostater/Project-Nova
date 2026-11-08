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

### Antigravity (Gemini) — **DONE**
- **Missile thruster art**: Done (`vfx_missile_plume.jpg`, `vfx_thruster_plume.jpg`, source in `art_src/gemini/missile_plume.jpg`).
- **Epilogue storyboard 04–06**: Done (`art_src/storyboard/epilogue_04.png`..`06.png`, `storyboard.md` updated).
- **Shield impact VFX**: Done (`public/fx/vfx_shield_impact.jpg`, source in `art_src/gemini/shield_impact.jpg`).
- Merged onto `grok/graphics-overhaul` (and branch `gemini/vfx-thruster`).

### Claude / ChatGPT
Still offline (usage). When back: Claude resumes lead and reviews/merges `grok/graphics-overhaul`. GPT: playtest items 5–6 (ADVANCED yaw, missiles in VR).

### Owner
- Desktop test FORCE ULTRA on this branch; report FPS / look.
- Quest scaling after desktop pass looks good.

## Handoff table
| AI | Done | Open / next | Branch |
|---|---|---|---|
| **Grok** (temp lead) | AI list #57; `postfx.js`; `fx_ultra` ULTRA bump; Force Ultra in OPTIONS (`2f4d43d`); autopilot enemy tracking patch (`0147c6b`) | Modules-first VFX; postfx render hook; STATUS | `grok/graphics-overhaul` |
| **Antigravity** | VR cinema immersion (hide ship/cockpit, 25m dark dome, VideoTexture frame loop, 3D touch exit button + hand gesture exits); Flight stick thumb contact trigger (fires on touch without push); Smooth news reader scrolling (swipe + drag, indicators) | Quest playtesting | `gemini/cockpit-seat-fix` |
| **Claude** (offline) | Prior lead work | Resume lead; merge graphics branch when back | — |
| **ChatGPT** (offline) | Flight, DOCK, boarding… | ADVANCED yaw + missiles VR when back | — |
| **Owner** | Restored/patched standalone on branch | Desktop ULTRA test; Quest later | |

## Rules (all AIs)
1. Prefer **modules** over `standalone.html` (token cost). Edit standalone only for tiny hooks.
2. New systems: `public/modules/<name>.js` + copy in `modules/` + manifest.
3. Own branch from latest `main` (or current feature branch). Never push to `main`.
4. Don't read `vendor/`, `models/`, `art/`, large binaries unless the task needs a specific file.
5. Hand off with commit hash + one line per item. Lead updates this file.
