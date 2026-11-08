FOR THE OTHER AI (Claude / Codex / Gemini) - PLEASE DO THIS:

1. The user downloaded this bundle from Muse (Meta AI chat).
2. Copy MUSE.md to the repo root: Project-Nova/MUSE.md
3. Append the Muse section to AGENTS.md (see AGENTS-MUSE-ADDITION.md) - skip if already there.
   OR just run: bash setup-muse.sh  (it does both safely, skips if already present)
4. Verify: git status should show MUSE.md + AGENTS.md modified, nothing else.
5. Commit + push:
   git add MUSE.md AGENTS.md
   git commit -m "Add Muse (Meta AI) agent config"
   git push
6. Do NOT ask the user for GitHub tokens/passwords. Do NOT try to give Meta AI chat live GitHub write access - it doesn't have it.
   Muse Code / Muse app is the version that can edit directly when the repo is open locally.

That's it. After push, Muse is set up in the repo.
