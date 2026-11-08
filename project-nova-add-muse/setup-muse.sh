#!/bin/bash
# Setup Muse in Project-Nova - run from your local clone
# Usage:
#   git clone https://github.com/Devostater/Project-Nova.git
#   cd Project-Nova
#   bash setup-muse.sh
#   git add MUSE.md AGENTS.md
#   git commit -m "Add Muse (Meta AI) agent config"
#   git push

set -e
cd "$(dirname "$0")"

if [ ! -f "AGENTS.md" ]; then echo "Run this from the Project-Nova repo root (AGENTS.md not found)"; exit 1; fi

# 1. Create MUSE.md if it doesn't exist
if [ -f "MUSE.md" ]; then echo "MUSE.md already exists - skipping"; else cat > MUSE.md <<'EOF'
# MUSE.md - Project-Nova

> Agent: Muse (Meta AI) - Muse Spark 1.3 / Muse app
> Project: Project-Nova - VR space flight sim
> Repo: https://github.com/Devostater/Project-Nova
> Default branch: main

## Who I Am
I am Muse, Meta's AI assistant. Use me in this repo the same way you use Claude (CLAUDE.md), Gemini (.gemini/), and Codex (.codexignore / AGENTS.md).
I work in Meta AI (meta.ai), the Meta AI app, and the Muse app (muse.ai).

## How To Use Me On This Repo
1. Paste relevant files / context into a Muse chat, or ask Muse to read this file.
2. Ask for: code changes, debugging, asset specs, docs, playtesting checklists, performance passes.
3. I cannot push directly to GitHub from Meta AI chat - apply my diffs / files yourself, or paste them into your editor / Muse Code / Muse app.

## Project Context
- VR space flight sim, web-based / standalone. Key entry points: `standalone.html`, `serve_nova.py`, `start_server.bat`, `package.json`, `manifest.webmanifest`, `sw.js`
- Rendering / gameplay: check `modules/`, `fx/`, `VFX/`, `Audio/`, `music/`, `models/`, `art/`, `art_src/`
- Docs that are source of truth: `PROJECT_NOVA_CONTEXT.md`, `STATUS.md`, `ASSET_SPEC.md`, `ASSET_BACKLOG.md`, `TESTING.md`, `OFFLINE_PLAY.md`, `OWNER_FEATURES.md`, `OWNER_QUESTIONS.md`, `README.md`
- Do not break offline play. See OFFLINE_PLAY.md. Keep `sw.js` + manifest working.
- Performance matters: VR + low-end devices. Prefer small, batched changes. See `optimize_nova.py` / `optimize_nova.bat`.

## Rules For Muse In This Repo
- Follow AGENTS.md + PROJECT_NOVA_CONTEXT.md first. If they conflict, say so and follow AGENTS.md.
- Keep changes minimal and scoped. Don't refactor unrelated files.
- Don't invent assets, paths, or APIs. If a file/path isn't in the repo listing, ask or mark it TODO.
- Don't add new dependencies without asking.
- Test instructions: follow TESTING.md. If you can't run the game, say what to run manually.
- No secrets, keys, or personal data in code or docs.
- Match existing style in the file you're editing. Use plain, readable code.

## What I'm Good At Here
- Explaining / debugging `standalone.html` + JS modules, flight controls, VR input
- Writing / tightening specs in ASSET_SPEC.md, backlog items, TESTING.md checklists
- Drafting UI copy, onboarding, docs, and STATUS.md updates
- Reviewing PRs for perf, offline, and VR comfort issues (motion sickness, frame drops)

## What I Won't Do
- Push / commit directly to GitHub from Meta AI chat
- Claim a file exists without evidence
- Change gameplay balance silently - propose it, get approval

## Quick Prompts
- "In Project-Nova, review [file] for VR perf issues"
- "Add a feature per OWNER_FEATURES.md: [feature], minimal diff"
- "Update STATUS.md from these changes"
EOF
echo "Created MUSE.md"
fi

# 2. Patch AGENTS.md if Muse isn't already there
if grep -q "Muse" AGENTS.md; then echo "AGENTS.md already mentions Muse - skipping patch"; else cat >> AGENTS.md <<'EOF'

## Muse (Meta AI)
- Config: `MUSE.md` at repo root
- App: Muse app (muse.ai) / Meta AI (meta.ai) - Muse Spark 1.3
- Use for: code review, debugging, docs, specs, VR perf passes, playtest checklists
- Rules: Follow PROJECT_NOVA_CONTEXT.md + this file. Minimal scoped diffs. No new deps without asking. Preserve offline play (sw.js / manifest).
- Limitation: Muse in chat cannot push directly - apply its diffs manually.
EOF
echo "Patched AGENTS.md"
fi

echo ""
echo "Done. Now run:"
echo "  git status"
echo "  git add MUSE.md AGENTS.md"
echo "  git commit -m 'Add Muse (Meta AI) agent config'"
echo "  git push"
