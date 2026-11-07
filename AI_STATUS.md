# AI Work Status

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_PLAN.md](AI_PLAN.md) before starting or taking over work.

## ▶ Owner away: work from `AI_QUEUE.md`

Each AI takes the next unclaimed card in its lane (A = GPT/Codex, B = Gemini, C = AI Studio), claims it under Active claims, works on its own branch and opens a draft PR. Claude's PR #11 is merged.

## ⚠ Read first: work from the latest GitHub `main`, never an old local copy

On 2026-11-07, GPT edited the **repo-root `standalone.html` from the owner's old local copy (Alpha 1.0 RC)** and pushed straight to `main`. That replaced Alpha 1.2 in that file (VFX pack, shield, gamepad and so on), and `public/standalone.html` and `index.html` were left unchanged and out of sync. Claude merged both sides as **Alpha 1.3** (branch `claude/merge-gpt-cockpit`). Before editing: pull `main`, edit **all three** game files the same way (or let Claude sync them), and use a branch and PR.

## Primary AI

**Claude** is primary for Project Nova until the owner changes this.

## Game file

The game files (`public/standalone.html`, `standalone.html`, `index.html`) are held by **one AI at a time**.

**Held by:** Nobody; Codex released the tablet HUD area in draft PR #21.

## Active claims

