# Carl / custom avatar Kickboxer

The original custom face, hair, suit, geometry and textures remain in use. The source FBX is unchanged. Select **Carl / Kickboxer** in the fighter menu.

## Controls

| Input | Move | Source animation |
| --- | --- | --- |
| Idle / locked idle | Animated boxing guard | Mixamo Boxing Idle, 2.2-second loop |
| LMB / J x3 | Jab -> cross -> body kick | Mixamo Lead Jab, Rear Cross; existing MMA kick |
| RMB / L | Rising uppercut | Mixamo Rear Uppercut |
| 1 / K | Counter knee; stun on confirmed contact | Mixamo Knee Strike; knee bones drive its hitboxes |
| 2 | Driving hook; lunge and Flow | Mixamo Rear Hook |
| 3 | Pressure combination; two contact windows, Off Balance | Mixamo Jab Cross Combo |
| 4 | Street resolve: jab -> cross -> hook -> launching uppercut | Four trimmed Mixamo stages; completion grants Poise for four seconds |
| F | Guard | Existing Outward Block |
| E | Dodge roll | Quaternius Roll |
| Space | Jump / loop / landing | Quaternius Jump_Start / Jump_Loop / Jump_Land |

Damage budgets remain in CombatBalance.js: basic chain 7/9/12, heavy 22, skills 16/21/24, ultimate 60 before normal critical/status modifiers. Ultimate cooldown remains 26 seconds. Damage still requires swept bone hitbox contact during an active window. Recovery tails are trimmed rather than simply accelerating long source clips.

## Sources and fit decisions

Eleven animation-only clips were downloaded on 2026-10-26 from the user's Mixamo session with the supplied avatar loaded: FBX 2014 Binary, Without Skin, 30 fps, no keyframe reduction. Exact titles, aliases, hashes and settings: assets/animations/Custom Avatar/Mixamo/SOURCES.json.

Seven sources are integrated: boxing idle, jab, cross, hook, uppercut, knee and jab-cross combination. Boxing forward/left/right shuffles and retreat are retained as optional sources. Their short strides would require excessive cadence at this game's current movement speeds, so the existing calibrated locomotion and universal dodge roll are retained. A backward-only retreat is not assigned to an omnidirectional dodge.

Mixamo clips use Adobe's royalty-free game usage terms, not CC0: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html . Quaternius Universal Animation Library Standard remains the CC0 source for travel, jump, roll and chest hit: https://quaternius.com/packs/universalanimationlibrary.html . Its License.txt is retained alongside standard.glb. Existing supplied Boxing Animation/locomotion files retain their own terms and provide kicks, guard, hit reactions, knockdown, get-up, victory and Defeat.

## Rig preparation

The custom source has no embedded animations and has repeated humanoid bone names. Preparation normalizes names and consolidates equivalent bind poses into 73 canonical bones. Downloaded avatar animation FBXs use metre-scale positions, while the other animation packs use centimetres. AvatarFighter.animationSourceScales converts only the new source folder before retargeting. Root/scale tracks are excluded from the avatar derivative; the controller owns position and heading. This also prevents a renamed AvatarRoot channel from causing GLTFExporter to discard a clip.

Generated output: assets/characters/generated/avatar.glb, 37 clips, approximately 16.1 MB, plus avatar.json. Existing face morph baking and opaque-texture compression remain enabled. Original source FBX and other fighters' generated assets are unchanged. No extra full-body character meshes or deployment builds are created.

## Edit and regenerate

- src/characters/AvatarFighter.js: model, animation source paths, named GLB clips, per-clip normalized trims and source units.
- src/combat/AvatarMoves.js: attack aliases, active windows, knee/hand/foot strikers, speed, combo/ultimate order, statuses and input.
- src/combat/CombatBalance.js -> avatar: total damage and cooldown budgets.
- src/combat/StatusEffects.js: ultimate completion reward.

Run npm start and, in another terminal, node scripts/asset-prep-server.mjs. Open http://127.0.0.1:8080/scripts/prepare-avatar.html and click Prepare avatar. Only avatar.glb and avatar.json are regenerated. Existing .fbx ignore rules still apply: runtime uses the generated GLB, while source FBXs stay local unless you deliberately change your asset policy. Recalibrate avatar strides if locomotion sources change; do not copy another fighter's calibration.

## Verification

The integrated clips are checked in the actual game browser: idle/movement loop seams, sole contact, queued three-stage basic attacks, numbered skill hits, heavy contact, ultimate completion/reward, and actual mouse input. Existing authored Defeat, knockdown and get-up are retained; no ragdoll or skeleton-scale deformation is introduced.

## Existing Supabase setup

Existing multiplayer projects use supabase/migrations/002_custom_avatar.sql to allow avatar in room selections. New projects use the updated 001 migration. No live database changes are made by animation preparation.
