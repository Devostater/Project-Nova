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

### 10. Rentable station space  *(after tasks 4 + 6)*
- Rent a hangar bay, storage, quarters or a shop stall at stations: a daily credit cost, saved via `save.js`.
- Storage holds cargo between trade runs. A hangar stores extra ships. Quarters work as a respawn and safehouse point. A stall sells goods passively.
- Prices depend on the station and on rep (cheaper with friendly factions; the pirate station takes illegal cargo).

### 11. More sectors  *(after the warp/nav check)*
- Split the universe into sectors (the core sector exists now). Jump between them with the existing warp system plus a sector map.
- Each sector has its own skybox, faction control, stations, hazards and trade prices.
- Load one sector at a time to stay inside Quest memory. Sector data goes in JSON so new sectors don't need code.
- Start with 3: **Core (EDF)**, **Pirate Reach**, **Alien Frontier**.

### 12. AI characters + in-game chat
- **Smarter AI companions:** NYX, MATRIX and the station NPCs remember your rep, cargo, location and story choices, and react to them (one shared context object passed to the chat).
- **In-game chat panel:** type or use voice (the voice engine exists) to talk to your companion or NPCs. Replies go in subtitles plus TTS. Works on the wrist menu in VR.
- **Comms:** pirates and EDF hail you, NPCs make trade offers and bounty calls (ties into tasks 2–4).
- **Offline fallback:** scripted lines when there's no connection (Quest offline play must still work).
- Key safety: the AI API key never ships in the client. Calls go through a small server proxy.
- Later (DLC): player-to-player chat with multiplayer.

### 13. Dialogue system + branching story
- One dialogue engine: data-driven trees (JSON) with choices, conditions (rep, credits, story flags, morality) and effects (rep change, items, missions, unlocking scenes).
- Works the same for scripted NPCs, NYX/MATRIX (with the AI chat from task 12 layered on top) and comms hails.
- Branching campaign: key choices set story flags that change missions, factions' attitudes and the epilogue (extend the existing `morality`, `CAMPAIGN` and cinematics epilogue variants).
- VR-friendly choice UI (point/pinch/trigger, or voice) plus subtitles. Saved via `save.js`.

### 14. Jail: pirate jail + Nova jail
- **Nova (EDF) jail:** caught with high wanted level / contraband → fined or jailed. Serve time (skip with credits), bribe a guard, or break out (an FPS escape mission).
- **Pirate jail:** captured by pirates (low pirate rep or defeated) → held for ransom. Pay, work it off, or escape and loot your ship back.
- Both are short FPS/dialogue levels built on `fps_core`/`interior` + the task 13 dialogue. The outcome changes rep and the story flags.
- Lose cargo/credits as the penalty; never delete the player's ship or save.

