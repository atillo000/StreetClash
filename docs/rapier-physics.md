# Rapier integration

Dependency: @dimforge/rapier3d-compat 0.21.0 (Apache-2.0).
Official guide: https://rapier.rs/docs/user_guides/javascript/getting_started_js/

RapierPhysics.js owns the rigid-body world. It advances inside the existing
60 Hz fixed simulation; pausing freezes it. The compatibility module embeds
WASM and loads locally through index.html's import map. No bundler/CDN needed.
The production copy list includes the module and its license; no build was run.

WreckEffects fragments (wood, metal, stone, heavy rubble) get dynamic cuboid
colliders scaled to their visible geometry. They tumble, collide, bounce,
slide and sleep. CCD limits tunnelling. Low/medium/high allow 24/48/72 bodies.
Fragment expiry, quality reduction and match reset remove rigid bodies.
The instanced rendering and original fade/expiry durations are preserved.

Environment colliders mirror arena cover boxes, including breakables: broken
boxes disable their collider, reset restores them, settling boxes update their
bounds. Invisible boundary colliders keep fragments inside the arena.
A 72x72 heightfield follows the deformable ground (25 cm grid); it refreshes
only when the rendered ground changes. Sleeping debris wakes as it restores.

Fighters have one kinematic capsule each, resized for selected characters and
bosses. Dead/inactive actors disable their capsule; spawn/teleport snaps it.
Fighters push loose debris; debris does not affect character movement or HP.

The existing controller, hit windows, swept weapon/projectile hits, damage,
knockback, AI navigation and crate support settling remain authoritative.
This is a hybrid integration. Ragdoll deaths are disabled at the user's request;
every fighter uses its own Defeat animation. Character movement remains
controller driven. Rapier still handles debris. See status-and-companions.md.
Crates stay intact/static until broken; their pieces use Rapier. Tornado rock
accents and terrain rim slabs remain cosmetic. F1 shows Rapier/body statistics.

Tuning: RapierPhysics.setBudget for body caps; spawnFragment for friction,
restitution, damping and density; groundSteps for terrain sampling resolution.
WreckEffects.fragments retains initial fragment velocities and lifetime.
