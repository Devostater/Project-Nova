# Project Nova Roadmap: Territories and the Long Cold

**Status:** A16 proposal for owner review. Nothing in this document is established canon.
**Design goal:** Give the sector a life beyond the active mission: factions compete for routes and stations over time, while the player discovers a connected space drama through contracts, comms, and visible changes in territory.

## Story anchor and faction proposals

The only established story anchor remains that humanity is growing colder and heat/fusion cores are sought after. Existing game labels such as the pirates, Nova-1, the Graveyard, and the Lantern should be preserved. The organizations and backstory below are proposals; confirm names against current game code before implementation.

| Proposed faction | Role and goal | What the player sees |
|---|---|---|
| Nova Defense Compact | Human core-world defense network trying to keep the Nova-1 route open | Patrols, escorts, distress calls, restricted military salvage |
| Lantern Freeports | Station operators, independent crews, and convoy families protecting trade access | Docking services, changing prices, civilian requests, crew contacts |
| Red Wake | Loose pirate coalition competing over salvage, heat cores, and toll routes | Ambushes, captured relays, raider-held wrecks, false transponders |
| Meridian Combine | Mining and shipping concern seeking control of heat-core supply | Mining sites, guarded haulers, contracts that trade access for influence |
| Veyran Assembly | A nonhuman border polity trying to contain human expansion into its cold frontier | Unknown signals, disputed survey zones, guarded crossings, uneasy ceasefires |

Use these as recognizable political actors, not simple good/evil teams. Individual captains, station councils, and crews can disagree with their faction's public policy. The player can cooperate with more than one side, but each choice should have a visible cost or benefit.

## Territory simulation

Represent the campaign area as a graph of 3 sectors and roughly 10–12 named locations: stations, relays, mining fields, convoy lanes, and salvage sites. A territory record needs an owner, influence/control value, supply state, and tags such as market, relay, heat-core, or border.

- Advance the world in coarse steps (for example, every 15 in-game minutes), never in the render loop.
- Let local supply, faction pressure, active patrols, and player mission outcomes move control gradually. A location changes hands only after a clear threshold and a broadcast warning.
- Persist a world seed, last simulation timestamp, territory records, and pending story events. On load, simulate bounded catch-up (default: up to 6 hours); never punish a player with unlimited offline losses.
- While away, simulate only a few legible actions: supply arrival, patrol shift, raid, or blockade. Resolve them deterministically from saved state and faction strength so the same save does not reroll its history each load.
- Keep territory changes independent from the player's selected objective and active target. Accumulate news for the next comms or station visit; do not seize controls with pop-ups or silently cancel a mission.
- Ownership changes local patrols, available contracts, docking access, and modest market conditions. Never delete cargo, purchased upgrades, a safe save, or a previously unlocked service without a clear warning and an alternate path.
- The first version should make no new 3D geometry or materials per frame. Update the territory map and holographic labels only when a territory record changes.

### Player influence

Mission choices should affect pressure without allowing one early choice to lock the player out of the story. Examples: escorting a convoy improves a location's supply; destroying a pirate relay weakens Red Wake reach; returning a heat core supports the Lantern; selling it to the Combine improves their resources but changes local tension.

Reputation and territory control are separate. A station can be held by a faction that distrusts the player, and a friendly contact can still help across a hostile border. Show both clearly in the map/COMMS briefing.

### Presentation

Use a territory layer on the system map, plus a short SECTOR UPDATE card in COMMS and station bulletins. Each update should state what changed, why it changed, and one player-facing consequence. Keep older events in a compact timeline/flight record. The 3D radar can show owner names only when the existing holographic-name option is enabled.

## Game-loop beats, anomalies, and living traffic

Build a repeatable rhythm so open flight has authored surprises without becoming a random encounter treadmill:

**Brief → depart → travel/scan → encounter or anomaly → resolve/choose → consequence → news/repair/resupply → next brief.**

An event director should select an authored beat from sector, territory pressure, campaign state, recent encounters, player readiness, and time since the last major event. Use quiet gaps deliberately. Cap major events and never interrupt docking, boarding choices, a cinematic, or an active mission objective. Give the pilot an early sensor clue and a clear choice to investigate, avoid, or return later.

