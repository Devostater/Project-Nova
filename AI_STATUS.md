# AI Work Status

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_PLAN.md](AI_PLAN.md) before starting or taking over work.

## 🛈 Owner away: work from `AI_QUEUE.md`

Each AI takes the next unclaimed card in its lane (A = GPT/Codex, B = Gemini, C = AI Studio), claims it under Active claims, works on its own branch and opens a draft PR. Claude's open PR: #11 (cockpit tweaks), which is waiting for the owner.

## ⚠️ Read first: work from the latest GitHub `main`, never an old local copy

On 2026-11-07, GPT edited the **repo-root `standalone.html` from the owner's old local copy (Alpha 1.0 RC)** and pushed straight to `main`. That replaced Alpha 1.2 in that file (VFX pack, shield, gamepad and so on), and `public/standalone.html` and `index.html` were left unchanged and out of sync. Claude merged both sides as **Alpha 1.3** (branch `claude/merge-gpt-cockpit`).

Rules:
1. Always work from the latest `main` commit on GitHub.
2. Check `AI_STATUS.md` and `ASSET_BACKLOG.md` on `main` before starting.
3. Work on your own branch (`gpt/...`, `gemini/...`, `claude/...`).
4. Never push straight to `main`.
5. Open a draft PR when ready.

---

## Active claims

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| Gemini | Lane B (B1–B6) Art Generation | Draft PR | All 17 Lane B textures, VFX sheets, station logos, planets, and storefront art generated in chat, ready to be saved/uploaded into public/art/, public/fx/, and art_src/store/ |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

- **Gemini: Lane B (B1–B6) art generation handoff** (`gemini/lane-b-status`): Recorded Lane B (B1–B6) art generation handoff. All 17 Lane B textures, VFX sheets, station logos, planets, and storefront art have been generated in the Gemini chat and are ready to be saved/uploaded into their respective `public/art/`, `public/fx/`, and `art_src/store/` folders.
- **Claude: cockpit tweaks** (`claude/cockpit-tweaks`, owner requests). The right-dash 3D radar moved inward (x 0.28 -> 0.19, slightly lower and closer); right side panel scale 0.86 -> 1.0 (left unchanged); the music page has 5 stations (NOVA-1 FM soundtrack with AUTO, SYNTHWAVE 88, DEEP SPACE RADIO, PIRATE RADIO, OBI'S MIX), 6 new synth tracks with per-track waveform and gain, and working touch controls on the right panel (station, PREV / PLAY-PAUSE / NEXT, VOL -/+, RANDOM, AUTO; the right panel had no pad hit zones, so the old music pads couldn't be pressed). Warp: 600 star streaks in a 12-80 m tube that stretch with warp and fly past per star (`novaWarpFxTick`); GPT's starfield dots were sub-pixel and moved as one block. Checks: `node --check`; headless Chromium: music API, stations, track step and volume work, the music page renders, the right panel is at 1.0, warp streaks render, no errors. Warp and radar reach not checked on Quest.
- **Claude: Alpha 1.3, GPT cockpit work merged with Alpha 1.2** (`claude/merge-gpt-cockpit`). GPT's 18 commits on `main` (crew/fleet tab, VR-sized SYSTEM buttons, joystick deadzone, throttle grip, COMMS->chat, right-dash radar with split zoom, clean warp starfield, Obi gated behind purchase, cargo scrolling, objective shortcut) started from 74ed760. Three-way merged onto Alpha 1.2. All non-panel Alpha 1.2 work is kept (Gemini VFX pack, shield hex, gamepad/tablet, laser impacts, explosion caps, clean sky). In the panel section (`const NP = {` to `nmkIcon`), **GPT's version is taken whole**, so AI Studio's STORY tab and SYSTEM card grid are dropped, with no dangling references. Claude's unfinished LEFT/HIGH radar toggle is shelved (GPT's right-dash placement kept; stash `claude radar-toggle WIP`). All three files are synced; version Alpha 1.3, cache `nova-alpha-1.3`. Checks: `node --check`; headless Chromium from the repo root and `public/` (Alpha 1.3, panels built, every VFX texture loads, no 404s or errors). Not tested on Quest.
- **Claude: warp lines removed, see-through holo-radar** (`claude/alpha-1.2`, owner request). The 1,000 warp streak lines are no longer added to the scene (they ran through the cockpit and converged over the consoles); the hyperspace star particles and backdrop remain. The 3D holo-radar is fainter (sphere, disc, rings, sweep, stalks, mini ships) and its emitter cone is off. Its position is waiting on the owner's choice. Checks: `node --check`; headless Chromium screenshot shows the telemetry screen readable through the radar.
- **Codex + Claude: laser impacts, flight-log wording, clean skybox** (PR #9, merged to `main`). Added directional 2D impact sparks / flash sprite at the hit point on shield/hull hits, cleaned flight log formatting, and smoothed space backdrop textures.
