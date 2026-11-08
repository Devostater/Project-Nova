# ElevenLabs Audio & AI Podcast Production Guide — Nova News

This guide provides voice personas, ElevenLabs configuration parameters, and ready-to-record voiceover scripts for in-universe newsflashes, faction propaganda, and podcast episodes in *Project Nova*.

---

## 🎙️ ElevenLabs Voice Personas & Settings

Use the ElevenLabs Speech Synthesis panel or API with the recommended parameters below.

| Persona | Role & Tone | Voice Type / Archetype | Stability | Clarity / Sim. | Style Exag. |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Talia Vance** | Nova Net Lead Anchor; sharp, investigative, tense urgency | Professional News Anchor (e.g., *Rachel*, *Sarah*) | `0.55` | `0.80` | `0.30` |
| **Jax "Rust" Rawlins** | Cantina Veteran & Free Hauler; gravelly, cynical, weathered | Deep Gritty Male (e.g., *Adam*, *George*, *Marcus*) | `0.40` | `0.75` | `0.45` |
| **Cmdr. Sterling** | EDF High Command Spokesman; rigid, formal, cold military authority | Strict Military Officer (e.g., *Brian*, *Anthony*) | `0.70` | `0.85` | `0.15` |
| **Kallum Drake** | "Radio Corsair" Outlaw DJ; sardonic, charismatic, rebellious pirate | Smuggler / Pirate (e.g., *Callum*, *Charlie*) | `0.35` | `0.75` | `0.60` |
| **Nova-1 Station AI** | Municipal Automated Announcer; synthetic, calm despite crisis | Neutral Synthetic Female / Robotic | `0.85` | `0.90` | `0.00` |

---

## 🎚️ Cockpit & Comms Audio FX (Audacity / CapCut / DAW)

To make AI voices sound like authentic in-cockpit radio transmissions:
1. **EQ Bandpass**: Cut everything below `300 Hz` and above `3,600 Hz`.
2. **Mild Saturation / Overdrive**: Add 2–4% soft-clip distortion to simulate analog speaker cones.
3. **Cockpit Ambience**: Layer a quiet looping cockpit ambient track (`-24 dB`) behind the dialogue (low reactor hum, subtle thruster rumbles).
4. **Comms Chime**: Insert a short 0.1s radio squelch or beep before and after each transmission.

---

## 🎧 Script 1: AI Podcast — *"The Deep Cold Dispatch"* (Episode 01)
* **Show**: *The Deep Cold Dispatch*
* **Hosts**: Talia Vance (News Anchor) & Jax "Rust" Rawlins (Cantina Veteran)
* **Runtime**: ~2 minutes
* **Format**: Two-person conversational podcast / radio broadcast

```text
[SFX: Synth radio jingle, subtle ambient cantina hum in background]

TALIA VANCE:
(Urgent, measured)
Welcome back to The Deep Cold Dispatch, broadcasting across all neutral bands from Station Nova-1. I’m Talia Vance. If you're docked, check your thermal vents—system core temperatures just dropped another two degrees along the outer rim.

JAX RAWLINS:
(Chuckles grimly, gravelly voice)
Two degrees is being polite, Talia. Out by the asteroid belt, you can watch hydraulic fluid turn to slush in thirty seconds flat. If you don't have an active heat core sitting under your pilot seat, you're flying a coffin.

TALIA VANCE:
Which brings us to today's headline. The Earth Defense Fleet has officially established interdiction checkpoints at the Helios Jump Gate. All civilian haulers carrying class-three fusion batteries are being redirected into military storage under "Emergency Rationing Order 14."

JAX RAWLINS:
Rationing? Let's call it what it is: armed requisition. They're starving out the civilian mining outposts so their cruisers can keep their shield generators running hot. You try telling a family in Hab Pod 6 that their heaters are gone for "fleet readiness."

TALIA VANCE:
EDF Command claims pirate activity makes civilian core transport an unacceptable security risk. And to be fair, Corsair strike teams hit two fuel convoys in the Valkyrie sector just this morning.

JAX RAWLINS:
Because the Corsairs are freezing too! That’s the joke of this whole system, Vance. When the universe goes cold, everybody’s a pirate if it means keeping their cockpit warm for another week.

TALIA VANCE:
Speaking of anomalies... independent pilots are reporting strange electromagnetic signatures near the dormant derelicts in Sector 9. Jax, some are calling them 'Clankers'—autonomous alien swarms waking up to feed on energy leaks.

JAX RAWLINS:
(Pauses, voice drops lower)
I saw the sensor logs, Talia. Those aren't human salvage beacons. Whatever is out there in the dark, it doesn't need heat like we do. But it sure as hell knows we have it. If you're flying past the perimeter, keep your target scanners hot and your finger on the warp drive.

TALIA VANCE:
Watch your vectors, pilots. Every delivery has a destination. Every choice has a cost. We'll be back after this sector beacon report.

[SFX: Radio comms chirp and fade out]
```