### 15. MATRIX companion arc + affection hearts
- **Arc:** a multi-chapter MATRIX story (ship AI learning what feelings are, always honest that she's software). Follow `reference/matrix/CHARACTER_IDENTITY.md` + `PERSONALITY_AND_MEDIA.md`. Friend / close / romance paths stay **optional**, as the companion screen promises. Chapters unlock by affection plus story flags (task 13 dialogue).
- **Affection loop:** extend the existing `novaAff`. Choices, gifts, missions together and talks raise or lower it. Saved via `save.js`. A separate track for NYX.
- **Heart icons:** small floating hearts above MATRIX's hologram when affection rises (fade up and away, broken heart when it drops), plus a heart meter on the wrist menu/companion screen. A toggle in OPTIONS hides them for players who don't want them.
- VR: hearts are world-space sprites with `raycast = () => {}` so they never block input.

### 16. Planetside UX: menu, interactions, safehouse darts, rover, FPS phone menu  *(keep it EASY)*
- **One planetside menu:** a single simple menu on foot (wrist in VR, a button on flat screens) with Map, Rover, Safehouse, Market, Jobs, Return to ship. Big buttons, max 6 per page.
- **Interactions:** one rule everywhere. Look/point at a thing → glowing outline + label → one press/pinch to use it (`[E]` / trigger / pinch). No hidden combos.
- **Safehouse darts:** finish the magnetic darts minigame (from the AI Studio build): throw with pinch-release or trigger, live scoreboard, small credit/affection rewards.
- **Rover:** board/exit with one press, auto-level on terrain, simple drive (stick/WASD/hand lever), a speed cap for comfort, a "return to rover" marker.
- **FPS phone menu:** a handheld phone/datapad on foot (raise left wrist in VR, Tab on desktop) with Map, Messages (task 12 chat), Jobs, Inventory, Settings. Replaces the scattered test buttons.
- Use the task 0 input layer so all of this works on every device.

### 17. Magic (psionics) + gadgets
- **Psionic powers** (sci-fi "magic"; ties into Alien lore, so check `reference/mind-space/GAME_BIBLE.md` first): telekinesis grab/throw, shield bubble, time-slow, mind-hack a turret or door. Hand gestures in VR (palm push, fist pull), a button on other devices. An energy bar that recharges.
- **Gadgets:** grapple hook, scanner (reveals loot/enemies/trade values), deployable turret, hacking tool, jetpack boost, holo-decoy, EMP grenade (reuse `ion_emp.js`).
- Equip through the FPS phone/inventory (task 16). Unlock by story, purchase or upgrades (task 6). Each gadget is its own small module.
- Balance: powers and gadgets use cooldowns/energy and never replace the gun.

### 18. Graphics pass: make it SHINY  *(Grok owns graphics: postfx.js / fx_ultra.js)*
- **Audit first:** screenshot each area (menu, cockpit, space dogfight, station, cantina, planet/safehouse, FPS range) on desktop ULTRA and on Quest. List what looks flat or broken before changing anything.
- **Desktop ULTRA:** stronger bloom on lasers/engines/explosions (ultra preset is mild now: strength 0.38, threshold 0.82), env-map reflections on all ship hulls (`scene.environment` from sky.jpg), PBR materials on the new models, a 4K skybox.
- **Quest (bloom can't run in VR):** fake glow with additive sprites/halos on engines, lasers, missiles and explosions, emissive materials, brighter VFX, baked lighting on interiors. Hold 72/90 fps.
- **Everywhere:** consistent tone mapping/exposure, no z-fighting/flicker, LODs so detail stays crisp up close.
- Done when: before/after screenshots of each area look clearly better, at the same or better FPS.

### 19. NOVA NEWS: huge update + news that reacts to the game
- **Relevant news:** stories generated from what actually happens: your bounties, pirate raids on trade routes, faction wars, market crashes/booms (task 4), jail breaks (task 14), story choices (task 13). One event bus: game events → news queue.
- **News that matters:** headlines change prices, spawn jobs, and warn of pirate activity in sectors (task 11). A "TRADE TIP" or "WANTED: you" story is actionable.
- **Content:** anchors Jax Rawlins + Talia Vance keep their roles. Daily cycle (breaking / market report / sector watch / sign-off). Scripted templates + ElevenLabs lines for big beats, TTS or subtitles for dynamic ones.
- **Where:** news panel, cantina screens, cockpit ticker, FPS phone (task 16), comms interrupts for breaking news.
- **Offline:** cached stories + template generation without network. Add new audio to `sw.js`.
- Builds on the existing news panel (video/article tabs, ticker) and `modules/novanet.js`. Don't start a second news system.

### 20. Territories + space drama
- **Territory control:** each sector/zone (task 11) is owned by a faction (EDF, Pirates, Aliens, Independents) with a control %. It's shown on the sector map with colored borders.
- **It shifts:** faction battles, convoy raids, the player's missions and trade (tasks 3–4) push control. Losing a zone changes its patrols, prices, station access (task 5), music and the news (task 19).
- **Space drama (live events):** fleet battles you can join or avoid, station sieges, faction betrayals, truces, a refugee convoy, alien incursions, a pirate lord uprising. Events chain into the branching story (task 13) and change rep (task 2).
- **Player stake:** pick a side, broker a peace, or profit from the chaos. Your choices show in the news and the epilogue.
- Data-driven (JSON events + simple simulation tick) so new drama needs no new code. Keep the simulation cheap so it never costs Quest frames.
