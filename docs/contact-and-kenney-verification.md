# Weapon contact, locomotion and Kenney effects — 2026-10-16

Target repository: `D:\Carl\Personal\Game\streetclash\streetclash\Repository\StreetClash`.

## Changes

- Weapon grips now use palm sockets between the wrist and finger base. Baseline wrist mounting was 6–9 cm from these sockets. Full hand rotation is preserved; a supporting hand can guide rifles and swords without pulling the primary grip away.
- Soldier equips the CC0 Kenney Blaster Kit model `blaster-n`. Its palette is embedded in a deployment GLB. Bow, sword and axe retain their existing supplied models.
- Measured native strides drive animation cadence and contact phases. Native anatomical strafe labels are translated into the game's local coordinate convention. Reversed travelling cycles are corrected by calibration metadata.
- Sampled skinned sole vertices constrain the visual model near the floor during grounded locomotion. The correction updates attached skin bind matrices correctly and turns off for jumps and combat actions. It does not change capsule movement, jump arcs or damage timing.
- Four Kenney Particle Pack sprites provide sparks, arcane shapes, muzzle flashes and smoke. They share one atlas and the existing pooled Three.quarks renderer. Tune `COMBAT_VFX` in `src/combat/QuarksEffects.js`; there is no new runtime dependency.

## Verification

- 54 Node regression tests pass, including attached-skin world translation, airborne correction reset, strafe selection and distance-driven cadence.
- Browser `contact-playtest.js`: seven fighters × seven movement modes, palm alignment and sole height checks, plus seven jump checks. All pass. Sampled grounded soles remain within 0.8–5.5 cm of the arena floor; fast gaits retain limited flight clearance.
- `roster-playtest.js`: all 35 configured attacks and roster movement/jump checks pass.
- `fighter-match-playtest.js`: eight AI match pairings pass.
- `quarks-playtest.js`: live particles, one instanced batch, bounded budgets, pause and reset checks pass.
- `fighter-controls-playtest.js`: selection, crouch, jump, sprint, target lock and ability labels pass. The test waits for lobby pointer-lock release before holding its first key.
- `npm run build` succeeds (101.8 MB). Production smoke checks pass for all 22 runtime resources, including the embedded blaster, gait metadata and four particle images.
- Visually inspected Soldier and Archer lobby previews in Chrome. These are not an exhaustive pose-by-pose artistic review.

Repeat browser checks against a running local server and Chrome debugging port 9222 with `node scripts/browser-check.mjs @scripts/contact-playtest.js`. Raw stride sampling is available in `scripts/contact-audit.js`; feed its JSON result into `node scripts/build-gait-calibration.mjs <report.json>` after replacing character clips. Rebuild the embedded blaster with `node scripts/prepare-kenney-blaster.mjs`.

## Limits and physics scope

Ground correction is for the current flat arena, not terrain-aware foot IK. Travelling ginga and some stylized steps retain measurable foot sliding; fully planted feet would require clip cleanup or an IK layer. Palm-origin checks cannot prove every finger wraps every grip correctly in every attack pose.

Rapier is a rigid-body physics engine for gravity, collision response, joints and moving bodies. It could support pushed or thrown crates and physical debris. Ragdolls would additionally need body colliders, joints and animation transitions. Rapier does not retarget clips, align weapon grips or synchronize gait cadence. This update retains the current custom combat collision system.
