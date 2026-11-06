# AI Coding Workflow

This repository is worked on with multiple AI tools. Use this file and [AI_STATUS.md](AI_STATUS.md) to coordinate work and prevent lost or conflicting edits.

## Authority

- **Claude is the primary AI** for Project Nova until the owner changes this setting.
- The owner has final authority.
- Claude coordinates priorities and integration. Other AIs may inspect, plan, review, or work on clearly separate tasks, but must respect active ownership below.
- These rules apply to every AI tool, not only Claude.

## Before changing code

1. Read this file, [AI_STATUS.md](AI_STATUS.md), [AI_CONTEXT.md](AI_CONTEXT.md), and [PROJECT_INDEX.md](PROJECT_INDEX.md).
2. Check the latest `main` and any relevant open branches or pull requests before editing. Do not assume the status file is current if newer GitHub activity exists.
3. If another AI has an active task on overlapping files or behavior, do not edit those files. Ask the owner or coordinate a handoff first.
4. Claim the task in `AI_STATUS.md`: identify the AI/tool, task, branch, scope, and files it expects to touch. Keep the claim concise.
5. Work on a task-specific branch, never directly on `main`. Use a branch name such as `claude/short-task-name`, `codex/short-task-name`, or `tool/short-task-name`.
6. Keep changes focused. Before editing a file, check its current version on your branch and preserve changes made since your last read.

## While working

- Treat the claimed files and behavior as owned by the named AI until it records a handoff or completion.
- If the task scope needs to expand into another AI's claimed area, stop and coordinate first.
- Do not force-push over another tool's work or copy an old whole-file snapshot over a newer version.
- Commit to your own branch. Use a pull request for review and integration; do not merge unless the owner explicitly asks.
- A branch is the change boundary. The status file is a coordination signal; it does not technically lock GitHub files.

## When pausing or handing off

Update `AI_STATUS.md` before stopping. Record:

- What is complete and what remains
- Files changed and important implementation decisions
- Current branch and latest commit SHA or pull request
- Checks run and their results (or say not run)
- The exact next step and any blockers

Set the state to **Paused / handoff** and name the next AI if known. The next AI must read the current branch/diff before continuing.

## When finishing

Update `AI_STATUS.md` with the result and links to the branch or pull request, then mark the task **Complete** and release file ownership. Do not erase the previous handoff context until the next task is claimed.

## If a status claim is stale

A status entry may be stale if its branch is deleted, its pull request is merged/closed, or the owner confirms the AI has stopped. Check GitHub before taking over. If unsure, ask the owner rather than overwriting potentially active work.

## Owner changes

Only change the primary AI or these coordination rules when the owner requests it. Until then, Claude remains primary.
