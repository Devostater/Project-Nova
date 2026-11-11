# Fix requests from the game

`fix_requests.jsonl` is written by the in-game **Construction Bay** (FIX REQUESTS tab, or `fix <text>` in the F2 console) when the game runs from `PLAY_NOVA.bat` (the local server in `tools/test_runner.py` appends one JSON object per line). On the live site the requests are saved on the device instead; EXPORT FILE downloads them so they can be dropped here.

Each line has: `cat` (VISUAL, CONTROLS, AUDIO, PANELS / UI, STUCK / CRASH, OTHER, TYPED), `text`, `build`, `near` (closest destination), `pos`, `state` (hull, shield, dock, cantina…), `xr`, `gfx`, `retro`, `onFoot`, `ua`, `at`.

**For the AIs (Claude, GPT, Gemini):** at the start of a round, read new lines here, fix what is clear on a code-named branch, and list each request in the PR as fixed / needs owner info / not reproducible. Move handled lines to `fix_requests_done.jsonl` in the same PR. The owner commits this folder with GitHub Desktop so cloud sessions can see it.