Anomalies are optional discoveries with readable risk and payoff, not arbitrary damage traps. Proposed families include a gravitic shear that bends a route, a cold heat-core bloom that masks contacts, a fold scar with delayed sensor echoes, and a derelict signal that changes after a close scan. Each anomaly needs a clue, a safe disengage route, a distinct gameplay interaction, and a persistent record if solved. Keep anomaly names and any related history provisional until the owner approves them.

### Traffic and security heatmap

Give each sector deliberate traffic density:

- **Busy, secure routes:** frequent civilian and military ships, carrier groups, scheduled convoys, reliable services, and clearer transponder data.
- **Contested trade corridors:** haulers and escorts mixed with inspections, delays, false transponders, and occasional interdictions.
- **Low-security sectors:** fewer lawful ships and services, longer gaps between contacts, more pirate activity and salvage opportunities.

The heatmap should communicate estimated threat and confidence, not perfect omniscient knowledge. Patrols, trade routes, and pirate pressure follow territory and supply state; player actions can alter them. Use pooled ship actors and distance/visibility tiers for traffic so busy skies do not mean every distant ship is fully simulated.

### Carriers and large ships

Add large ships as visible moving landmarks that make routes feel inhabited: carriers with launch/recovery cycles, convoy haulers, patrol frigates, and faction flagships. Give each a simple strategic role in the territory model. The player should be able to identify one from range, track it on radar/comms, escort or intercept it, dock where appropriate, and board only a small number of authored ship classes.

Carrier gameplay targets: watch a launch, escort a wing, land/dock if the specific vessel supports it, defend a repair window, or board a disabled ship. Large ships must have readable approach lanes, no-go zones, and docking/tractor feedback. Keep capital ships uncommon enough that they remain events. Use existing high-detail models for close views and lower-cost distance representations without reducing the MAX/ULTRA close-up target.

### First-run intro and campaign epilogue

- On a new profile, play a short intro film before the first flight. Make it skippable from the start, captioned, safe to replay from the menu, and stored locally so first launch does not depend on a network request. Mark it seen only when it completes or the player skips it.
- The intro should establish the cold/heat-core crisis, the pilot's immediate assignment, and one unresolved signal or territorial flashpoint. Avoid explaining every faction.
- At the end of the campaign, play an epilogue film chosen from campaign state: territory outcomes, the Lantern supply decision, crew relationships, and morality. Keep the default film short, captioned, skippable, and replayable from the flight record.
- Deliver a locally packaged intro video for the first run and a campaign-state epilogue video at the end. Both must be captioned, skippable, replayable, and available offline. Keep an in-engine fallback for codec/decode failures; budget video codecs, file size, subtitles, and fallback stills.

### Interactive in-universe news network

Add a fictional broadcast service (working name: **NOVA NET**, not canon) as a news card that can be opened from the existing music/media panel. It should feel like a concise 24-hour news desk without copying CNN branding or implying real-world news.

- The feed reports simulated events already in the world: territory shifts, convoy arrivals, station bulletins, anomalies, carrier movements, and campaign outcomes.
- Headline selection opens a readable article/briefing with source, sector, event time, confidence, and known consequences. Let players view a map/contact, save a story, or accept a linked contract without forcing mission acceptance.
- Distinguish official dispatches, independent reporting, and faction statements; label claims and uncertainty so a false-flag plot is fair rather than arbitrary.
- Stories update after the event simulation resolves. Do not reveal hidden contacts or exact pirate positions before the pilot has a plausible source.
- Keep it usable in 2D, gamepad, touch, and Quest VR with large hit targets, captions, scroll/swipe and a one-action close/return path. It must not steal flight controls while closed.

## NOVA NET response loop

NOVA NET is the player's readable view into the territory simulation. It does not need a fixed final brand name yet. Its first implementation should prioritize function:

