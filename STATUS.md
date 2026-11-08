# Project Nova status

Read this file and [OWNER_FEATURES.md](OWNER_FEATURES.md) (the backlog) first. Don't read anything in `docs/archive/` unless asked.

## Now
- **Temporary lead:** **Grok (xAI)** — Claude and ChatGPT are at weekly usage limits. Grok is acting as lead/integrator until they return.
- **Active branch:** `grok/graphics-overhaul` — aggressive max-graphics pass (ULTRA-first).
- **Live game:** https://devostater.github.io/Project-Nova/standalone.html (still on last main deploy until this branch is merged).
- **Quest app:** `com.azi.projectnova` 1.0.3 launcher. Build with `powershell -File tools\build_install_quest.ps1`.

## Handoff (2026-11-07/08): Grok graphics overhaul

**Grok is doing:**
- Aggressive graphics overhaul (post-processing + richer VFX). Goal: make drifting in space look as pretty / AAA as possible, then scale down later for Quest.
- New module: `public/modules/postfx.js` (+ root `modules/postfx.js`) — UnrealBloomPass, vignette, grain, quality tiers. Loads Three.js postprocessing addons from CDN if not vendored.
- Upgraded `fx_ultra.js` — higher particle counts, more lights/debris/trails on ULTRA.
- `forceUltra` defaults to **true**. Menu toggle **FORCE ULTRA: ON/OFF** added in OPTIONS (alongside GRAPHICS).
- `NOPT.o` defaults: `gfx: 'ultra'`, `forceUltra: true`. `NOPT_GFX` now includes an `ultra` preset.

**Still needed / next:**
1. Wire `postfx.render()` into the main render loop in `standalone.html` (replace or wrap `renderer.render`).
2. Vendor Three.js postprocessing addons for offline/APK (currently CDN fallback).
3. Continue visual polish: thruster plumes, shield hits, cockpit lighting, better explosions.
4. After Quest playtest reports, dial quality tiers down as needed.

**Owner:** Test on desktop/browser first (FORCE ULTRA on). Report frame rate and any issues. Quest scaling comes after.

## Handoff table
| AI | Done and merged | Open / next | Working copy |
|---|---|---|---|
| **Grok** (xAI, temp lead) | AI list PR #57; `postfx.js`; upgraded `fx_ultra.js`; forceUltra default + OPTIONS toggle (this branch) | Wire postfx into render loop; vendor addons; more VFX polish; keep STATUS updated | `grok/graphics-overhaul` |
| **Claude** (lead, offline) | checkpoint1; token clean-up; many playtest fixes; cinematics | Resume lead when usage resets; merge graphics branch after review | — |
| **ChatGPT** (Codex, offline) | flight model, DOCK, boarding, etc. | Playtest items 5–6 (ADVANCED yaw, missiles in VR) when back | — |
| **Antigravity** (Gemini) | storyboard intro 01–08, epilogue 01–03 | epilogue 04–06; missile thruster art when quota allows | `gemini/storyboard` |
| **Owner** | | Desktop test of ULTRA graphics; Quest playtest when ready; third-faction name, bartender, seat_v2 | |

Notes: Prefer Grok for critique and this graphics pass. Antigravity for art. ChatGPT for code when available. Claude remains formal lead when online.

## Rollback
- **`checkpoint1`** (tag and branch `backup/checkpoint1`) is commit `7c1a9d5`. Owner approval required for force-push to main.

## Rules (all AIs)
1. Game code: edit **`standalone.html` only**. `index.html` and `public/standalone.html` are generated (`node tools/sync_html.mjs`), untracked, and never read.
2. New systems go in `public/modules/<name>.js` (`export function init(nova)`), listed in `public/modules/manifest.json`, with an identical copy in root `modules/`.
3. Work on your own branch, starting from the latest `main`. Edit only the functions or files your task names. Never commit to `main`, and never overwrite whole files.
4. Don't read `vendor/`, `public/vendor/`, `models/`, `art/`, `art_src/`, `music*/`, `android/app/build/` or `docs/archive/`.
5. Cheap checks before handing off: `node tools/sync_html.mjs --check` and `node --check` on changed modules. Say what you did **not** test.
6. Hand off by replying with the commit hash and one line per item. Lead updates this file.
