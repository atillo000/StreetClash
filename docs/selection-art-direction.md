# Lighter selection overlay and detailed environment

Current presentation: [minimal HUD and industrial surfaces](minimal-hud-industrial-surfaces.md) supersedes the paper panel and brighter lighting described below; the authored assets and inspection workflow remain in use.

Updated 2026-10-28 in the GitHub-connected repository. Builds on the existing hero-selection/district/FFA pass. Existing combat, character models, clips, weapons, statuses, scores and respawns remain in use.

## Presentation

Hero selection is a floating paper-coloured HTML panel over a full-screen 3D workshop. The previous solid dark half-screen is removed. The workshop has textured brick walls, recessed windows/doors, shelving, a worn wooden bench, a red metal tool chest and an original briefing board. The selected fighter stays animated. Horizontal dragging/arrow keys turn the hero on the stand while the workshop stays stationary; vertical inspection and zoom remain available. Render-only actor position/rotation and skeleton uploads are restored before simulation resumes. On narrow screens the portrait occupies the top region and the menu scrolls below it. The overlay hides during gameplay.

Main building envelopes and service kiosks now use selected authored façade modules, with original 1K albedo, normal and packed roughness/metalness maps. Their recessed doors/windows, sills, base courses and cornices replace flat block façades. The structural collision footprint is preserved; the detailed stage tool chests have matching cover bounds. Stage retaining walls use textured concrete. Phone booths have glass panels, support frames, a handset, keypad and cable rather than a solid pillar. Existing low-detail industrial props, containers, tower and some structural trim remain; this pass does not replace every environment asset with a unique sculpted model.

Daylight, sky/fog palettes, plaza/lane tints and selection UI are lighter. A small generated room environment provides reflected light for PBR surfaces without an HDRI download. Existing character textures are preserved. No proprietary Brawl Busters artwork is imported.

## Free assets actually installed

All five packs are from Poly Haven, CC0-1.0: https://polyhaven.com/license . Author names, exact download URLs, source/output hashes and preparation details are retained in assets/environment/polyhaven/SOURCES.json and LICENSE.txt.

- Modular Factory Facade — https://polyhaven.com/a/modular_factory_facade — 11588 KiB; 6968 source triangles.
- Modular Urban Apartments Facade — https://polyhaven.com/a/modular_urban_apartments_facade — 8278 KiB; 14565 source triangles.
- Painted Wooden Bench — https://polyhaven.com/a/painted_wooden_bench — 1942 KiB; 630 source triangles.
- Steel Frame Shelves 02 — https://polyhaven.com/a/steel_frame_shelves_02 — 527 KiB; 4348 source triangles.
- Metal Tool Chest — https://polyhaven.com/a/metal_tool_chest — 2299 KiB; 13360 source triangles.

Combined runtime GLBs: 25.22 MB. Only selected façade modules and 1K maps are retained; no full Blender archives or 4K/8K texture packs are installed. Files are self-contained GLBs served locally; gameplay does not contact Poly Haven. Static objects do not need skeletal rigs. The heroes retain their existing humanoid rigs.

## Cost and maintenance

- src/core/DetailedEnvironment.js loads/caches the five packs once and builds architecture/workshop from their modules.
- src/core/WarehouseArena.js supports optional spatial batching. District static geometry is grouped by material and 12m cell so off-screen detailed buildings can be culled.
- Workshop geometry is batched by material; the measured portrait used 21 draws in the verification view. This is not an MX130 performance benchmark.
- src/ui/selection-overlay.css controls overlay colours/layout; src/ui/HeroPreview.js controls the turntable, portrait scene and framing.
- src/core/ArtDirection.js and src/core/DistrictArena.js hold daylight and location palettes.
- scripts/prepare-detailed-environment.mjs downloads the chosen CC0 sources, preserves original PBR maps, subsets façade geometry and flattens prop transforms. Verified local outputs are reused. Run from the project root with Node; no new package is required.
- scripts/build.mjs includes the local Poly Haven folder. No deployment build was generated for this update.

## Verification

Browser checks cover local model/PBR-map loading, all eight animated previews and render-transform restoration, 360-degree inspection, overlay entering/leaving gameplay, location themes, open spawn points, FFA kill/death credit and respawn, and raised-ground restoration. Desktop and 390px overlay layouts were inspected. No runtime/shader errors were observed. Live online play and target-hardware frame rate were not tested. Temporary checks/screenshots are removed after review.
