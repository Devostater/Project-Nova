# Owner features — Project Nova

Collected 2026-11-07 from available owner chats, Claude's owner-playtest briefs, the owner-approved shop/carrier implementation plan, and repository sections explicitly recording owner decisions. Quoted phrases retain the owner's wording. **Done** means implemented/merged or reported complete, not necessarily Quest-verified. **Partial** means a foundation exists but the whole request is not established as complete. **Wanted** means completion is not verified. Roadmap-only design details and unapproved names are not presented as owner decisions.

## Flight, controls and comfort

- **Done —** “Make hand and controller models stay parented to / follow cameraRig during autopilot, docking tractor and warp.” Implemented in eca8233/b2d277e; Quest verification remains appropriate.
- **Done —** “grabbing the stick/throttle no longer fits the meshes”: align grab anchors and halos with the current models; hand snaps to the model's grip point and stays while held (b2d277e).
- **Done —** “stick L/R = ROLL”; stick F/B = pitch; throttle F/B = speed; throttle L/R slide = YAW / side thrusters; keep gamepad and desktop working (b2d277e).
- **Done —** Arcade flight: auto-level, slight yaw mixed into roll, gentle curves; Advanced flight: no assists, full rates (b2d277e).
- **Done —** “FLIGHT MODEL” section in SYSTEM / OPTIONS with two big VR-friendly ARCADE / ADVANCED tiles and a short description each; default Arcade, persist `NOPT.o.flightMode` through `noptSave()`, toast on change, retain deadzone and graphics controls (980831d).
- **Done —** Hand-only 30-degree snap turn in VR and MR passthrough: deliberate sideways-palm pinch plus two small floating L/R buttons near the left wrist, tapped by the other index finger; never while gripping stick/throttle (eca8233/b2d277e).
- **Done —** “Wristwatch beacon and the L/R snap buttons are too touchy”: require deliberate dwell around 0.25 seconds or pinch, debounce, and release before another press (b2d277e).
- **Done —** “player resetting thier headset is backwards”: recenter faces cockpit-front, accounts for rig/headset yaw and the 180-degree case (d281840, following d6c7b66).
- **Done —** Hand tracking must work when switching controllers to hands mid-session; request the hand-tracking XR feature, bind current input sources correctly, retain controllers (d6c7b66).
- **Partial —** “player max speed feels low, check and see if its upgradable”: propulsion upgrades exist; the owner's desired final speed/feel still needs playtest confirmation.
- **Wanted / completion unverified —** “the world needs more space in it. can you expand the universe size?” Preserve meaningful distances and room for flight rather than only adding destinations.

## Docking and arrival

- **Done —** DOCK uses the currently SELECTED dockable station or ship, “any station, not only Nova-1”; fall back to Nova-1 only when nothing dockable is selected; toast names the destination (b2d277e).
- **Done / playtest pending —** Smooth docking approach with clear HUD guidance, working in 2D and VR; preserve tractor landing and cantina entry (A1 docking work, reported merged/live as 4c910b8).
- **Historical request; partly superseded —** AUTO-DOCK first press lights a station approach corridor under manual control; second press engages tractor; flying near the port must not silently trigger capture; out of range displays a message without silently starting autopilot. Older approved plan made this specific button Nova-1-only. The newer selected-target DOCK request supersedes that destination rule; retain this history so it is not mistaken for a second current destination policy.
- **Wanted / partial —** “Every station needs a dock and a place to relax/manage services.” Nova-1 has a cantina and other contacts support alongside docking; a furnished social/services space at every station is not confirmed complete (OWNER_QUESTIONS.md D1).

## Ship shop, upgrades and progression

