# Street Clash asset record

## User-supplied fighters and animation packs

The user supplied `characters/Capoeira Type Character.fbx`, `characters/Magic Type Character.fbx`, `characters/Soldier Type Character.fbx`, their corresponding animation packs, and the shared Boxing/locomotion animations. Creator, purchase terms and redistribution permissions were not supplied; these assets are not recorded as CC0. Confirm their original licenses before distributing a release containing them.

`characters/generated/{capoeira,magic,soldier}.glb` are optimized derivatives of those supplied assets. The adjacent JSON reports and `src/characters/FighterCatalog.js` record the animation sources. Original FBXs remain unchanged. The rifle prop is original procedural geometry in `src/combat/Rifle.js`. See `docs/fighter-integration.md` for preparation and animation assignments.

## Stage 5 warehouse assets (downloaded 2026-10-15)

### Kenney Factory Kit 3.0

- Creator: Kenney (https://kenney.nl)
- Official source: https://kenney.nl/assets/factory-kit
- Original download: https://kenney.nl/media/pages/assets/factory-kit/edaac9d4f6-1777639602/kenney_factory-kit_3.0.zip
- License: Creative Commons Zero / CC0 1.0 Universal.
- Included original license: `environment/factory/LICENSE.txt`.
- Local files: selected GLBs in `environment/factory/` and their shared `Textures/colormap.png`.
- Used for cargo boxes, machines, conveyor sections, robot arms, pipes, control panels, doors, catwalks, crane and safety props. Models are scaled/placed and their geometry is batched at runtime. The original colormap is shared across the kit.
- Unused selected kit models are retained for future detailing; the used model list is `MODEL_NAMES` in `src/core/WarehouseArena.js`.

### Concrete Floor — eye-candy.xyz / Poly Haven

- Creator: eye-candy.xyz, as credited on the official asset page.
- Official source: https://polyhaven.com/a/concrete_floor
- License: CC0, verified at https://polyhaven.com/license
- Local files: `textures/concrete-floor-diffuse.jpg` and `textures/concrete-floor-normal.jpg`.
- Downloaded the original 1K JPG diffuse and OpenGL normal maps via https://api.polyhaven.com/files/concrete_floor.
- Diffuse download: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor/concrete_floor_diff_1k.jpg
- Normal download: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor/concrete_floor_nor_gl_1k.jpg
- File MD5s verified against API metadata: diffuse `99b94da291a4f038fa6af93c3993cbec`; normal `d77c5c5de3f58adcb00f93caeb4c5a73`.

### Original project work

Warehouse layout, architecture, pallet assemblies, corrugated-wall texture, signage, floor markings, lights, menus, CSS, effects and synthesized sound are created in project code. No Brawl Busters files, logos, map layouts, characters or sounds were imported.

## Existing assets (before Stage 5)

The Soldier and Xbot GLBs and existing Mixamo FBX animations remain development stand-ins. Their provenance and existing redistribution limitations are recorded in README.md; they are not newly acquired CC0 assets. RobotExpressive is unused. Three.js is MIT licensed (see `node_modules/three/LICENSE`).

## Additional user-supplied roster assets

Archer, Great Sword, Axe and Mutant models and their animation packs, the long bow,
battle axe, great sword, old barrel and wooden crate were supplied locally by the
user. Original download URLs and licenses were not supplied. These files are not
labeled CC0 or CC-BY. File hashes and derived runtime copies are recorded in
[USER-ASSETS.json](USER-ASSETS.json). Existing source files are preserved.

Runtime character conversion, animation fitting and sword simplification are
documented in [the roster guide](../docs/expanded-roster.md). Three.quarks and
quarks.core are MIT licensed; their licenses are included in the deployment vendor
folders. meshoptimizer is an MIT-licensed development-only preparation tool.
