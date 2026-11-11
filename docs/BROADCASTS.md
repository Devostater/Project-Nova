# Broadcasts and radio shows (owner-defined, 2026-11-10)

In-world shows the player can tune into (MUSIC / radio, NOVA NET) and see advertised on the floating billboards (`modules/space_ads.js`, `art/ads/`).

| Show | Host / voice | Tone | Content | Billboard |
|---|---|---|---|---|
| **The Drift Report** (77.7, pirate radio, audio only) | **Orin "Subspace" Rook**: raspy-voiced veteran spacer | Gritty, conspiratorial, wry | Black-market intel, bounty updates, warnings about corporate fleet movements | `ad_drift.jpg` (Lantern, Pirate Reef, Graveyard) |
| **The Beacon** | Neutral automated/announcer voice | Purely factual, no commentary | Shipping, space weather and hazard reports | — (to make) |
| **Subspace Ledger** | Dry ledger voice | No commentary | Bounties, trade routes, faction territory shifts | — (to make) |

## Hooks for the systems
- **The Drift Report** reacts to the black market (task 21), bounties, and faction fleet movements (task 20). Orin can leak a contact's coordinates that unlock a galaxy-map system (task 23 discovery).
- **The Beacon** reads live hazards: asteroid fields, mines, ion storms, pirate activity near lanes; it should warn before the player warps into danger.
- **Subspace Ledger** mirrors the galaxy map's territory colours and open bounties: a factual list the player can act on.
- Voices: generate with ElevenLabs (see `news/audio/ELEVENLABS_GUIDE_AND_SCRIPTS.md`); Orin needs a raspy older male voice.

## How the shows play (Alpha 1.6) — `modules/radio.js`
- Tune on the **MUSIC** panel: STN ◀ / ▶ goes past the music stations to **THE DRIFT REPORT 77.7**, **THE BEACON 101.1** and **SUBSPACE LEDGER 88.4**. Music stops while a show is on; the MUSIC button (or any music station) goes back.
- PLAY/PAUSE takes the show on and off air, NEXT / NEXT ITEM skips to the next bulletin, and touching a bulletin on the left replays it.
- Bulletins are built from live state: council laws and the motion on the floor, the Nova-1 raid timer, distances to the warp destinations, hull, prices with law multipliers. Written in-world lines fill the rest.
- Each line is spoken with the browser speech voice (if the device has one and MUTE RADIO is off) and shown as a subtitle toast and on the panel. No recorded voices yet: ElevenLabs voices for Orin are the next step.
- Events: `radioLine { channel, title, text }`. API: `window.novaRadio` (tune, toggle, skip, replay, state), `window.novaMusic.tune('drift' | 'beacon' | 'ledger')`.

## The Council Floor (politics channel) — `modules/politics.js`
- **Nova Accord Council** seats: Nova-1 Authority 3, Nova Defense Compact (EDF) 3, Ceres Mining Co-op 2, Meridian Combine 2, Civilian Network 2, Lantern Freeports 1. Red Wake pirates and the Veyran Assembly have no seats.
- Every 4–8 minutes of play a faction tables a **motion**; the vote closes after 3 minutes. Factions vote by their leanings; the player can **lobby** for or against with credits (each lobby moves one seat; cost rises with each push). Lobby from the COUNCIL panel in the galaxy map room (H) or with `[` / `]`.
- **Passed motions become laws** with real effects through `window.novaLaws`: heat-core sell price, bounty payouts, ore sell price, warp-core cost, pirate activity (hauler raids). A new law replaces an older one that touches the same effect.
- Results post to NOVA NET as "The Council Floor" articles and as a toast.
- Motions so far: Heat-Core Export Levy, Warm Worlds Subsidy, Red Wake Bounty Act, Patrol Budget Cuts, Patrol Surge Order, Free Lanes Charter, Core Fuel Rationing, Open Mining Rights.
- Next: council members as contacts, faction approval of the player, the Subspace Ledger reading laws and territory, elections.