- **Partial —** “a shop/upgrade menu that makes sense”: combine separate upgrade and hangar boards into one station shop, with one shared state behind VR displays and desktop access.
- **Partial —** “3 tiered game story acts”: use Act I: Corsair Line, Act II: The Admiral, Act III: Mind Space; retain the existing campaign progress.
- **Partial —** Five upgrade tiers: Act I opens 1–2, Act II opens 3–4, Act III opens 5; preserve existing upgrade effects and costs where possible; propulsion adds 10% thrust per tier (approved implementation plan).
- **Partial —** “gated by player level + rank or standing missions etc. some upgrades would be different, esp max tier”: gate later upgrades and ships by act completion, pilot level/rank and relevant faction standing or contract completion; show every missing requirement on its shop card.
- **Partial —** “Add more ships too”; approved scope: “Add 2 ships to the current 3.” Keep Nova Starfighter, Orion Frigate and Aegis Carrier; add fast/lightly armored Kestrel Scout and heavier Vanguard Gunship, preserving original IDs/costs and ownership.
- **Partial —** Frigate opens in Act II, Carrier in Act III; Scout and Gunship through Act II progression, with distinct ship roles and stats (approved implementation plan).
- **Partial —** “3 ships to buy with different cockpit layouts ets”: compact Fighter/Scout cockpits, wider Frigate command bridge, combat-focused Gunship cockpit, Carrier bridge plus walkable hangar; expose controls appropriate to each role.
- **Partial —** Preserve credits, owned ships, upgrade levels and campaign progress; persist new ownership/upgrades using existing saves with safe defaults for old saves. Save/load infrastructure exists; full feature coverage needs verification.

## Carrier, fleet and crew

- **Partial —** “fighter is just cockpit. a small ship would be cool, but a carrier I want to walk around in and launch my fighter from it etc”: walkable Carrier interior and fighter launch bay; leave bridge, walk to hangar, launch the owned fighter, return, recover and re-enter the Carrier. Carrier stays at its launch location during the sortie (approved plan).
- **Wanted / partial —** Recruit crew and fly with an owned fleet, eventually buy a carrier and dispatch pilots on missions from it (OWNER_QUESTIONS.md D2). Existing buyable ships/wing features do not establish the complete recruited-crew/dispatch loop.
- **Wanted / partial —** Cantina incidents are allowed; conversations can use basic dialogue choices, with “the crew network as the main purpose” of social spaces (OWNER_QUESTIONS.md D1). Existing companion dialogue is a foundation, not proof of complete crew recruitment/network gameplay.

## Cantina, walking and physical props

- **Partial —** “a walking with hands vr tracking controller like quest home”: expand cantina into a walkable station hub containing ship shop, upgrade stations and hangar access.
- **Partial —** Room-scale movement + smooth thumbstick walking + pinch-to-aim-and-release teleport; visible tracked hands, direct touch/grab, controller ray/select and locomotion fallback; keep desktop shop access and flight usable (owner-approved plan).
- **Done —** Test bartender: load `models/alien_crew.glb`, behind the cantina bar facing the room, with slow idle bob/turn (c9f16b4).
- **Done —** 4–6 procedural glasses/cups on the bar (implemented as five): hand pinch or controller squeeze nearby grabs; release throws using recent hand velocity; gravity without a physics engine; fast floor/wall impact shatters, at most 40 shards, fade around two seconds, bar respawn around five seconds; hands/controllers in VR/MR (c9f16b4).
- **Done —** “cups face away when picked up”: retain grab-relative orientation using `offsetQ = handQ.inverse * cupQ`, then `cupQ = handQ * offsetQ` while held (980831d).

## Salvage, FPS combat, boarding and morality

These requests are explicitly recorded as owner decisions in FPS_PLAN.md; detailed tuning below follows that approved record rather than a new proposal.

