# Agent Instructions (Codex and other AI tools)

Project Nova is a WebXR space-flight sim worked on by several AIs. **Claude is the primary AI**; the owner (Devostater) has final say.

Before doing anything, read [AI_WORKFLOW.md](AI_WORKFLOW.md) and [AI_STATUS.md](AI_STATUS.md). For art, also read [ASSET_SPEC.md](ASSET_SPEC.md).

## Rules

- **Only Claude edits the game files** (`public/standalone.html`, `standalone.html`, `index.html`). Put your code in `public/modules/<feature>.js` and list the hooks you need in your PR.
- To code in parallel, write a new module in `public/modules/<feature>.js` (see `AI_WORKFLOW.md`).
- Never copy a whole file from an older copy or another build over a newer one. Merge changes instead.
- `standalone.html` and `public/standalone.html` must stay identical. `index.html` is the same file without the `<script type="importmap">` block.
- Work on your own branch (`codex/<task>`), open a draft PR, and record a handoff in `AI_STATUS.md`. Never commit to `main` or merge.
- New lore, characters or mechanics are **proposals** (see `PROJECT_NOVA_CONTEXT.md`).

## Reviewing pull requests

When asked to review (e.g. `@codex review`), focus on:
1. Runtime errors and regressions in 2D, tablet, gamepad and VR (Quest 3) modes.
2. Quest performance: draw calls, transparent overdraw, per-frame allocations, texture sizes.
3. Lost work: whole-file overwrites, removed features, `standalone.html`/`index.html` drift, a missing import map.

Verify a claim against the code before reporting it, and say what was and wasn't tested.

## Testing

There is no automated test suite. Serve `public/` (for example `python3 -m http.server -d public`) and open `standalone.html` in a browser. For a quick check, extract the `<script type="module">` block and run `node --check` on it.
