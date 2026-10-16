# Repository update: 7:42 AM cutoff plus Three.quarks

The destination for this update and future development is:
`D:\Carl\Personal\Game\streetclash\streetclash\Repository\StreetClash`.

## Cutoff reconstruction

Baseline: repository commit `51b27a7` (2026-10-15, 4:13 PM Manila).
The October 16, 2026 session patches from 7:33:41 through 7:40:40 AM
were replayed onto that baseline, up to the requested 7:42 AM Manila cutoff.
This recovers file contents rather than selecting current files by modification time.

Included: the three existing rigged fighters with their dedicated animation packs,
two skills each, Capoeira's three-strike chain, mouse aiming, over-shoulder camera,
startup warnings, hit confirmation, cooldown HUD, skill-aware AI and sound cues.
Earlier warehouse, movement and combat pacing work remains in the baseline.

Excluded: subsequent interchangeable Rocker/Brawler/Boxer/Firefighter/Battler classes,
procedural costume/body replacements, later weapon/character downloads, the later
effects implementation, vertical launch physics, and the later three-character
restoration patch. The reconstructed baseline already has the original three fighters.

## New work explicitly requested with this transfer

Three.quarks supplies cast flashes, hit bursts, magic projectile motes and area-cast
bursts. These complement the existing melee trails, slam particles, hit reactions
and knockback. Original presets are in `src/combat/QuarksEffects.js` (`COMBAT_VFX`).
Adjust count, lifetime, size, speed and emitter radius there. No external effect
art or post-cutoff asset downloads are needed; the glow texture is generated locally.

Dependencies are pinned to `three@0.165.0` and `three.quarks@0.15.0`; the latter
requires Three.js >=0.165.0. The lockfile also fixes its `quarks.core` dependency.
These versions preserve the existing WebGL/static-module setup. Both libraries are
MIT licensed; the static build includes their license files and ESM bundles.
Official reference: https://docs.quarks.art/docs/core-components/renderers

The extra VFX layer reuses 12 emitters and one material/batch. Its particle ceiling
follows Q quality (48/96/192), including bursts queued before a render frame. The
existing custom pool has its own matching ceiling. Pause freezes effects; match
reset clears both pools. Physical MX130 performance still needs on-device checking.

Tests are included in the repository. Runtime GLB checks do not require ignored
source FBXs; use `CHECK_FBX_SOURCES=1` to validate FBXs on the asset workstation.
The browser harness accepts `GAME_URL` for testing another local port.

## Verification

```powershell
npm ci
npm test
npm run build
npm start
node scripts/browser-check.mjs @scripts/abilities-playtest.js
node scripts/browser-check.mjs @scripts/quarks-playtest.js
```

The build vendors both Quarks modules for Vercel. No commit or push is part of
this transfer; review the repository diff before publishing.
