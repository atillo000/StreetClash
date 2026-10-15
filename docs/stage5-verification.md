# Stage 5 — Ironworks / Dock 09

Implemented and tested on 2026-10-15 in the existing JavaScript / Three.js project. No build system or new npm dependencies were added.

## Play

Run `npm start`, open http://localhost:8123 and refresh. Choose **Enter the arena** (or press Enter) for a 1v1 warehouse match. After the three-second countdown, the rival activates automatically.

- Knock out the rival within two minutes, or finish with the higher fraction of remaining health.
- Equal health at the time limit is a draw. The match ends without auto-respawning either fighter.
- Results show outcome, reason, both health totals, damage dealt/taken, landed hits and fight time.
- **Fight again** starts a clean countdown. **Return to dock** restores the lobby.
- **P** pauses the match and timer. The pause screen offers resume, restart and return. Losing focus also pauses.
- **R** restarts the current match through a new countdown; in practice it resets practice.
- **Practice arena** retains untimed play, with **T** toggling the AI. T cannot disable the opponent during a scored match.
- WASD, Shift, Tab lock-on, J punches, K/E kick, L bat, F guard, Space roll, M mute and Q quality retain their existing functions. F1 reports live AI behavior and rendering counts.

## Arena and assets

The warehouse replaces the training plane/crates in normal play. It includes a corrugated shell, structural columns and trusses, fluorescent housings, high windows, a loading shutter, cargo/pallet cover, machinery, control panels, conveyors, robot arms, hoppers, pipes, a crane and a raised background catwalk. Original signage and floor markings establish open central lanes and routes around cover.

Nineteen Kenney Factory Kit models are loaded from local GLBs, with one shared palette material. A Poly Haven concrete diffuse/normal pair supplies the floor surface. Sources, creators, CC0 records, the original Kenney license and verified texture checksums are in [the asset record](../assets/ASSET-LICENSES.md). Models/textures are bundled locally; gameplay makes no external asset requests.

Static scenery is merged by material and shadow setting into **15 batches**. The idle scene reports **18 draw calls and 75,182 triangles** in the tested Chrome session. This is renderer instrumentation, not an MX130 hardware performance benchmark. Medium quality remains the default.

## Match and AI implementation

- `src/game/Match.js`: rendering-independent lobby, countdown, active, ending, results and practice rules; timer, normalized-health timeout outcomes and combat statistics.
- `src/main.js`: gates gameplay while in menus/countdown/results, connects confirmed hit damage to match stats, resolves results after hit processing, preserves pause behavior, controls clean restart and presentation.
- `src/physics/Navigator.js`: precomputed visibility graph around obstacle corners inflated for capsule clearance. It projects wall/cover-adjacent endpoints, finds shortest clear routes and returns no path for disconnected regions.
- `src/combat/SparringAI.js`: replans routes toward moving targets, closes to useful strike range, chooses punch/kick, and sometimes guards or dodges incoming attacks. Behavior is visible in F1 diagnostics.
- `src/core/WarehouseArena.js`: local asset loading, geometry placement, measured cover bounds, camera blockers, material sharing and static batching. Missing warehouse files produce named loading errors and the retry overlay.
- `index.html`, `src/ui/game.css`: dock setup screen, match HUD, countdown/end banners, results and pause controls. Loading disables the start buttons until the models/animations/warehouse are ready.
- `scripts/serve.mjs`: serves CSS and image MIME types alongside ES modules and GLBs.

The fighter art and sound cues are still the existing prototype assets. This stage does not claim final character fidelity, class abilities or progression.

## Checks

**27 passing automated tests** (`npm test`): existing movement/animation/combat/physics/effects checks plus match state/outcome/reset tests, timeout comparisons, navigation clearance/disconnected routes, AI route following, GLB external-image completeness, included license checks and concrete-texture checksum verification. Syntax checks passed for the changed gameplay modules.

**18 passing Stage 5 Chrome browser checks** (`scripts/stage5-playtest.js`):

- Warehouse loading/batching and menu input gating.
- Real-time countdown preventing movement/attacks, followed by automatic AI and timer activation.
- Pause freezing the timer, and resume advancing it.
- Actual warehouse AI routing around cargo to approximately **0.95 m** fighting distance.
- A full combat victory with real models, clips, steering, guard, bat sweeps, damage and knockdowns. In the repeatable seeded AI run, the player won by knockout after **25.42 simulated seconds**, dealt **100 damage**, took **35 damage**, and finished at **65 HP**. No health values were edited in this victory scenario. The combat was stepped at 60 Hz inside the browser to accelerate verification; it was not a 25-second manual play session.
- Results presentation and clean rematch/countdown.
- Defeat from an actual AI strike on a deliberately low-health test player, followed by verification that the finished match does not respawn.
- Victory/defeat/draw timeout branches using a deliberately shortened test clock and controlled health totals.
- Return to dock, practice entry, and no runtime error overlay.

Earlier browser regression suites also passed in the new warehouse: **14** movement/input checks, **14** Stage 4 lock/collision/pause/quality/AI checks, and **six** real-asset combat scenarios.

```powershell
npm test
# With the local game open in a Chrome debugging session on port 9222:
node scripts/browser-check.mjs @scripts/stage5-playtest.js docs/stage5-lobby.png
node scripts/browser-check.mjs @scripts/playtest.js
node scripts/browser-check.mjs @scripts/stage4-playtest.js
node scripts/browser-check.mjs @scripts/stage4-combat.js
```

Screenshots: [dock menu](stage5-lobby.png), [warehouse gameplay](stage5-gameplay.png).

## Known limits and next stage

The arena uses stylized low-poly CC0 industrial props, original code-built architecture and a textured floor; it is not a reproduction of a proprietary map. Soldier/Xbot remain stand-in fighters. AI navigation covers static, grounded obstacles and one opponent; it does not handle dynamic level geometry or multi-level movement. Arena props are static rather than destructible. Sounds remain synthesized. Performance still needs checking on the user's physical MX130.

Stage 6 is distinct character abilities with matching animations, cooldowns, damage rules and individual visual effects. Additional archetypes, character selection and final character art remain later work.
