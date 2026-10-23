# Arena destruction and surface-aware impacts

## What breaks

The existing 13 playable edge props are now independent destructibles:

| Object | Health | Debris |
| --- | --- | --- |
| Wooden crate / small cargo box | 36 | Wood pieces |
| Wooden barrel | 44 | Wood pieces |
| Steel drum | 64 | Metal fragments |

Direct damage buffs affect prop damage. Some heavy weapon attacks use a 1.25
environment multiplier; creature slams use 1.30. A 30-damage creature slam can
therefore break a crate in one hit. Props darken as they lose health.
Props do not award character buffs, lifesteal, combo damage statistics or kills.
Barrels/drums break without adding explosive damage to nearby fighters.

The arena boundaries, large containers, buildings and machinery remain solid.
They receive appropriate surface chips/impact sparks but cannot be removed.
The central combat area remains open; no random obstacles were added.

`WarehouseArena.js` registers each prop with its own health, model and box. The
old union boxes around entire storage clusters are no longer collision bodies.
Breaking a prop hides it and removes its box from both movement and camera/
projectile cover. Remaining stacked crates fall onto surviving support or the
floor, keeping model and collision bounds together. Reset restores original
positions, health, appearance and colliders. Full arena reset restores props;
gauntlet transitions preserve destruction within the current match.

Repeated crate/barrel/drum parts render in instanced batches while retaining
independent health and transforms. Bot navigation rebuilds its visibility graph
when destruction changes the obstacle revision. Original GLB assets are reused.

## How impacts choose a surface

| Attack/contact | Presentation |
| --- | --- |
| Creature ground slam | Actual depressed crater, split seams, raised slabs, flying rocks, dust and shockwave |
| Ground-directed magic pulse / strong floor blast | Scorched crater, large rubble and magical burst |
| Small magic bolt touching floor | Scorch and small fragments; no large excavation |
| Bullet or arrow hitting floor | Small chip/scuff, not a large crater |
| Projectile hitting a wall | A small mark aligned to that face and impact fragments |
| Heavy blade touching floor during active window | Local geometric crater and fractured concrete at the actual contact |
| High weapon swing / direct body hit | Existing contact/air effects; no invented floor crater |
| Airborne area attack | Air burst; no floor mark beneath an attack that did not land |
| Zombie shriek | Body-height energy burst; no structural damage |
| Breakable prop hit | Material fragments and wear; complete breakup at zero health |

Melee damage comes from the existing active-window weapon/limb sweep. One prop
can be damaged once per active window, even if several weapon markers touch it.
A multi-window combination can strike it again during a later window.

Projectiles resolve the nearest actual enemy/prop/wall/floor contact. An enemy in
front of cover absorbs the projectile before that cover; an intact crate blocks
an enemy behind it. The shot that destroys the crate is still consumed, while
subsequent shots can pass through the opening. Floor collisions account for
projectile radius. Expiring in mid-air does not create a ground impact.

The old rule that scattered floor debris on every heavy enemy hit was removed.
Ground marks follow the actual damaged floor height, including attacks just above it.
Air effects and direct body contacts retain their actual contact positions.

## Tuning

- `src/combat/EnvironmentMoves.js`: per-move environment behavior. This layer runs
  after combat loadouts, statuses and pacing.
- `src/combat/DestructibleProps.js`: prop damage, sweep/area cover checks,
  support settling, reset and surface dispatch.
- `src/core/DeformableGround.js`: shared rendered/collision heightfield, crater
  depth and radius, jagged rim, depressed radial seams, exposed aggregate shading
  and the 64-instance broken concrete slab pool.
- `src/core/WarehouseArena.js`: breakable registration, initial HP, authored
  placements and instanced render batches. Add a small prop through `prop()` and
  register its asset name as breakable; keep large boundaries fixed.
- `src/combat/WreckEffects.js`: procedural mark textures, radius, lifetime and
  pooled wood/metal/stone fragments.

Example:

```js
move.environment = {
  propDamage: 1.25,       // multiplier; zero means no structural damage
  groundContact: true,   // melee still must actually reach the floor
  groundStyle: 'crack',  // crack, scorch or chip
};
// Area moves can use surface: 'ground' or 'air'.
```

The combat deck is a single 144 × 144-cell heightfield (21,025 vertices).
Court color is part of this mesh, rather than a second overlapping floor. The
background apron leaves the combat deck open underneath, so it cannot fill holes.
Heavy floor impacts lower real vertices by roughly 0.48–0.86 m according to damage,
with jagged edges, narrow depressed radial fractures and a slightly raised lip.
These are walkable craters with a solid bottom, not bottomless pits or tunnels.
Repeated impacts modify the same fixed-size buffers; terrain persists until reset.

Movement, jumps, respawns, crosshair aiming and projectile floor sweeps use the
same triangle-interpolated height. Horizontal shots can strike rising crater walls.
Floor paint deforms with the mesh, and status rings, contact shadows and spawn/lock
markers use the current ground elevation. Crates sample their footprint for ground
support; surviving stacks still settle when lower props break. No physics engine
or combat timings were replaced.

Up to 64 solid-looking broken slabs remain around crater rims. Larger angular
rocks fly outward, bounce against the sampled floor and fade after nine seconds.
These debris/slab meshes are cosmetic and do not add character collision bodies;
the crater floor itself changes the playable surface. Wood and metal breakup
fragments retain their shorter lifetimes. Smaller chip/scorch marks remain pooled
and fade as before. Small magic bolts scorch; strong magic floor impacts excavate.
Airborne attacks, body hits and sonic shrieks do not invent ground holes.

Terrain paint is batched by material, and rocks/slabs are instanced. Pool sizes are
bounded; normal effect quality budgets still limit flying fragments. Reset clears
all terrain damage and wreckage; pause freezes effects. All geometry and textures
reuse existing assets or are generated procedurally; no new packages or downloads
are required.

## Validation

Browser simulation checked independent breakables, collision removal, falling
upper crates, restoration, real animated weapon damage, per-window deduplication,
projectiles breaking/clearing cover, nearest-contact ordering, bullet/magic floor
marks, timed creature slams, airborne/no-floor behavior, high swings, direct
body hits, bot navigation revision and bounded effect pools/expiry. These checks
passed after instancing the props. Additional crater simulation checks cover
rendered/collision height agreement, walking down/up crater walls, jumping from
below the old floor, projectiles reaching the bottom and striking the lip,
deformed floor paint, large debris settling, bounded repeated impacts and reset. Combat regression checks confirmed all nine
click chains and all 27 skills still deal damage. No production builds or
permanent test files were generated.
