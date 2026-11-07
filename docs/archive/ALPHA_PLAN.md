# Project Nova: Plan to finish the Alpha

Goal: a polished **Alpha 2.0** demo on Quest 3 and PC that plays from menu to end card without help, at maximum graphics. Owner approves each milestone after a playtest; Claude (lead) integrates; GPT/Codex builds modules; Gemini makes art; the owner makes 3D models.

## Where we are (2026-11-07)

Done and in `main`: flight and combat (VR-paced), warp tunnel, salvage + tractor, heat cores, music stations, side panels that fill the glass, market with big rows, firing range, boarding, morality, the **Cold Run** mission end to end, owner models (ships, civilian traffic, missiles, clanker yard, containers), cantina furniture + poster, overhead DOCK, vertical sites, simpler WARP card.

In review: #52 asteroid boost, cantina room rebuild (this PR). GPT: #41 roster, #42 emblems, #43 save/load, #45 VR gloves, #46 NOVA NET, #47 cantina kit, #49 Quest APK.

## Milestones

### M1 · Merge and stabilise (next session)
- Claude reviews and merges GPT #41–#47 and #49 in order: #43 save/load → #41 roster → #42 emblems → #45 gloves → #46 NOVA NET → #47 cantina kit → #49 APK.
- Owner playtest of everything merged today; Claude fixes the notes.
- Tag `alpha-1.9`.

### M2 · Cantina and stations feel alive
- Cantina: new room (owner textures), bar, booths, stools, poster; next: bartender behind the bar, ambient crowd (alien crew models), sit-down at a booth, jukebox tied to the music stations.
- Every station gets a dock + a social space (from #37): Nova-1 cantina, the Lantern den, Clanker Yard workshop.
- Owner models wanted: bartender/alien patron (rigged), neon sign, holo table, stairs or balcony piece.
- Gemini: cantina neon signs and bottle-shelf decals; station-specific wall variants.

### M3 · A real campaign slice
- Cold Run polished: voice-style crew lines, briefing card, better reward screen.
- Mission 2 "The Quiet Front" opener from #37 (one new sector, one new enemy type).
- Third faction named by the owner; its cruiser becomes a faction ship with its own colours and emblem (#42).
- NOVA NET news reacts to the player's choices (#46).

### M4 · On-foot polish
- VR gloves (#45) with finger tracking; gun in the right hand, pinch to switch (A11 follow-up).
- Boarding: two more ship interiors from the owner's textures; enemy drones get the owner's models.
- Comfort options: snap/smooth turn, vignette.

### M5 · Graphics and world
- Max-graphics pass: asteroid boost (#52), more planets at 2048, nebula skybox, engine glows on all ships, station lighting.
- Vertical world: sector routes that climb and dive; warp map with height.
- Performance check on Quest only to confirm frame rate (owner reports judder; no cuts unless asked).

### M6 · Alpha 2.0 release
- Save/load covers everything (#43); offline APK for Quest (#49).
- `TESTING.md` full pass on PC, tablet, gamepad and Quest.
- Store-ready capture: trailer clips, key art (Gemini), feature list.
- Tag `alpha-2.0`.

## Who does what

| Lane | Next jobs |
|---|---|
| Claude (lead) | M1 merges, cantina life, mission 2 integration, playtest fixes |
| GPT/Codex | modules: bartender/crowd AI, mission 2 data, faction 3 module, comfort options |
| Gemini | cantina neon/decals, station wall variants, nebula skybox, key art |
| Owner | playtests, faction 3 name, rigged bartender/patron models, merges and tags |

## Owner questions (answer in `OWNER_QUESTIONS.md`)
1. Name and colours of the third faction (the green cruiser).
2. Who tends the Nova-1 bar: the droid, an alien pilot, or a new character?
3. Keep the old seat or switch to the new ejection seat (seat_v2)?
