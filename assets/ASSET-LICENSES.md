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

### Kenney combat kits (2026-10-16)

- Blaster Kit 2.1: `assets/Weapons/kenney/blaster-n.glb` and its palette were extracted from the supplied `kenney_blaster-kit_2.1.zip`. `blaster-n-runtime.glb` embeds that palette for deployment. Source: https://kenney.nl/assets/blaster-kit
- Particle Pack 1.1: `spark_01.png`, `magic_01.png`, `muzzle_01.png`, and `smoke_01.png` were extracted from the supplied `kenney_particle-pack.zip`. Source: https://kenney.nl/assets/particle-pack
- Both archives include Creative Commons Zero (CC0) licenses. The original license text is retained in each runtime asset directory as `License.txt`, including the particle pack's additional contributor credits.
- The Soldier uses the blaster; the four particle images form a shared runtime atlas for Three.quarks. Remaining archive contents are not loaded or deployed.

Archer, Great Sword, Axe and Mutant models and their animation packs, the long bow,
battle axe, great sword, old barrel and wooden crate were supplied locally by the
user. Original download URLs and licenses were not supplied. These files are not
labeled CC0 or CC-BY. File hashes and derived runtime copies are recorded in
[USER-ASSETS.json](USER-ASSETS.json). Existing source files are preserved.

Runtime character conversion, animation fitting and sword simplification are
documented in [the roster guide](../docs/expanded-roster.md). Three.quarks and
quarks.core are MIT licensed; their licenses are included in the deployment vendor
folders. meshoptimizer is an MIT-licensed development-only preparation tool.

## Paladin and Parasite Zombie additions

The user supplied \assets/characters/Paladin Type Character.fbx and
\assets/characters/Paraiste Zombie Character.fbx, plus Paladin Animation Pack /
Pro Sword and Shield Pack.zip and Scary Zombie Animation Pack / Scary Zombie Pack.zip.
Original download URLs and license terms were not supplied; no CC0 or CC-BY claim
is made. Prepared derivatives are paladin.glb and zombie.glb in characters/generated.
The original zombie attack FBX is preserved; animations/generated/zombie-attack.glb
is a recovered conversion used during preparation because FBXLoader cannot parse
the supplied source. Model conversion uses the official Godot FBX2glTF converter:
https://github.com/godotengine/FBX2glTF/releases/tag/v0.13.1

Paladin's sword reuses the existing supplied optimized sword. Its small shield is
original procedural geometry implemented in src/characters/FighterWeapons.js.
File hashes and sizes are recorded in USER-ASSETS.json.
\n## Urban presentation update — 2026-10-22

- Brick Wall 001, Poly Haven: https://polyhaven.com/a/brick_wall_001
- License: CC0, https://polyhaven.com/license
- Runtime: `textures/brick-wall-diffuse.jpg`, original 1K JPG (574381 bytes).
- Official download: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_wall_001/brick_wall_001_diffuse_1k.jpg
- MD5 verified against the official API: `955d2d4500eb549be0f2873305782798`.
- Existing Concrete Floor maps and supplied textured barrel/crate assets are reused with their detail preserved. Original character texture maps and normal maps remain intact.

## Combat presentation update — 2026-10-22

The contact-shell, ripple, impact-ring and crescent-arc shaders in
`src/combat/ArcadeVFX.js` are original project code. They reuse the already
imported Kenney particle sprites through the existing Three.quarks integration.
No new external assets were downloaded. Character GLBs and source animation files
were not regenerated or replaced. See `docs/combat-skills.md`.


## Textured Soldier firearms and enemy bosses — 2026-10-23

The Soldier now uses Poly Haven's Bolt Action Rifle 7.62 and Service Pistol:
- https://polyhaven.com/a/bolt_action_rifle_7_62
- https://polyhaven.com/a/service_pistol
- License: CC0, https://polyhaven.com/license
- Files: Weapons/realistic/rifle.glb and pistol.glb; original geometry and 1K
  textures embedded in GLB. Official API MD5s were checked before conversion.
- Runtime file sizes, source links, transformations and SHA-256 hashes are in
  Weapons/realistic/SOURCES.json. Source pistol variants/spare parts are hidden.

These firearms replace the Soldier blaster at runtime. Existing Kenney asset
licenses remain valid for their retained files and the particle/environment kits.

El Chupacabra and the Soldier Pistol or Handgun Locomotion Pack are user-supplied;
no external license claim is made for them. New derivatives are generated/chupacabra.glb
and the updated generated/soldier.glb. Pistol recoil/posture composition is original
project code. Other boss/zombie clips reuse supplied sources. See
../docs/soldier-weapons-and-enemies.md for sources, roles and manual tuning.


## Textured storm and barrier presentation — 2026-10-23

Additional transparent sprites extracted from the user-supplied Kenney Particle
Pack: smoke_04.png, twirl_01.png, flare_01.png and slash_02.png.
Source: https://kenney.nl/assets/particle-pack
License: CC0; existing assets/textures/kenney/License.txt is retained.
No new character models, animations or third-party packages were added.
Textured funnel, branching bolt ribbons and barrier shaders are original code.


## Original elemental presentation — 2026-10-23

textures/combat/elemental-atlas-v1.png is original AI-generated VFX artwork,
created with the built-in image-generation tool. No reference screenshot or
third-party game texture was copied into this image. It contains a flame strip,
spectral dragon head, silver slash and mist. It is not labeled as a CC0 download.
The exact generation prompt and usage are recorded in docs/elemental-combat.md.
Existing Kenney CC0 sprites and the supplied optimized great-sword model are
reused under their existing license records. New shaders/physics code are
original project code; Rapier remains Apache-2.0.