Several AIs may hold claims at once, as long as their files don't overlap. Add a row before starting; remove it in your handoff.

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| GPT (ChatGPT) | Docking update | none (GPT can't push; owner pastes the result to Claude) | docking code only: `executeDocking`, `novaDock*`, `ndk*`, `novaAutoDockPress` | Active | — |


## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| Codex | Tablet touch HUD visibility | [Draft PR #21](https://github.com/Devostater/Project-Nova/pull/21) | Three game builds synced; waiting for review. |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

- **Codex: A10 Interior/arena + firing range** ([draft PR #26](https://github.com/Devostater/Project-Nova/pull/26), branch `codex/a10-interior-range`). Added mirrored modular 16 × 30 m range, PBR metal/hazard textures, target banks, smooth WASD and XR left-stick walking, and a marked doorway exit; creates pooled/static geometry/materials at init. How to test after A4: `?arena=range`, walk and return in 2D/gamepad/Quest. Checks not run: runtime, gamepad, Quest. Integration dependency: add `interior.js` to A4 manifest after PR #24 merges. Next: A11 on a separate branch.

- **Codex: tablet touch HUD visibility** ([draft PR #21](https://github.com/Devostater/Project-Nova/pull/21), branch `codex/tablet-touch-hud`). The DOM HUD overlay and version badge are hidden while tablet touch controls are active; auto device detection and manual toggle both update the state. All three game files are synchronized. How to test: on desktop compare controls off/on; on tablet enable and disable touch controls and confirm the HUD follows the state. Checks not run: browser runtime, automated, tablet, gamepad, Quest. Next: review PR #21.

- **Codex + Claude: A3 missile trails + explosion upgrade** (`claude/fx-ultra-wire`, built on `codex/fx-ultra`). Codex wrote `public/modules/fx_ultra.js` (pooled trail and explosion particles, tiers low/mid/high/ultra, Quest forced to low) and ran out of usage before wiring it in. Claude loads it with a dynamic `import()` (copied to root `modules/` for the PC servers, added to the offline cache), feeds **live** missile positions every `nmFrame` (enemy `NF.msl` and player `activeMissiles`; velocity from frame-to-frame motion, because the module dead-reckons and homing missiles turn), stops trails on impact, and adds module explosions from `novaBoom` and missile impacts **except on the low/Quest tier**. Checks: `node --check` on both; headless root and public builds load tier HIGH, fire missiles and explosions, no errors. Not checked: the look in the headset.
- **Claude: Alpha 1.4 demo polish** (`claude/demo-polish`). Heat cores are listed in CARGO and sellable at every market; the gamepad View/Back button triggers TRACTOR; version Alpha 1.4, cache `nova-alpha-1.4`; `TESTING.md` demo checklist. Audit: headless runs of both builds (all panel tabs, keys, salvage, music) showed **0 errors, warnings or 404s**. **Perf risk for Quest:** flight scene about **282 draw calls, 772k tris, 607 visible meshes, 365 materials, 5 lights** (budget about 150 calls / 300k tris). That's card A7: merge static cockpit meshes, share materials, LOD/cull distant ships and asteroids. Note: commit 6eeda36's message says it adds arena textures, but it only added the station logos.
- **Claude: salvage drops + TRACTOR (AI_QUEUE A2)** (`claude/modules-salvage`). Faction kills drop salvage pods (fighters 25%, big ships 60% ×2, bosses 100% ×3; at most 8 in space; despawn after 120 s). Contents: salvage, credits, ore, missiles, flares, shield caps, or a **heat core** (rare; more likely from big ships; counted in `localStorage.novaHeatCores`). Pods appear as grey `salvage` contacts in the target cycle, holo-radar and COMMS list. Lock one, then **TRACTOR** (a COMMS pad that appears only when a pod is locked, or **G** on keyboard) pulls it in within 500 m. Test hooks: `novaTest.salvage()`, `.lockSalvage()`, `.salvageState()`. Built inline, not yet as a module (A4 still open). Checks: `node --check`; headless spawn → lock → tractor stows a heat core, no errors. Not checked: COMMS-list display on Quest, gamepad binding.
- **Claude: cockpit tweaks** (`claude/cockpit-tweaks`, owner requests). The right-dash 3D radar moved inward (x 0.28 → 0.19, slightly lower and closer); right side panel scale 0.86 → 1.0 (left unchanged); the music page has 5 stations (NOVA-1 FM soundtrack with AUTO, SYNTHWAVE 88, DEEP SPACE RADIO, PIRATE RADIO, OBI'S MIX), 6 new synth tracks with per-track waveform and gain, and working touch controls on the right panel (◀/▶ station, PREV / PLAY-PAUSE / NEXT, VOL −/+, RANDOM, AUTO; the right panel had no pad hit zones, so the old music pads couldn't be pressed). Warp: 600 star streaks in a 12–80 m tube that stretch with warp and fly past per star (`novaWarpFxTick`); GPT's starfield dots were sub-pixel and moved as one block. Checks: `node --check`; headless Chromium: music API, stations, track step and volume work, the music page renders, the right panel is at 1.0, warp streaks render, no errors. Warp and radar reach not checked on Quest.
- **Claude: Alpha 1.3, GPT cockpit work merged with Alpha 1.2** (`claude/merge-gpt-cockpit`). GPT's 18 commits on `main` (crew/fleet tab, VR-sized SYSTEM buttons, joystick deadzone, throttle grip, COMMS→chat, right-dash radar with split zoom, clean warp starfield, Obi gated behind purchase, cargo scrolling, objective shortcut) started from 74ed760. Three-way merged onto Alpha 1.2. All non-panel Alpha 1.2 work is kept (Gemini VFX pack, shield hex, gamepad/tablet, laser impacts, explosion caps, clean sky). In the panel section (`const NP = {` to `nmkIcon`), **GPT's version is taken whole**, so AI Studio's STORY tab and SYSTEM card grid are dropped, with no dangling references. Claude's unfinished LEFT/HIGH radar toggle is shelved (GPT's right-dash placement kept; stash `claude radar-toggle WIP`). All three files are synced; version Alpha 1.3, cache `nova-alpha-1.3`. Checks: `node --check`; headless Chromium from the repo root and `public/` (Alpha 1.3, panels built, every VFX texture loads, no 404s or errors). Not tested on Quest.
- **Claude: warp lines removed, see-through holo-radar** (`claude/alpha-1.2`, owner request). The 1,000 warp streak lines are no longer added to the scene (they ran through the cockpit and converged over the consoles); the hyperspace star particles and backdrop remain. The 3D holo-radar is fainter (sphere, disc, rings, sweep, stalks, mini ships) and its emitter cone is off. Its position is waiting on the owner's choice. Checks: `node --check`; headless Chromium screenshot shows the telemetry screen readable through the radar.
- **Codex + Claude: laser impacts, flight-log wording, clean skybox** (PR #9 integrated into `claude/alpha-1.2`). Codex added localized laser-hit flares and sparks (`novaVfxLaserImpact`) and reworded campaign objectives and flight-log headings, and found the pole-seam streaks in `sky.jpg`. Its push converted all three game files to CRLF (about 36k changed lines for a 33-line change), so Claude merged only the real lines with LF endings, swapped in the clean `art/sky_v014_backup.jpg` as `sky.jpg`, and added `.gitattributes` to keep LF from now on. Checks: three-way merge without conflicts; headless Chromium.
- **Claude: Gemini VFX pack** (branch `claude/alpha-1.2`). Seven Gemini source images (`art_src/gemini/`: fireball, smoke, sparks, laser, muzzle, engine, warp) built into game textures by `tools/vfx_build.py`. In game: a 2048 px 8×8 explosion (fireball → smoke) and grayscale laser, flare and spark. Delivered but not wired yet: small hit burst, muzzle sheet, engine glow, warp streaks. `vfx_cut.py` now only makes lightning and the legacy shield cell. Checks: headless Chromium from the repo root and `public/` (all textures load, rendered in front of the camera, explosions run, no 404s or errors).
- **Google AI Studio + Claude: side panel layouts** (branch `claude/alpha-1.2`). AI Studio ran out of usage, so the owner uploaded its `standalone.html`. It was based on 642938b and changed only the panel/UI code (`np*` panels, gestures, keyboard `novaKb*`, `novaChoice*`). Claude three-way merged it onto the shield branch with no conflicts, kept all later fixes (VFX, fx/, shield hex, gamepad), restored the import map, and set the version to Alpha 1.2 (cache `nova-alpha-1.2`). Checks: `node --check`; headless Chromium shows the side panels, with no 404s or errors.
- **Claude: Gemini shield texture** (branch `claude/shield-hex`). First asset generated through the Gemini API (`gemini-3.1-flash-image`): a seamless 1024 px hex shield, stored grayscale (387 KB) in `public/fx/` and `fx/`. It replaces the 128 px hex on the shield dome, shield hits and drone rings; offline cache bumped to `nova-alpha-1.1b`. Only the NOVA_VFX texture map and shield repeat lines changed. Checks: headless Chromium (loads at 1024², no 404s or errors, rendered on a dome).
- **Claude: Alpha 1.1** (PR #5). Version bump, offline cache `nova-alpha-1.1` (now includes `vendor/three.core.js`, `SkeletonUtils.js` and `fx/`), root `fx/` textures for the PC servers, `TESTING.md`, `ASSET_BACKLOG.md`, and a manual GitHub Pages deploy workflow. Checks: headless Chromium serving both the repo root and `public/` (textures and models load, no 404s or errors). Next: the owner pulls in GitHub Desktop and runs `TESTING.md` on PC and Quest; then Claude merges AI Studio's panels and GPT's docking into Alpha 1.2.
- **Claude: Phase 1 foundation** (PR #4, merged). three.js r187 vendor files so GLB models load in the web build; `ASSET_SPEC.md`, `AI_PLAN.md`, multi-claim status; `AGENTS.md` and `.gemini/` review configs. Checks: headless Chromium (models load, no 404s).
- **Google AI Studio Build + Claude: VFX texture pack** (PR #3, merged). AI Studio wired VFX into weapons, shields, beams and explosions and reconciled Alpha 1.0 RC with NOVA14. Claude restored the dropped import map, cut clean textures into `public/fx/` (`tools/vfx_cut.py`), made explosions play one atlas frame at a time and capped explosion layers for Quest. Checks: headless Chromium. Still needs an owner test on the Quest.
- **Claude: restore lost features** (PR #1, merged). Restored gamepad input, the tablet controller and device detection after the Alpha 1.0 RC push overwrote them. Checks: `node --check` and a headless Chromium run.
- **Codex: AI handoff workflow** (PR #2, merged). Added `AI_WORKFLOW.md`, `AI_STATUS.md` and `CLAUDE.md`.

## How to claim work

1. Check the latest `main` and open PRs. Make sure nobody holds the files you need.
2. Add a row to **Active claims**: AI/tool, task, branch, files, state (Active / Paused / Handoff), PR.
3. If you need the game file and it says **Nobody**, put your name there.
4. When you pause or finish, remove your row, release the game file if you held it, and add a short entry to **Done / handoffs** (or **Waiting for review** if a PR is open). Include the branch or PR, files changed, checks run, and the exact next step.
