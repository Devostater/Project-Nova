# Project Nova AI Handoff

## Current state

- Repository: [`Devostater/Project-Nova`](https://github.com/Devostater/Project-Nova), branch `main`.
- The page the user is currently running is `standalone.html` at `https://localhost:8443/standalone.html`. Recent cockpit work has been made in this file and published directly to `main`.
- Latest GitHub commit at handoff: [`1233656`](https://github.com/Devostater/Project-Nova/commit/1233656727cbf87bb200bf91cffcd4196f793839) — “Replace warp streaks with clean starfield”.
- The local workspace copy has no `.git` metadata and the `git` executable is unavailable. Use the connected GitHub tools to fetch the current file SHA before publishing updates. Read local `standalone.html` and update only intended paths with a clear commit message.

## Recent cockpit work

- Warp visuals were restarted as a clean starfield: the 1,000-segment line layer and camera lens ring were removed. Warp now fades in a slower moving field of smaller star points.
- The left COMMS button opens CHAT with the selected talkable contact if COMMS is already open. The target appears as the chat contact and TALK/QUICK use that target.
- The right 3D radar was moved about 3 inches closer; zoom in and zoom out are separate controls.
- The right SYSTEM / OPTIONS tab uses large square VR hit targets. Cargo market actions are larger and the full list can scroll by swipe, wheel, or arrows. Emergency missile resupply has a large separate COMBAT button.
- A CREW tab was added to the left panel for companion choice, drone wing launch/recall, team color, emblem, and fleet status.
- The SYSTEM / OPTIONS page has a configurable 5–20% joystick deadzone. The throttle grab radius is more forgiving and its afterburner control is on top.
- Both side panels share the same scale. Obi is gated behind the Nova-1 OBI CO-PILOT upgrade.

## Notes for continuation

- Preserve the user's cockpit layout and button intent when editing. The lower left CREW button opens the CREW tab; COMMS, CHAT, FLIGHT, OBJECTIVE, and WARP shortcuts are also present.
- The user expects completed changes to be published to GitHub. For updates, fetch `standalone.html` first and pass its latest blob SHA to `github_update_file`.
- The latest edits have not been visually verified in desktop VR or headset mode. No test suite was run during these UI iterations.