- **Partial —** Destroyed ships can drop salvage and rare valuable heat cores: select a pod, then press TRACTOR next to DOCK within 500 m; beam pulls it in over 2–3 seconds; out of range says “MOVE CLOSER”. Salvage/heat-core flow exists; confirm all targeting and cargo cases.
- **Partial —** Salvage pods drift, blink and appear in radar, holo-radar and COMMS as grey salvage rather than red/green threats; 1–3 pods, maximum eight, 120-second lifetime; fighter/frigate-carrier/boss drop chances recorded as 25%/60%/100%.
- **Partial —** Salvage contents: cargo salvage, heat cores, credits, ore, missiles, flares or shield caps, subject to cargo capacity.
- **Partial —** Hands-first first-person VR laser combat, with controllers, 2D and gamepad retained; gun sticks to right hand in weapons mode.
- **Partial —** Auto-fire when aimed at an enemy, narrow aim cone around four degrees and weapon fire-rate limit; never auto-fire at crew/allies/salvage or while fisted/pinching; show the target aim reticle.
- **Partial —** Right pinch toggles gun/empty hand; left pinch cycles weapons; empty-hand pinch/grab uses or picks up objects; Quest trigger/grip, mouse/keyboard and gamepad equivalents remain available.
- **Partial —** Left-fist virtual joystick: thumb-up closed fist anchors movement, displacement sets direction and speed, open hand stops. “Smooth movement is the default”; offer vignette, snap/smooth turning, speed slider and teleport fallback.
- **Partial —** Laser pistol, rifle and scatter blaster; visible slow enemy bolts that can be dodged/leaned around; staged enemy roster including drones, humanoids, heavier enemies and captain boss. Basic gun/drone modules exist; complete roster/weapon coverage is unverified.
- **Partial —** Player health/shield, damage feedback and evacuation at zero HP; keep the ship but lose boarding loot. Basic FPS health/exit flow exists; verify all death consequences.
- **Wanted / partial —** Large pirate boarding: about 15 minutes of running and gunning; disable frigate-class-and-up below 20% hull with shields down for 90 seconds, dock alongside, BOARD, then airlock → corridors/crew quarters → cargo-cover fight → engineering fusion core → captain's bridge, with checkpoints.
- **Wanted / partial —** Boarding finale: salvage ship/core/cargo or set self-destruct and escape to airlock against a timer, then watch the explosion from cockpit. Smaller derelicts reuse one or two sections for about three minutes. Do not treat the separately labelled “spare the crew” proposal as approved automatically.
- **Partial —** Morality meter from −100 to +100 in FLIGHT RECORD and player stats, with change history; retain Code of the Nova, crew affinity and pirate standing; persist morality in saves. Morality module exists; verify all planned choices feed it.
- **Done foundation; further polish wanted —** Firing range and debug entries so the owner can test the combat feel early on Quest; existing range/FPS modules are present.

## World, story, news and presentation

- **Established direction —** “Humanity is growing colder. Heat cores and fusion cores are sought after across the system.” Keep this as the story/loot anchor; who hunts cores and why the system cools remains open (FPS_PLAN.md).
- **Done review pass; ongoing direction —** “check the skybox textures and add laser impact vfx, check companion / story and goals for star sim feeling /vibes.” A skybox/impact/story pass was delivered; continue matching that space-sim tone rather than treating a review as all future story content finished.
- **Wanted / partial —** Interactive in-universe news: name is flexible; scrollable event-driven articles must give the player opportunities to respond before negative consequences (OWNER_QUESTIONS.md Q14). ROADMAP.md describes the proposed NOVA NET implementation; its invented faction names and exact deadlines are not owner-confirmed requirements.
- **Wanted / partial —** Create the game's own intro and epilogue; owner has no finished videos to provide. Local, skippable, captioned playback and an in-engine fallback (OWNER_QUESTIONS.md Q12). Existing cinematic/replay code is a foundation; completed packaged videos are not verified.
- **Documented expansion direction; approval scope needs care —** ROADMAP.md retains territory/faction pressure, living traffic, anomalies, carriers/large ships, news-response consequences, station social spaces and fleet dispatch. Preserve this backlog for review; do not promote its exact faction names, sector counts, offline catch-up limits or proposed mission details into the owner's own words without confirmation.

## Graphics, missiles and MR

- **Done —** “Lasers still show a silhouette in MR passthrough”: bolts, glows, sprites and trails use CustomBlending with RGB One/One and alpha Zero/One, transparent, no depth writes; add light without changing passthrough alpha (b2d277e). Earlier additive-only fix eca8233 was insufficient on headset.
- **Done foundation; ongoing target —** Better enemy missiles, missile trails/plumes, engine glow and explosions; MAX / ULTRA / storefront-quality close-up visuals, retaining Quest low tier without reducing the intended ULTRA presentation (FPS_PLAN.md, AI_QUEUE.md).
- **Done —** Missile arming “too touchy”: FIRE never arms missiles; arm only through dedicated ARM control with deliberate press/short hold around 0.4 seconds and debounce (d6c7b66).
- **Wanted / status unverified from available older turns —** Remove unwanted lines during warp; recorded as the task “Remove lines during warp”. Do not assume the later warp-art improvements alone prove this specific playtest complaint resolved.

## Platforms, builds and collaboration

