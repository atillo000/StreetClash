# Urban circuit presentation

The 2026-10-22 update keeps the nine supplied rigged fighters, weapon sockets,
dedicated clips, move definitions, input mapping and swept collision foundation.

## Look and materials

- `src/core/ArtDirection.js`: muted steel, concrete, oxidized red and restrained
  ochre palette; warm directional light and cool daylight fill. Character skin,
  armor, cloth textures and normal-map strength are preserved.
- `src/core/WarehouseArena.js`: existing compact, open court and edge clusters;
  textured concrete, crate stacks, brick service buildings, container ribs and
  steel drums. New objects join the static batches and collision/camera bounds.
- `src/ui/urban.css`: original hero-selection panels, local record board, combat
  panels, enemy nameplates, spawn warning and boss health display. F1 diagnostics
  remain separate. The lobby uses the actual selected fighter model.

Existing concrete maps and supplied wooden-crate/barrel assets are reused. The
only new downloaded asset is the 1K CC0 Brick Wall 001 diffuse from Poly Haven;
see `assets/ASSET-LICENSES.md`. No source character or animation GLBs were rebuilt.
The remaining factory machinery uses the existing low-poly geometry, with a
desaturated palette. This update does not turn those meshes into scanned assets.

## Encounters

Choose an encounter in the lobby:

- **Duel**: the selected rival, 120 seconds, existing knockout/health rules.
- **Gauntlet**: the selected rival, Parasite Zombie, then the Mutant boss. One
  player health pool and a 180-second total limit. Enemies arrive individually,
  after a three-second warning, at one of four authored open-court points farthest
  from the player. This is sequential bot combat, not multiplayer or free-for-all.
- **Boss hunt**: the existing Mutant/Creature Pack fighter, 420 health, 180 seconds.
  Existing AI, attack windows, hit reactions and effects handle combat.
- **Practice**: the chosen rival at ordinary health, without a scored result.

`src/game/ArenaCircuit.js` holds mode durations/rules, gauntlet order, spawn points,
boss health and scoring. It wraps match callbacks; the existing combat state
machine and individual move files are unchanged by this update.

Local score = damage dealt + 100 per knockout. A victory adds 500, three times
remaining player health, and twice remaining seconds. Scores are sorted together
with a mode label; modes have different difficulty and scores are not directly
equivalent. The eight highest results persist in this browser's localStorage
under `streetclash.circuit.scores.v1`; the menu displays the best five. Private
browsing or disabled storage allows play, but persistence may be unavailable.
There is no server leaderboard or online matchmaking.

## Verification

Checked in an isolated Chrome preview: startup, textures, all nine basic attacks,
duel outcomes, all three gauntlet encounters and warning transitions, time-limit
defeat, boss health/player defeat, restoring the selected rival for practice and
duels, and local score saving. A ten-second manually stepped combat simulation
confirmed eight hit events and one cast with finite positions and no runtime
error. This is a functional check, not a hardware frame-rate benchmark.

No production build or permanent test files were generated.

## Further free art resources

- [Poly Haven models and textures](https://polyhaven.com/): use grounded small
  industrial props and worn surfaces; the site's assets are CC0 under its
  [license](https://polyhaven.com/license).
- [Brick Wall 001](https://polyhaven.com/a/brick_wall_001) and
  [Concrete Floor](https://polyhaven.com/a/concrete_floor) are the actual materials
  used here. Keep future runtime maps small and preserve recorded attribution.

For greater realism, replacing the remaining simplified machinery silhouettes
with textured industrial props will have more impact than adding more color or
more particles. Keep those replacements in the established edge clusters.
