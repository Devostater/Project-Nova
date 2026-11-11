# Releases and code names

The main menu shows `ALPHA x.x · CODENAME · build <commit> · <date>` (from `public/build.json`, written by `tools/sync_html.mjs` on every local start and every Pages deploy). The build code is the git commit, so it always tells you exactly which version you are playing; compare it with the latest commit on GitHub. `+edits` means the local copy has unsaved/uncommitted game changes.

## Bumping a release
Change both places together: `RELEASE` in `tools/sync_html.mjs` and `GAME_VERSION` (+ the `menu-build` / `version-badge` text) in `standalone.html`.

## Code names (one per release, in order)
| Version | Code name | Highlights |
|---|---|---|
| Alpha 1.4 | — | Cold Run, boarding, cantina, owner models |
| **Alpha 1.5** | **MONGOOSE** | galaxy map room, politics (Council Floor), billboards, emblems, boarding props/enemies, SFX fix, canopy button, menu build info |
| Alpha 1.6 | KESTREL | (next) |
| Alpha 1.7 | BARRACUDA | |
| Alpha 1.8 | WOLVERINE | |
| Alpha 1.9 | MANTA | |
| Alpha 2.0 | RAVEN | |
| later | OCELOT, VIPER, LYNX, CONDOR, MARLIN, JACKAL | |

## Branch names
Use `<ai>/<codename>-<task>`, all lower case, e.g. `claude/mongoose-canopy`, `codex/kestrel-radio`, `gemini/kestrel-nebula-art`. The code name says which release the work is for.

## Playing the latest build on PC
Run **`PLAY_NOVA.bat`** (repo root; a copy on the Desktop works too). It finds the repo, pulls the latest `main` with GitHub Desktop's git, prints the commit, and starts the local server. The menu's build code should match the commit it printed.