- **Done foundation —** Meta Quest 3 support, browser and standalone application formats; 2D/desktop, tablet, gamepad, VR and optional MR passthrough remain supported. Preserve the original cockpit build rather than discarding older versions (PROJECT_NOVA_CONTEXT.md).
- **Done foundation —** Local hosting as an option (“can i host it local?”), with HTTPS for WebXR; maintain hosted Pages access and Quest APK build/install/launch workflow. APK installation has been reported successful; each new build still needs an awake-headset launch check.
- **Done —** Keep the Quest build project in repository `android/`, not a temporary folder, with build/sign/install tooling and local signing/build outputs ignored; apply the updated app icon (earlier build/install briefs).
- **Done process foundation —** “i want the AI tools I use that are in the github update what they are working on/what they are doing/ left off so I can transfer between AI and they not overdide each others code. CLAUDE is primary AI for now”: shared status/handoff records, explicit ownership and coordination across AIs; owner decides the lead.
- **Wanted / tool integration status unverified —** “i want chat gtp to call studio”: enable collaboration with Google AI Studio/Gemini for the project. This is a tooling request, not permission to embed credentials in game files or docs.
- **Done reference foundation —** “update github with Mind space / matrix / zero horizone music (wich is now Absolute Zero Interactive or AZI) so AI can use for reference when generating prompts etc”: retain AZI, Mind Space and Matrix reference documents; do not assume all separate-property ideas are Project Nova features.

## Source and status boundaries

Sources consulted: this chat's owner-playtest briefs and explicit merge confirmations; retrieved chats “Find IDE next steps on GitHub”, “Review skybox and add laser impact VFX”, “Remove lines during warp”, “Project Nova GTP”, and “Update Github Reference Data”; FPS_PLAN.md owner-decision sections; OWNER_QUESTIONS.md Decided; PROJECT_NOVA_CONTEXT.md confirmed direction; ROADMAP.md for separately labelled expansion context. Some older chat history was unavailable through retrieval. This list records all requests recovered from those sources; it does not invent wording for unavailable messages. Earlier file status tables can be stale, so unverified larger features stay Partial/Wanted even where prototypes exist. No new game changes or commitments are implied by this inventory.

## Playtest 2026-11-07 (evening): fixes and handoff

| # | Owner note | Status | Who |
|---|---|---|---|
| 1 | FPS gun faces the wrong way | **Done** (`claude/playtest-fixes-1`): the pistol was flipped 180°; now muzzle-forward on camera, controller and hand | Claude |
| 2 | Right side panel should be larger | **Done**: right console scale 1.0 → 1.22 | Claude |
| 3 | SYSTEM / OPTIONS buttons wide and thin, easy to mis-press | **Done**: 6 tall tiles (496×110) instead of 8 (496×80); 4 options per page | Claude |
| 4 | NEXT / BACK buttons too small | **Done**: 240×66 BACK / NEXT buttons with a page counter | Claude |
| 5 | Advanced flight doesn't change the flight; thrusters should yaw | **Wanted** → GPT (wrote the ARCADE/ADVANCED model in b2d277e). Check `NOPT.o.flightMode` is read every frame in the steering block, and in ADVANCED map throttle L/R slide (and gamepad/keys) to real yaw torque, not roll mix | GPT |
| 6 | Missile arming/firing broken in VR (works on PC) | **Wanted** → GPT. Trace `toggleMissileLid` / `fireHomingMissile` from the VR interactables (lid, `R EMERGENCY MISSILES`, console button) vs the desktop path; likely the XR press never reaches the arm state or the lid hit-mesh is hidden/not registered | GPT |
| 7 | Autopilot floats past the target instead of stopping | **Done**: aims at the target's world position, stand-off = target size + 40 m, brakes on speed | Claude |
| 8 | DOCK docks at the station when it isn't the target | **Done**: DOCK needs a selected station/friendly ship, otherwise a toast tells you to pick one | Claude |
| 9 | Intro video uploaded but never played | **Done**: file moved to `public/video/intro.mp4` (it was inside a folder named `intro.mp4`) | Claude |
| 10 | Replace the mission button with PLAY INTRO; after the video, play the game | **Done**: menu ▶ PLAY INTRO plays the video then starts the game | Claude |
| 11 | Remove the other level and its watch button | **Done**: watch "SWITCH SECTOR LEVEL" → ▶ PLAY INTRO | Claude |

Owner questions still open: third-faction name/colours; who tends the Nova-1 bar; switch to seat_v2?
