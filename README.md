# Street Clash - seven-fighter warehouse brawler

Original 3D brawler inspired by the genre of classic arcade PC brawlers. All names and designs are original.

## Run
```
cd streetclash
npm install            # installs Three.js and Three.quarks
npm start              # local server on port 8123
```
Open http://localhost:8123 in Chrome or Edge.

Current development folder: `D:\Carl\Personal\Game\streetclash\streetclash\Repository\StreetClash`.
The earlier cutoff version has now been extended with four more supplied fighters,
matching weapons, environment props and the new mouse/number controls. See
[expanded roster and controls](docs/expanded-roster.md). See the [transfer record](docs/repository-update-2026-10-16.md)
for included/excluded work, dependency versions and effect customization.

Use Node.js 22 or newer. Run `npm test` for movement and animation regression tests.
See [Stage 5 verification](docs/stage5-verification.md) for the complete match, warehouse assets and checks. Earlier [Stage 4 verification](docs/stage4-verification.md) and [movement verification](docs/movement-verification.md) record the foundation work.

Choose **Enter the arena** for a 120-second 1v1 match. A three-second countdown gates combat. Win by knockout or higher remaining health when time expires; tied health is a draw. Results show damage, landed hits, health and elapsed fight time, with rematch and return-to-dock buttons. **Practice arena** retains the untimed test mode with optional AI.

Controls: WASD move, Shift walk, click the game to capture the mouse and look around, Esc releases it, wheel zooms, Q cycles graphics quality.
Choose Capoeira, Magician, Soldier, Archer, Great Sword, Axe or Mutant and a rival in the dock menu. Combat: LMB/J basic attack, RMB/L heavy, 1/E/K secondary, 2/3 skills, hold F block, Space evade, X jump, hold C crouch (Magic/Soldier), hold Z sprint. T toggles AI in practice, R restarts, F1 shows debug information. Enter starts a match from the dock/results screen. Match AI starts automatically; completed matches do not auto-respawn.

See [fighter integration and animation assignments](docs/fighter-integration.md) for per-character locomotion, attacks, fallbacks, asset preparation and browser checks. All seven supplied characters use prepared GLBs with dedicated animation sets; see the expanded-roster guide for the new assignments and shared fallbacks.

The [combat pacing pass](docs/combat-pacing.md) adds faster acceleration and combat movement, shorter recovery, buffered recovery dodges and committed ranged aim. Class balance remains provisional.

[Stage 6: class abilities and aiming](docs/class-abilities.md) introduced character skills (now on **2/3**, with the secondary attack on **1**), Capoeira's three-strike **J** chain, mouse-directed crosshair aiming, startup warning rings, hit confirmation and class-colored feedback. Click to capture the mouse; **Tab** target lock remains available.

Stage 4: **Tab** toggles target lock. WASD strafes/backpedals while locked; movement remains camera-relative. Attacks aim at the locked opponent; rolls follow movement input. **P** pauses/resumes, **M** toggles sound. Switching away from the game pauses and clears held inputs. Medium quality is the default; Q also adjusts particle budgets.

## Structure
- `index.html` – page, import map, HUD
- `src/main.js` – renderer, lights, floor, model loading, main loop
- `src/core/quality.js` – low/medium/high presets
- `src/characters/Character.js` – shared fighter wrapper (mixer, crossfade, speed-based idle/walk/run blend)
- `src/characters/Mover.js` – movement, acceleration, smooth turning and directional animation inputs
- `src/core/ThirdPersonCamera.js`, `src/core/input.js` – follow camera and input
- `assets/models/` – .glb files

## Combat and simulation
- `src/animation/AnimBank.js` – loads the Mixamo FBX clips and fits them to a model (cm -> model units, removes root motion)
- `src/combat/moves.js` – clip trims, animation strike windows, damage, knockback, speeds and hit thresholds
- `src/combat/Combatant.js` – health, state machine (free/attack/block/dodge/hit/down/getup/victory/dead), hit detection
- `src/combat/SparringAI.js`, `Bat.js`, `Effects.js` – test opponent, procedural bat, bounded instanced spark/trail/slam pool
- `src/core/FixedStep.js` – 60 Hz accumulator with bounded catch-up; rendering interpolates fighter transforms
- `src/physics/collision.js` – grounded capsules, swept box/body collisions, swept strike-vs-capsule tests and obstacle line of sight
- `src/combat/TargetLock.js` – acquisition, range/visibility checks, release and persistent target facing
- `src/core/WarehouseArena.js` – licensed factory models, PBR floor, original architecture/signage, shared palette materials and static mesh batching
- `src/game/Match.js` – lobby/countdown/active/ending/results/practice rules, timer, outcomes and statistics
- `src/physics/Navigator.js` – capsule-clearance visibility graph around cover, used by the AI
- `src/ui/game.css` – dock menu, match HUD, results and pause screens
- `src/core/TrainingArena.js` – retained Stage 4 scene, replaced by the warehouse in normal play
- `src/core/Sound.js` – synthesized Web Audio cues
- Attack phases are startup, active and recovery, driven by animation progress. Each timeline strike window can hit each victim once, shared across all hand/foot/bat markers. Startup/recovery motion is excluded from sweeps. Block, dodge, stagger, knockdown, get-up and death control when fighters can act.

## Assets and licenses
- Warehouse models: Kenney Factory Kit 3.0, CC0. Concrete diffuse/normal maps: eye-candy.xyz / Poly Haven, CC0. Original source links, file checksums and included licenses are in [the asset record](assets/ASSET-LICENSES.md).
- `Soldier.glb`, `Xbot.glb` – from the three.js examples (r160). Derived from Mixamo; Mixamo content is free to use in projects under Adobe's terms, but check them before redistributing the files on their own. **Stage 1 stand-ins, not final art.**
- `RobotExpressive.glb` – Tomás Laulhé, CC0 (via three.js examples). Not used yet.
- three.js – MIT.

## Known gaps
- The seven user-supplied fighters are integrated; their source licenses are recorded as unconfirmed in the asset record.
- Jump, directional locomotion, crouch (Magic/Soldier), sprint and class-specific attacks are implemented. Jump does not enable platform traversal.
- Combat is tuned for this two-fighter prototype. Further playtesting and class-specific balancing remain.
- The warehouse AI routes around static cover and chooses attacks, guarding and evasions. It is a single-opponent controller, not a squad or multi-level navigation system.
- Sound cues are synthesized placeholders. Further abilities and ranged-versus-melee balancing remain later-stage work.
- Geometry is statically batched and quality is adjustable; physical MX130 performance still needs a check on that laptop.
- The older shared `idle.fbx` fails to parse in the current FBX loader. Current fighters use their dedicated pack idles baked into the prepared GLBs.
