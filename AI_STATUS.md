# AI Work Status

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_PLAN.md](AI_PLAN.md) before starting or taking over work.

## Primary AI

**Claude** is primary for Project Nova until the owner changes this.

## Game file

The game files (`public/standalone.html`, `standalone.html`, `index.html`) are held by **one AI at a time**.

**Held by:** Claude (`claude/alpha-1.2`): Alpha 1.2 integration (panels done; VFX and GPT docking next). GPT (docking) and AI Studio (side panels) may edit **only their listed functions** below, starting from the latest `main`; Claude merges both into Alpha 1.2.

## Active claims

Several AIs may hold claims at once, as long as their files don't overlap. Add a row before starting; remove it in your handoff.

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| GPT (ChatGPT) | Docking update | none (GPT can't push; owner pastes the result to Claude) | docking code only: `executeDocking`, `novaDock*`, `ndk*`, `novaAutoDockPress` | Active | — |

## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| — | — | — | — |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

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