- A scrollable headline list presented like the existing music/media card, with large VR hit targets and controller/touch/keyboard navigation.
- Selecting a headline opens an article with source, location, time, confidence, involved factions, likely consequence, and available responses.
- Urgent stories may expose a response window measured in active play time. The timer pauses while the game is closed and while a cinematic or mandatory story choice is active.
- Response actions can set a route, accept a rescue/escort/intercept contract, contribute cargo or credits, send a fleet team, or ignore the story.
- Several warnings precede a deadline. Failure changes supply, territory pressure, traffic, prices, safety, or a named contact; it never deletes purchased ships or blocks the main campaign.
- Articles persist as resolved, prevented, failed, or superseded history, letting the player understand why the world changed.
- Faction statements can disagree, but the interface labels source and uncertainty. The system never reveals hidden pirate positions without an established intelligence source.

A news event record should contain an ID, headline, body, source, sector/location, severity, publication time, active-play deadline, response options, linked contacts/contracts, resolution state, and resulting world changes. The event director creates or updates records only at coarse simulation steps.

## Station docks and social spaces

Every station should provide a functional arrival loop: approach/dock, airlock or concourse, a place to pause, market/services, NOVA NET, contracts, and crew contacts. Build these from one modular station-social kit, then give each location different lighting, signs, faction emblems, NPC mix, music, prices, and one signature feature.

The first space is the Nova-1/Lantern-style cantina using the bar, booths, stools, glasses and bottles supplied by the owner. The existing alien pilot model serves as bartender initially. Later stations can reuse the same interaction framework:

- **Nova Defense station:** orderly ready room, security checkpoint, pilot recruitment.
- **Lantern Freeport:** crowded cantina, brokers, smugglers, mixed civilian crews.
- **Meridian facility:** corporate lounge, trade desk, industrial crew hiring.
- **Border station:** sparse rest area, survey crews, anomaly specialists.
- **Carrier:** mobile version with hangar, briefing area, crew network and dispatch board.

Small stations can use a compact dock/lounge rather than a full cantina. The common requirement is a believable place to leave the cockpit, check the network, talk to contacts and manage the fleet.

## Crew network and conversations

The crew network is the primary purpose of station social spaces. Conversations stay concise and choice-driven. Each recruit has a name, role, model/portrait, skill ratings, traits, faction/reputation requirements, loyalty, assignment, condition and short personal thread.

Initial recruit roles:

- Fighter pilot
- Engineer/repair specialist
- Gunner or weapons officer
- Scout/anomaly specialist
- Medic/rescue specialist
- Trader/logistics officer

Dialogue uses two or three meaningful choices rather than long trees: professional, empathetic, aggressive/risky, recruit, decline, or ask about work. Choices can affect loyalty, morality, faction reputation, price, mission knowledge or availability. Named contacts keep a small memory of important choices. Ambient patrons need only greetings, rumors and reactions to current news.

Recruitment sources include cantina contacts, rescued pilots, faction contracts, boarding survivors and NOVA NET stories. A recruit can join the active wing, staff a player ship, work aboard a carrier or remain in reserve. Standard difficulty allows injuries, recovery time and morale consequences; permanent crew death is disabled by default.

## Player fleet and carrier operations

The player begins with one ship and gradually builds a roster of pilots and owned craft. Fleet play has two connected layers:

1. **Active wing:** assign one or more recruited pilots to ships that launch with the player, follow basic commands, fight, retreat, dock and return.
2. **Strategic dispatch:** send a pilot/ship/team to a NOVA NET response, patrol, escort, trade, salvage, scouting or rescue assignment while the player continues flying.

Mission resolution uses saved deterministic inputs: pilot skills and traits, ship/loadout/condition, intelligence level, sector heat, faction support, mission approach and player preparation. Results can include success, partial success, cargo/credits, information, reputation, ship damage, injury, delay or a request for player rescue. Standard difficulty does not silently kill recruited crew or permanently destroy a purchased flagship.

A purchasable carrier is a later progression milestone and becomes a mobile station:

- Hangar and docking point for the player's craft
- Crew lounge and network terminal
- Mission briefing and dispatch board
- Repair, refuel, rearm and cargo storage
- Pilot quarters/roster management
- Launch and recovery sequences
- Defend, relocate or support territory operations

Carrier ownership requires a clear economic and story milestone so it feels earned. The carrier should initially support a small, readable roster rather than simulating hundreds of crew. Its pilots can be seen launching for assignments, and successful fleet work should appear in NOVA NET and territory changes.

