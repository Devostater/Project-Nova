# Next update plan (Alpha 1.3)

Do **one task per AI session**. Start each session with: "Read STATUS.md and docs/NEXT_UPDATE.md, then do task N."
Rule: build in `modules/` + `public/modules/`. Touch `standalone.html` only for small hooks. Extend existing systems; don't make duplicates.

## Order (each task builds on the one before)

### 0. Universal input: every device ready  *(do this first: every task below uses it)*
- One input layer (`modules/input.js`) that turns every device into the same actions (pitch/yaw/roll, throttle, fire, missile, boost, interact, menu, walk, turn).
- Devices: keyboard+mouse, Xbox/PS/generic gamepads (Gamepad API), HOTAS/joysticks, Quest controllers, Quest hand tracking, touch/tablet, phone.
- Detect the device automatically and show its button prompts. Rebinding goes in OPTIONS and is saved.
- Retire duplicate handlers: one pinch or one button press = one action (this already started with the FPS hand fix).
- Done when: the same flight, FPS and menus work on each device with no overlapping inputs.

### 1. Flight controls: AAA polish + comfort  *(ChatGPT: it owns flight)*
- Smooth input curves and deadzones, consistent speeds, no snapping.
- Comfort setting in OPTIONS: **Comfort / Standard / Full** (vignette when turning fast via `comfort_vignette.js`, snap vs. smooth turn, horizon lock).
- Must feel right with hand tracking AND controllers on the Quest.
- Done when: a 10-minute flight in VR causes no nausea and no jitter.

### 2. Reputation core  *(any AI)*
- One rep store per faction (extend existing `novaPirRep` / `piracy_law.js`; don't add a second system).
- **Pirates don't attack you when your pirate rep is high enough** (Friendly). EDF turns hostile when pirate rep is high.
- Rep shows on the wrist/HUD.

### 3. Pirate actions  *(any AI)*
- Player can pirate: disable a freighter, tractor its cargo (existing salvage/tractor), and accept bounties from the pirate side.
- Each action changes rep (task 2).

### 4. Economy: markets, store values, trade hubs, trade routes  *(any AI)*
- One market module: per-station buy/sell prices, supply/demand drift, saved via `save.js`.
- Trade hubs: Nova-1 station, Cygnus Prime spaceport (the safehouse desk already exists, so reuse it), pirate station.
- Trade routes: price differences between hubs plus a route list in the wrist menu. Pirates raid busy routes.

### 5. Pirate station docking  *(any AI)*
- A dockable pirate station (reuse Nova-1 docking/landing pad code).
- Docking allowed only when pirate rep is not Hostile. It has a black market (task 4) and pirate missions (task 3).

### 6. Ship upgrades  *(any AI)*
- Bought at hubs with credits: engines, shields, weapons, cargo hold, scanners. Extend `novaUp`; save via `save.js`.
- The pirate station sells illegal upgrades.

### 7. EVA as story / player choice, not a test feature  *(any AI)*
- Remove EVA from test buttons/voice debug.
- Trigger it from the story (e.g. ejected after the ship is disabled) or as a player choice (repair the hull, salvage a wreck, board via EVA).
- Use `eva_core.js`.

### 8. New models  *(owner + art AI, ongoing)*
- Generate the pirate station and the trade-hub interiors. Wire in the sorted `Pirate/boarding/` props/crew/weapons for boarding.
- Optimize every model for Quest (Draco/meshopt, a `_lo` version) before adding it to `public/`.

## Before any of these
- Merge PR #61 and get the deploy green.
- Pull the AI Studio work (rover, hub, crash fixes) onto a branch: upload only `standalone.html` + `modules/`.

### 9. Planetside city life  *(big task, split it: 9a first)*
- **9a. City hub at Cygnus Prime:** a walkable district next to the spaceport (built on the AI Studio hub/rover work): streets, shops, a bar, a market terminal (task 4), an upgrade shop (task 6). Quest-cheap: modular buildings, instanced props, fog plus the planet skybox.
- **9b. Life:** NPC crowds with simple walk loops, ambient traffic (hover cars on splines), day/night lighting, city sounds.
- **9c. Activities:** job board (cargo, bounties, pirate contracts that tie into rep), talking NPCs, a home/apartment that upgrades the safehouse.
- **9d. More cities:** reuse the kit on other planets (pirate city = black market).
- Budget: the city must hold Quest framerate. Use LODs, cull what's out of view, and cap the NPC count.
