# Minimal HUD and industrial surfaces

Follow-up: [living arena, controls and performance](living-arena-performance.md). Shift now sprints; Ctrl + WASD walks.

Updated 2026-10-28. This is the current presentation pass, following selection-art-direction.md. Existing combat bindings, fighter models, animations and score rules remain in use.

## Player experience

- Health, the match timer, important combat/status information and FFA kills/deaths remain visible. The skull and broken-heart symbols are original project SVGs.
- Controls, skill slots, live standings and the kill feed start hidden. H opens HUD options; I toggles skill slots. Preferences persist locally. Use minimal HUD restores the defaults. Hiding a panel never disables its underlying functionality.
- The pause screen also links to HUD options. Opening options releases pointer lock and clears held input; closing restores canvas keyboard focus. Clicking the arena captures the mouse again. Options do not stop an online match.
- The optional guide shows the existing bindings: WASD movement, LMB/RMB basic/heavy, 1/2/3 skills, 4 ultimate, F guard, E evade, Space jump, Shift sprint, Ctrl + WASD walk, C crouch, Tab target lock and Soldier Q loadout.
- Hero selection prioritizes the animated hero, name and role. Background and Skills & controls are collapsed disclosures. A translucent profile panel leaves the workshop visible; a dedicated spotlight draws attention to the hero. Inspection/360-degree rotation remains available. Encounter controls/graphics are also grouped in a closed disclosure.

## Art and geometry

The district mixes worn concrete, a 16-panel PBR steel repair deck, original hex rivets, true corrugated roof geometry and textured building modules. Cones, a barrel and a crate form small asymmetric edge clusters, leaving the main routes open. Neutral surface tints, reduced exposure/fill and warm stage lamps create light/shadow separation without making the entire scene dark.

The steel deck uses the existing deformable ground decoration path: panels and rivets bend and recover with the crater, rather than cover it. Its support height is 0.028m above the original base, with a 0.008m visual plate offset. Ground collision uses the same heightfield. Existing stage heights are preserved. Ground impacts in this zone use existing metal-impact audio; other ground keeps stone/landing audio. Roofs are presentation geometry on existing building footprints.

## Where to edit

- src/ui/DisplayOptions.js: defaults, saved preferences, optional guide and H/I shortcuts.
- src/ui/presentation.css: final HUD/profile styling, condensed font, translucent panels and responsive layout. Loaded after the existing styles.
- src/ui/LobbyFlow.js: hero disclosures and encounter setup grouping.
- src/core/IndustrialSurfaces.js: cached PBR materials, corrugated roofs, deck panels and rivets.
- src/core/DistrictArena.js: deck region, muted floor tints, edge clusters, stage lamps and surface audio classification.
- src/core/ArtDirection.js, src/main.js and src/ui/HeroPreview.js: lighting, exposure, reflection strength and portrait spotlight.
- scripts/build.mjs: copies assets/presentation into deployment output when a build is requested.

## Free sources actually installed

Six 1K JPG texture maps from Poly Haven (CC0-1.0):

- Metal Plate 02: https://polyhaven.com/a/metal_plate_02
- Corrugated Iron 03: https://polyhaven.com/a/corrugated_iron_03
- License: https://polyhaven.com/license

Two Barlow Condensed font files from the official Google Fonts repository, SIL Open Font License 1.1: https://github.com/google/fonts/tree/main/ofl/barlowcondensed . OFL.txt is retained.

Sources, byte sizes, SHA-256 hashes and licenses are recorded in assets/presentation/SOURCES.json. Combined download size is about 3.1 MB. All runtime assets are local. No proprietary reference artwork, font files, logos or UI textures were imported.

## Verification and limits

Browser checks passed for collapsed defaults, H/I toggles, keyboard focus restoration, optional guide/standings, hidden-bar attacks, hero disclosures, local font/PBR loading, all 16 panels/64 rivets, crater deformation/restoration, raised-stage restoration, FFA kill/death credit and respawn. Desktop 1440px and 390px layouts were visually inspected. No runtime/shader errors were observed during these checks. This is not a mobile gameplay certification, live-online session test or target-GPU performance benchmark. No deployment build was generated; temporary checks and screenshots are removed after review.