## Studio-made intro and epilogue videos

The owner has no finished videos to upload, so Project Nova will create its own. Plan the sequences from in-engine scenes, owner-supplied models/emblems, generated or painted establishing frames, UI/news overlays, music and captions. Produce locally packaged WebM/MP4 assets when the edit is approved, with an in-engine fallback if video decoding fails.

The intro establishes the cold crisis, Nova-1, the pilot and the first unresolved event. The epilogue is assembled from a small set of approved outcome scenes covering territory, Lantern supply, crew/fleet state, carrier ownership and morality. Both remain skippable, captioned, replayable and available offline. Build the playback/save/replay system before final video production so temporary cuts can be replaced without code changes.

## Delivery slices for the expanded loop

1. **Station social prototype:** furnished first cantina, alien bartender, dock/airlock return, NOVA NET terminal and crew terminal.
2. **NOVA NET MVP:** scroll articles, inspect event, set route/accept response, active-play deadline and consequence.
3. **Crew network MVP:** recruit a pilot through simple dialogue, save the roster and assign them to one ship.
4. **Active wing:** launch with the recruited pilot, issue follow/attack/defend/return commands and recover safely.
5. **Fleet dispatch:** send one pilot to a simulated news response and receive a deterministic result/article.
6. **Station rollout:** reuse the dock/lounge kit with faction dressing and signature services at each station.
7. **Carrier progression:** purchase/earn a carrier, dock inside it, manage the roster and launch pilots on assignments.
8. **Cinematics:** create, encode and integrate the approved first-run intro and outcome-driven epilogue.

## Beta story arc: “The Quiet Front”

Six missions form one drama, while territory simulation continues between them. The missions are available in order but do not expire while the player is doing other work.

1. **The Narrow Lane** — A Lantern convoy arrives late through a Nova Defense checkpoint. Escort it, inspect its cargo, or trace its route. Establishes the shortage without declaring who caused it.
2. **Cold Ledger** — A heat-core shipment is missing from a Meridian claim. Find the hauler's black box in the Graveyard. Evidence can point to piracy, Combine diversion, or a staged transponder.
3. **False Colors** — Red Wake attacks a relay under another faction's code. Protect the relay, pursue the raiders, or recover their communications. The chosen evidence affects a later truce.
4. **The Border Goes Quiet** — The Veyran Assembly closes a survey corridor after repeated human incursions. Negotiate through a contact, fly a risky alternate route, or help evacuate an outpost.
5. **Lantern Vote** — With supplies low, the Lantern council must choose who can guarantee the route: defense patrols, Combine contracts, or local neutrality. The player's prior actions and returned heat-core choice change the vote, not whether the mission can continue.
6. **A War With No Front** — Resolve a coordinated blockade at a relay shared by all three sectors. Choose a limited operation, expose the false-flag campaign, or secure a route for one bloc. End with a changed territory map, a crew response, and an open hook for the next season.

Avoid a single correct ending. The conclusion should record which routes are open, which faction has influence, who controls the Lantern's supply, the player's reputation, and the morality choices already tracked by the game.

## Content expansion

Build the Beta roster around the existing ship set where possible. Four boardable ship types to target: disabled derelict, pirate raider, Meridian hauler, and border patrol frigate. Add a carrier and several large non-boardable capital ships as rare moving set pieces. Each boardable class needs a distinct reason, layout variation, one meaningful choice, and a safe return to flight.

For the 1.0 release, target three sectors, six linked missions, a persistent but bounded territory layer, faction-specific comms/contract text, an authored anomaly set, readable traffic/security heatmaps, capital-ship encounters, first-run intro and state-aware epilogue, and four boardable ship types. Prepare store materials only after a complete fresh-save playthrough and owner review.

## Implementation sequence

