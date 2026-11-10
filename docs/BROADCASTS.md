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
