# AI Work Status

> Read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_PLAN.md](AI_PLAN.md) before starting or taking over work.

## Primary AI

**Claude** is primary for Project Nova until the owner changes this.

## Game file

The game files (`public/standalone.html`, `standalone.html`, `index.html`) are held by **one AI at a time**.

**Held by:** Nobody. Claude takes it next for the sprite-sheet fix (Phase 2).

## Active claims

Several AIs may hold claims at once, as long as their files don't overlap. Add a row before starting; remove it in your handoff.

| AI/tool | Task | Branch | Files / behavior owned | State | PR |
|---|---|---|---|---|---|
| Claude | Phase 1 foundation: three.js vendor fix, asset spec, AI plan, multi-claim status | `claude/phase1-foundation` | `public/vendor/*`, `ASSET_SPEC.md`, `AI_PLAN.md`, `AI_STATUS.md` | Active | (this PR) |

## Waiting for review / merge

| AI/tool | Work | PR | Notes |
|---|---|---|---|
| Google AI Studio Build | VFX texture pack + Alpha 1.0 RC / NOVA14 reconcile | #3 | Claude restored the dropped import map (08d75c8). Open issue: effects show the whole sprite sheet instead of one frame. |

## Done / handoffs

Newest first. Keep each entry short: what changed, the PR, checks run, and the next step.

- **Claude: restore lost features** (PR #1, merged). Restored gamepad input, the tablet controller and device detection after the Alpha 1.0 RC push overwrote them. Checks: `node --check` and a headless Chromium run.
- **Codex: AI handoff workflow** (PR #2, merged). Added `AI_WORKFLOW.md`, `AI_STATUS.md` and `CLAUDE.md`.

## How to claim work

1. Check the latest `main` and open PRs. Make sure nobody holds the files you need.
2. Add a row to **Active claims**: AI/tool, task, branch, files, state (Active / Paused / Handoff), PR.
3. If you need the game file and it says **Nobody**, put your name there.
4. When you pause or finish, remove your row, release the game file if you held it, and add a short entry to **Done / handoffs** (or **Waiting for review** if a PR is open). Include the branch or PR, files changed, checks run, and the exact next step.