1. **A15 save/load:** persist the existing slice (heat cores, morality, salvage, Cold Run progress). Add versioned territory save fields only when the territory module is implemented.
2. **A16 owner review:** approve or revise factions, sector map, offline catch-up, anomaly cadence, intro/epilogue format, NOVA NET working name, traffic model, and the six-mission arc. This file is the deliverable for A16.
3. **Territory module proposal:** after approval, add a standalone public/modules/territory.js with deterministic coarse-step simulation, event log, save migration hooks, and a read-only API for the game UI. Mirror it under modules/; wire it in a separate lead-owned integration PR.
4. Add the event director, anomalies, and missions one at a time, with a readable cause and consequence for each. Add territory display to system map/COMMS without replacing active-target selection.
5. Add the first-run intro, state-aware epilogue, and interactive news card; all must be skippable/captioned and usable on each supported input device.
6. Add sector traffic schedules and carrier/large-ship behavior, beginning with pooled distant traffic and a few authored close encounters.
7. Verify a fresh save, a save loaded after a short absence, a save loaded after the catch-up cap, intro skip/replay, each ending, traffic density, anomaly resolution, and the news card in 2D, desktop gamepad, tablet, and Quest. Measure ULTRA and low-tier performance; keep MAX/ULTRA visuals intact.

## Owner decision defaults

- Faction names and history above are proposals; keep them labeled as such until approved.
- Default simulation: 15-minute coarse ticks, deterministic saved seed, maximum 6 hours offline catch-up.
- Default story: the six missions remain available and never fail from elapsed time; territory changes add pressure and alternate routes.
- Default consequences: services and patrols shift by territory, but purchased assets, cargo, and campaign access are not erased.
- NOVA NET deadlines use active play time and pause while the game is closed; unresolved events can create negative world consequences without cancelling the main story.
- Every station has a dock plus at least a compact social/service space built from a shared modular kit.
- Conversations are short choice scenes centered on recruitment, loyalty, contracts and crew/fleet management.
- Standard fleet missions can damage ships or injure crew, but permanent crew death and silent destruction of purchased flagships are disabled.
- Project Nova creates its own intro and epilogue videos; playback supports local video assets and an in-engine fallback.

## Full-release planning checklist

“AAA” is a quality and production ambition, not a practical promise of AAA content volume for a small team. Before locking 1.0 scope, define these as acceptance targets:

- **Player promise and audience:** a one-sentence pitch, target session length, 2D/desktop/Quest feature matrix, and the features that are explicitly out of scope.
- **Core feel:** flight tutorial, comfort presets, flight/combat/docking/boarding quality bars, fail/retry flow, and a satisfying loop even between authored missions.
- **Campaign and replay:** mission-state graph, branching consequences, companion and recruit roles, active wing/fleet assignments, carrier progression, faction reputation versus territory control, ending coverage, new save/continue/new game behavior, and spoiler-aware news unlocks.
- **World simulation:** three-sector route graph, event cadence, offline catch-up bounds, traffic budgets, economy/service rules, simulation determinism, and safe migration for old saves.
- **Content budget:** number of ships, carriers, station social variants, recruitable crew, boardable interiors, enemy types, anomalies, missions, dialogue lines, music cues, NOVA NET article templates, cinematics, and which assets can be reused without making encounters feel repeated.
- **Production pipeline:** asset ownership, naming/import standards, LOD/collision/VR scale checks, audio loudness, cinematic subtitle timing, localization source text, and review checkpoints.
- **UX/accessibility:** remapping, controller/HOTAS layouts, large VR targets, subtitles and speaker labels, color-blind-safe faction markers, motion/comfort options, pause/resume, skip/replay controls, and readable UI at cockpit distance.
- **Performance and reliability:** device-specific frame-time budgets, loading and memory budgets, pooled traffic/FX, offline operation, save corruption recovery, cache migration, reconnect/error states, and performance testing at MAX/ULTRA and low tier.
- **QA and release:** fresh-save and upgrade-save coverage; 2D, gamepad, HOTAS, tablet and Quest matrix; regression checklist; crash/error reporting with consent; store listing, capture footage, support page, privacy disclosures, and rollback build.
- **Risk and schedule:** identify the highest-risk prototypes first (VR news UI, carrier docking, offline territory simulation, cinematic asset size), time-box them, and cut optional scope before cutting save safety, controls, comfort, or performance.

Use milestone gates: **vertical slice** proves one polished route and mission; **Beta** proves all three sectors and the complete story path; **Release Candidate** proves save compatibility, performance, input coverage, subtitles/accessibility, and store compliance. Do not label a milestone “AAA complete” based only on feature count.
