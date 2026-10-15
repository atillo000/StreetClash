# Three-fighter integration

The supplied FBX characters are selectable in the dock menu, with a separate rival selector. Runtime loads the prepared, embedded-texture GLBs in `assets/characters/generated/`. The original FBXs and animation packs are retained unchanged.

## Animation selection

| Situation | Roda / Capoeira | Vesper / Magic | Rook / Soldier |
| --- | --- | --- | --- |
| Idle | Ginga variations; alternate ginga when locked | Standing idle; alternate while locked | Rifle idle; aiming idle while locked |
| Travel | Shared ordinary walk/run; ginga when locked | Pro Magic forward walk/run | Pro Rifle forward walk/run |
| Locked side/back movement | Corresponding travelling ginga | Pro Magic four directions | Pro Rifle eight directions, including diagonals |
| Sprint, hold Z | Faster shared running gait | Standing sprint forward | Rifle sprint forward |
| Crouch, hold C | Unavailable in this pack | Crouch transitions, idle and four directions | Crouched idle and eight directions |
| Jump, X | Shared jump | Standing/running jump and corresponding landing | Jump up, airborne loop and jump down |
| J / light | Meia lua de frente | One-handed arc bolt | Rifle shot |
| K / secondary | Bencao | Two-handed magic blast | Shared close kick; rifle stowed |
| L / heavy | Armada | Two-handed area pulse | Three-shot rifle burst |
| Guard, F | Shared block | Own start, hold, reaction and end | Shared block; rifle stowed |
| Evade, Space | Au cartwheel | Shared roll | Shared roll; rifle stowed |
| Hit/death | Shared reactions | Own directional reactions/deaths | Shared hits; own deaths where available |

Shared reactions, get-up, knockdown and victory clips come from `assets/animations/Boxing Animation/`. Shared ordinary locomotion comes from `assets/animations/locomotion/`. The catalog records every exact source path. Pro packs supply the complete directional sets; Lite and overlapping variants are retained as source assets rather than mixed into the gait arbitrarily. Shooter start/stop and firing clips supplement the Soldier Pro Rifle set. Idle fidgets cancel when movement resumes.

## Repairs and runtime behavior

- Consolidated duplicate Capoeira bones into one canonical rig before exporting, checking identical bind transforms. Same-class opponents receive independent skeletons and materials.
- Removed travelling root motion so the capsule controller owns horizontal displacement. Jump height belongs to physics; baked jump root translation is frozen to avoid doubling the jump.
- Closed the final 28% of non-looping travelling ginga takes into their first pose. The largest measured 60 Hz loop-boundary step fell from 0.95 m to 0.026 m for those clips. Corrected left/right mapping using the source clips' actual travel direction.
- Kept native backward/sideways animations; reversed generic running is a fallback only when no dedicated clip exists.
- Matched Capoeira foot hit windows to each kick. Magic projectiles, area pulse, rifle shot and burst release from animation progress; ranged damage requires collision or a visible target inside the pulse radius.
- Added pooled ranged effects/projectiles and a procedural rifle that follows the hand sockets and stows for incompatible poses.
- Converted materials, welded duplicated vertices, limited embedded textures to 1024 pixels and resampled animations at 30 fps. Three.js interpolates during the 60 Hz simulation. Prepared files total approximately 32.5 MB, compared with approximately 210 MB of character FBXs before animation files.

## Verification

Run `npm test` for existing regressions and generated asset/source checks. Browser scripts use the existing Chrome debugging harness, with the game open at `http://127.0.0.1:8123` and Chrome debugging port 9222:

```powershell
node scripts/browser-check.mjs @scripts/fighter-playtest.js
node scripts/browser-check.mjs @scripts/check-fighter-loops.js
node scripts/browser-check.mjs @scripts/fighter-controls-playtest.js
node scripts/browser-check.mjs @scripts/fighter-match-playtest.js
```

These check all nine attacks against real targets, guard, sprint, jump recovery, crouched backpedal, Soldier diagonal weights, independent rigs/materials, animation loop boundaries, keyboard controls, menu selection, complete seeded AI matches and rematches. Full match checks do not edit health. Older Stage 4/5 browser scenarios document the previous bat prototype and should not be used as class-balance expectations.

Balance remains provisional: seeded AI matches show ranged fighters strongly outperforming the melee AI. The test browser is not an MX130 performance measurement. Jumping does not add platform traversal; cover remains horizontally solid.

## Regenerating prepared assets

Preparation uses the local Three.js FBXLoader and GLTFExporter in Chrome, with no new runtime dependency. Start `node scripts/asset-prep-server.mjs` (temporary receiver on 8124), then for each id `capoeira`, `magic`, `soldier`, set `window.__prepareFighter` to the id through `scripts/browser-check.mjs` and evaluate `@scripts/prepare-user-fighter.js`. Stop the receiver when finished. The preparation script reads `__prepareFighter` (default Capoeira); the generated JSON records source paths, clip durations, bone counts and export size. Reload the game after regeneration.
