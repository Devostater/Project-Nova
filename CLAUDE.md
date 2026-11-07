# Claude Instructions for Project Nova

The lead AI is named in `AI_STATUS.md` → **Current lead** (GPT/Codex since 2026-11-07). While another AI leads, Claude works in `public/modules/*.js`, reviews PRs, and does not edit the three game files unless the owner asks.

Before coding, read [AI_WORKFLOW.md](AI_WORKFLOW.md), [AI_STATUS.md](AI_STATUS.md), [AI_QUEUE.md](AI_QUEUE.md) and [PROJECT_NOVA_CONTEXT.md](PROJECT_NOVA_CONTEXT.md). Claim the task, branch, and files in `AI_STATUS.md` before editing. Work on a task-specific branch and check current GitHub changes first.

While coding, keep the claimed scope, preserve newer edits, and coordinate before touching files owned by another AI. Do not commit directly to `main` or merge a pull request unless the owner explicitly asks.

Before pausing, handing off, or finishing, update `AI_STATUS.md` with the current branch/PR, files changed, what is complete, what remains, checks run, and the exact next step. Release file ownership when done.