---

## 🏴‍☠️ Script 2: Pirate Broadcast — *"Radio Free Corsair"* (Episode 04)
* **Broadcaster**: Kallum Drake
* **Tone**: Cocky, pirate radio swagger, defiant
* **Runtime**: ~50 seconds

```text
[SFX: Radio static tuning in, heavy rhythmic synth bass]

KALLUM DRAKE:
(Fast, confident, sarcastic)
Testing, testing... coming at you live from somewhere the EDF radar boys can't see! This is Kallum Drake on Radio Free Corsair, the only station in the system that doesn't charge you thirty thousand credits to keep your toes from frostbite.

Listen up, freehaulers. High Command put three gunboats on the north lane of the asteroid ring. They say they’re inspecting cargo for "dangerous fusion isotopes." Translation: they want your heat core for their admiral's private quarters. 

Don't give 'em the satisfaction. Break your vector before beacon nine, hug the iron asteroids, and slip in through the old clanker graveyard. And if you've got heat cores you want to trade for cold, hard credits, the docks at Corsair Reef are always warm. 

Fly fast, shoot straight, and never let 'em see you shiver. Drake out.

[SFX: Burst of thruster distortion, sharp squelch cuts feed]
```

---

## 🚨 Script 3: Breaking Newsflashes (20–30s Quick Bites)

### Newsflash A: EDF Emergency Interdiction Order
* **Speaker**: Commander Sterling (EDF High Command)
* **Tone**: Stern, clipped, authoritative military announcement

> `[SFX: Two-tone military priority klaxon]`  
> *"Attention all vessels in Sector 2. By order of Coalition High Command, martial curfew is in effect around all orbital fuel repositories. Unidentified vessels approaching within five kilometers of government heat silos will be designated hostile and engaged without warning. Transmit your identity transponder immediately. Humanity endures through order."*  
> `[SFX: Klaxon stops, static cuts]`

---

### Newsflash B: Nova-1 Municipal Life Support Bulletin
* **Speaker**: Nova-1 Station Automated Announcer
* **Tone**: Polite, calm, slightly eerie synthetic delivery

> `[SFX: Soft elevator-style chime]`  
> *"Station advisory: Core containment reservoir B has reached forty percent capacity. In accordance with municipal protocol, heating in Promenade Levels 3 and 4 will be reduced between cycles twelve and sixteen. Patrons are advised to wear thermal pressure suits in unsealed corridors. Nova-1 thanks you for your conservation."*  
> `[SFX: Chime outro]`

---

## 📝 Subtitle Integration Format (`.vtt`)

When uploading generated MP3 files into `public/news/audio/`, create a corresponding WebVTT caption file in `public/news/audio/` so Project Nova's cockpit subtitle engine can display synchronized text:

Example (`public/news/audio/newsflash_edf_01.vtt`):
```webvtt
WEBVTT

00:00.500 --> 00:04.200
Attention all vessels in Sector 2. Martial curfew is in effect.

00:04.500 --> 00:09.800
Unidentified ships approaching within 5 km of heat silos will be engaged.

00:10.000 --> 00:14.500
Transmit identity transponder immediately. Humanity endures through order.
```
