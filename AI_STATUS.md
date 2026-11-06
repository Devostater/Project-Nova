# AI Work Status

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_PLAN.md](AI_PLAN.md) before starting or taking over work.

## Primary AI

**Claude** is primary for Project Nova until the owner changes this.

## Game file

The game files (`public/standalone.html`, `standalone.html`, `index.html`) are held by **one AI at a time**.

**Held by:** Nobody. Claude takes it next to integrate AI Studio's panel updates and bump the version to Alpha 1.1.

## Active claims

Several AIs may hold claims at once, as long as their files don't overlap. Add a row before starting; remove it in your handoff.

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| Claude | Alpha 1.1 integration and test prep | `claude/alpha-1.1` | game files, `TESTING.md` | Waiting for AI Studio's panel updates on a branch | — |

## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| — | — | — | — |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

- **Claude: Phase 1 foundation** (PR #4). three.js r187 vendor files so GLB models load in the web build; `ASSET_SPEC.md`, `AI_PLAN.md`, multi-claim status; `AGENTS.md` and `.gemini/` review configs. Checks: headless Chromium (models load, no 404s).
- **Google AI Studio Build + Claude: VFX texture pack** (PR #3, merged). AI Studio wired VFX into weapons, shields, beams and explosions and reconciled Alpha 1.0 RC with NOVA14. Claude restored the dropped import map, cut clean textures into `public/fx/` (`tools/vfx_cut.py`), made explosions play one atlas frame at a time and capped explosion layers for Quest. Checks: headless Chromium. Still needs an owner test on the Quest.
- **Claude: restore lost features** (PR #1, merged). Restored gamepad input, the tablet controller and device detection after the Alpha 1.0 RC push overwrote them. Checks: `node --check` and a headless Chromium run.
- **Codex: AI handoff workflow** (PR #2, merged). Added `AI_WORKFLOW.md`, `AI_STATUS.md` and `CLAUDE.md`.

## How to claim work

1. Check the latest `main` and open PRs. Make sure nobody holds the files you need.
2. Add a row to **Active claims**: AI/tool, task, branch, files, state (Active / Paused / Handoff), PR.
3. If you need the game file and it says **Nobody**, put your name there.
4. When you pause or finish, remove your row, release the game file if you held it, and add a short entry to **Done / handoffs** (or **Waiting for review** if a PR is open). Include the branch or PR, files changed, checks run, and the exact next step.
