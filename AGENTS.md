# Agent instructions (Codex, Gemini/Antigravity, Grok and other AI tools)

Project Nova is a WebXR space-flight sim (Quest 3, 2D, gamepad, VR and MR). The owner (Devostater) has final say, and **Claude is the lead and integrator**.

Read **[STATUS.md](STATUS.md)** (current state + rules) and **[OWNER_FEATURES.md](OWNER_FEATURES.md)** (backlog) first. That's all you need. Older docs are in `docs/archive/`; don't read them unless asked.

Key rules (full list in STATUS.md):
- Edit `standalone.html` only. `index.html` and `public/standalone.html` are generated and untracked.
- Put new systems in `public/modules/<name>.js`, with a copy in `modules/`.
- Work on your own branch, starting from the latest `main`. Never push to `main`.
- Don't read `vendor/`, `models/`, `art/`, `art_src/`, `music*/`, `android/app/build/` or `docs/archive/`.

## AI roles
- **AI Studio / Nova News** — In-universe media, lore broadcasting hub, podcast scripts, and morality branch authoring.
- **Claude** — Lead / integrator. Reviews, merges, updates STATUS.md.
- **ChatGPT / Codex** — Code tasks (flight, docking, systems, modules).
- **Antigravity (Gemini)** — Art, storyboard, small single-file work.
- **Grok (xAI)** — Independent analysis, technical critique, alternative solutions, research, and risk identification. Prefer Grok for second opinions and architecture review.
- **Muse (Meta AI)** — Code review, debugging, docs, specs, VR perf passes, playtest checklists. (See `MUSE.md`).

## Muse (Meta AI)
- Config: `MUSE.md` at repo root
- App: Muse app (muse.ai) / Meta AI (meta.ai) - Muse Spark 1.3
- Use for: code review, debugging, docs, specs, VR perf passes, playtest checklists
- Rules: Follow PROJECT_NOVA_CONTEXT.md + this file. Minimal scoped diffs. No new deps without asking. Preserve offline play (sw.js / manifest).
- Limitation: Muse in chat cannot push directly - apply its diffs manually.

## Reviewing
Focus on runtime errors and regressions in 2D, gamepad, VR and MR, Quest performance (draw calls, overdraw, per-frame allocations), and lost work. Verify a claim against the code before reporting it.

## Testing
There's no test suite. Run `node tools/sync_html.mjs`, serve `public/` (`python -m http.server -d public`) and open `standalone.html`. Quick check: `node --check` the extracted `<script type="module">` block and any changed modules.
