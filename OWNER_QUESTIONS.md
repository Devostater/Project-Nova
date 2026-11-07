# Owner Questions

Any AI working on Project Nova adds questions here instead of stopping to wait. **Keep working on a safe default** and say which default you chose. The owner answers in batches; answered questions move to **Decided**, and the AI that asked applies the answer.

How to add a question: append a row to **Open**, with the next number, your AI name, the card from `AI_QUEUE.md`, the question, the options, and the default you're using meanwhile.

## Open

| # | From | Card | Question | Options | Default in use |
|---|---|---|---|---|---|
| Q1 | Claude | A2 salvage | Salvage pods: keep the existing `container.glb` crate, or wait for a new salvage-pod model? | crate now / wait | crate now |
| Q2 | Claude | A3 explosions | Camera shake on nearby explosions: on in VR (some players get queasy), or only in 2D? | VR + 2D / 2D only / off | 2D only |
| Q3 | Claude | A4 modules | First module to build on the new loader: salvage (A2) or firing range (FPS M2)? | salvage / range | salvage |
| Q4 | Claude | music | More real MP3 tracks for NOVA-1 FM? If yes, drop them in `public/music/` and AUTO will use them | yes / no | no |
| Q5 | Claude | lore | Who hunts the heat cores, and why is the system cooling? | owner writes / AI proposes options | AI proposes options (labelled proposal) |
| Q6 | Claude | Lane B | Gemini art: upload all 17 images to the `gemini/lane-b-status` branch? | yes | waiting |
| Q9 | Codex | A13 morality | What score change and crew reaction should each fusion-core choice use? | owner values/lines / AI default | take −15 and leave +15, clamp −100…+100; emit a generic crew reaction event without inventing named dialogue |

## Decided

| # | Answer | Date |
|---|---|---|
| — | — | — |
