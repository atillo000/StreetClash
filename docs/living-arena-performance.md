# Living arena, FFA performance and 3D dragon

Updated 2026-10-28 in Repository/StreetClash. Builds on the minimal HUD/industrial presentation pass; no combat damage values, cooldowns, fixed-step simulation rate or network protocol were replaced.

## Controls

- Shift: sprint (either Shift key).
- Ctrl + WASD: walk (either Ctrl key); walking takes priority when both modifiers are held.
- LMB: basic/combo attack. RMB: heavy attack. Existing numbered skill bindings remain.
- Z is no longer the sprint key. The pause/control guide and host/guest input mapping use the new bindings.

Browsers can reserve Ctrl + W and related shortcuts. Pause > HUD & control guide > Fullscreen controls requests fullscreen and the Keyboard Lock API for WASD where supported. Leaving fullscreen releases the keyboard lock. This is optional; fullscreen/keyboard capture depends on browser support and permission. Existing crouch, guard and target-lock movement restrictions still apply.

## Environment

Crate clusters have irregular yaw; four additional individual crates/barrels and two piles of bent corrugated sheet metal break up the grid. Their colliders are measured with the placed props. Locations are fixed/asymmetric rather than regenerated every client load, keeping navigation and player-hosted matches consistent. Spawn pads and the stage approach remain clear.

One background building gently leans/breathes, and the two street phone booths gently sway. Other objects remain stationary. ArenaAmbience batches these three visual roots individually, limits their motion, preserves their original collision footprints and honours reduced-motion preferences. Theme changes also hide the street-only phone booths. This is visual animation, not a new soft-body physics simulation; Rapier remains in use for the existing physics.

Edit src/core/ArenaAmbience.js for motion, src/core/DistrictArena.js for placement and src/core/IndustrialSurfaces.js for sheet corrugation/bending.

Reference inspection: the supplied gameplay screenshots informed the irregular silhouettes and varied clutter. Published map notes also identify kiosks/phone booths as landmarks (https://store.steampowered.com/oldnews/8049). No proprietary game assets were imported. A complete gameplay video was not played during this pass.

## Actual performance problems fixed

- The Soldier GLB produced 264 skinned draw meshes for 46,297 triangles with two materials. SkinnedBatches joins only compatible index streams sharing parent, transforms, vertex attributes, rig/bind data and material. Animated mesh/morph targets are excluded. The Soldier now uses two skinned draw meshes, keeping all triangles, materials, bones, clips and sockets. Shared vertex arrays are not duplicated. This runs once while loading the template, before actor cloning.
- FFA previously rebuilt both standings and a hidden results table about 20 times/sec. Hidden standings now do no row work; visible row nodes are reused and reordered only when ranking changes. Results are created when shown. Health, kills/deaths and respawn countdown remain live.
- Ground palette colors are cached; only changed vertices are recolored. Exact incident-triangle normals update around the damaged region, matching a full Three.js normal rebuild. Steel/rivets update near that region, with one inverse transform per mesh instead of one per vertex. Conservative fixed bounds remove repeated bounds scans.
- Float32 height/burn values are rounded before comparison, preventing unchanged craters from repeatedly rebuilding normals and the Rapier heightfield throughout their stable lifetime.
- Compatible navigation graphs are shared by arena/radius/revision, character bone lookups are cached, and unchanged breakable transforms/colors no longer upload every fixed step.
- Auto quality now considers sustained frames slower than 250ms instead of discarding those samples. Manual quality choices remain available. Combat timing is unchanged.

## Actual 3D dragon

The old DragonApparition head was a view-facing Sprite. DragonVFX now uses a textured, rigged 1,262-triangle dragon mesh with procedural wing/jaw/tail motion. Its heading/pitch follow the actual projectile. Existing arcane trail particles remain separate. Material emissive detail uses the original texture, preserving scales/plates instead of washing the creature into a flat glowing silhouette. Familiar summons reuse small instances of the same rig.

The cosmetic mesh does not add damage. Existing swept projectile/hurt-capsule tests, first-wall collision, damage/status handling and lifetime remain authoritative. Edit src/combat/DragonVFX.js for mesh pose/color and src/combat/PowerMoves.js for the existing skill mapping. The Magician keeps its arcane class palette.

CC0 source: Cethiel's Dragon 3D, mesh/rig by Drummyfish and original design/texture by Cethiel (https://opengameart.org/content/cethiels-dragon-3d). The asset host was blocked by the local network, so the same CC0 mesh/texture came from the public distribution at https://github.com/Subject-314159/here-be-dragons/tree/main/blender_files . Only the CC0 asset files were used, not the repository's GPL game code. Its asset-specific LICENCE and source hashes are retained. Runtime GLB: 510,660 bytes; source archives and duplicate Collada/PNG files are not shipped. scripts/build.mjs includes the dragon folder; no build was generated here.

## Verification

Temporary browser checks passed for modifiers/mouse attacks, all 48 basic/heavy/skill/ultimate actions across eight heroes starting/recovering, dragon skeletal motion/textures/camera independence/travel/damage/expiry, all spawn pads, shared graph validity, selective/reduced motion and theme visibility, persistent FFA row nodes, K/D credit, respawn and results. Craters/steel/rubble restore automatically, with raised-stage height preserved; local normals matched full recomputation to less than 0.0001. Unchanged terrain does not increment the physics revision. Syntax and Git whitespace checks are run separately.

Testing uses isolated Chromium with software WebGL. Mesh counts and behavior were verified; these checks do not establish MX130 frame rate or certify every possible skill interaction. Live Supabase multiplayer was not exercised. No permanent test suite, screenshots or deployment build are retained for this pass.
