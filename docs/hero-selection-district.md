# Hero selection, district arena and local free-for-all

Implemented 2026-10-28. Original Street Clash presentation, using the supplied screenshots for composition and spatial reference only. No Brawl Busters assets, character designs, logos or textures are imported.

## Player flow

Launch opens hero selection. The left portrait uses the selected fighter's existing animated model and supports a full horizontal orbit, keyboard rotation and zoom. The right panel contains the existing roster, original backstory and the actual configured move names. There is no body, hair, face or skin customization step.

Choose hero opens encounter setup. Select a local encounter and location, then enter the arena. Change hero returns to selection. Existing campaign progress, practice, online-room controls and graphics settings remain accessible. Enter advances the first screen, then starts the chosen encounter.

## District

The playable boundary expands from 18 x 18 m to 40 x 40 m (about 4.9 times the floor area). The layout has an open central plaza, two side routes with service kiosks, a north stage, cargo pockets, perimeter fences, facades and a signal tower. Six 20 cm stage steps lead to a 1.2 m platform. Retaining rails route characters toward the stairs. Camera distance and fighter proportions are retained.

Freight Quarter (street), Ironworks (factory) and Cinder Works (foundry) are three visual presentations of this same layout, not three separately authored levels. Themed dressing includes public phone booths/benches, industrial machinery, or furnaces and molten channels outside the fence. The molten backdrop is decorative, not a damage hazard. Structural solids and breakable crates/barrels retain collision; benches are decorative. Common collision makes navigation independent of theme. Theme choice is local presentation; it is not a new network map-selection protocol.

Existing Kenney factory models, supplied crates/barrels, concrete and brick textures are reused. Buildings, kiosks, phone booths, stage, benches and tower are assembled as original static geometry. Static geometry and ground markings are batched, breakables remain instanced. The initial pass added no model downloads. The subsequent detailed-architecture and lighter-overlay update installs selected Poly Haven CC0 modules; see docs/selection-art-direction.md for the current asset list and presentation.

The shared deformable ground now derives its dimensions/resolution from the floor geometry and remembers original vertex heights. Destruction therefore restores raised stage/step surfaces instead of flattening them. Rapier samples this same ground. Existing attack damage, move timings, VFX, sound, death clips and controllers are retained; a local height-step check prevents walking up a retaining edge.

## Free-for-all

One player and four humanoid bots reuse the existing rival and three pooled actors. Every actor has a distinct team, so existing targeting and hit detection apply to other bots too. Authored defeat animations play before the 3.5-second respawn. Respawns choose an open spawn with good separation and provide 1.2 seconds of protection.

First to 12 kills wins; the time limit is three minutes. At time, kills rank first and fewer deaths break ties. A tied player receives a draw. Death alone does not end a round. Kills use the existing confirmed-death hook, including periodic damage, with duplicate credit protection. The HUD shows personal kills/deaths, respawn countdown, kill feed, health/nameplates and all five standings. Results show the final K/D table. Circuit records still save locally.

This is local bot free-for-all. It does not add online FFA scoring/respawning to the existing Supabase mode. Existing friends-only online infrastructure is retained; no database migration or live service change is made.

## Editing

- src/ui/LobbyFlow.js: original stories, two-step flow, configured move summary.
- src/ui/HeroPreview.js: portrait scene, pedestal, lighting, orbit and camera.
- src/ui/district.css: selection composition and free-for-all HUD.
- src/core/DistrictArena.js: dimensions, prop placements, themes and stage.
- src/core/DeformableGround.js: raised base-height restoration.
- src/game/FreeForAll.js: teams, roster, respawns, score rules and standings.
- src/game/ArenaCircuit.js: integration with duel/campaign/survival.

## Verification

Browser checks cover selection flow, portrait transform restoration, all location themes, spawn navigation, walking the stage steps, crater restoration on the raised stage, distinct teams, bot targeting/damage, confirmed kills, duplicate credit, player/bot respawns, round finish/results and returning to survival/campaign/duel. A ten-second fixed-step simulation confirmed autonomous bot-versus-bot combat, including attacks, evasion, stagger and knockdown/recovery. No new deployment build or permanent test files are generated. Live multiplayer and the MX130 frame rate are not measured by these checks.
