# Void Mage character preparation

The user supplied the purple mage concept on 2026-10-27. Preserve its realistic
face, curly hair, purple/charcoal layered robe, antique gold armor, turquoise
accents and void magic. A single front reference cannot establish unseen back
details or guarantee an identical 3D face. The body mesh, handheld weapon and
animated aura should remain separate assets.

## Existing preparation files

- assets/characters/Void Mage/reference/mage-front-a-pose-v1.png: clean 2D A-pose
  modeling reference generated with the built-in image-generation tool, using
  the supplied concept. It is not a rigged character or a 3D file.
- assets/characters/Void Mage/source/mage-base-meshy6lite.glb: preserved untextured
  Meshy 6 Lite source. 221,342 triangles, no UVs, materials or skeleton. It is not
  registered as a playable fighter. Meshy free-plan CC BY 4.0 terms apply.
- assets/Weapons/generated/void-glaive.glb: original separate crescent weapon
  approximation, five material batches, grip at the origin. It is not an exact
  reproduction of the reference weapon and has not yet been hand-fitted.

The user selected Tripo instead of Meshy and explicitly approved Tripo's Public
generation setting. Tripo source/output status must be recorded after export;
an on-screen preview is not evidence of a successfully downloaded model.

## Animation candidates verified on disk

All paths below are relative to assets/animations/Magic Character Animation
Pack/Pro Magic Locomotion Pack. The FBX files load successfully in Three.js.

| Situation | Candidate | Notes |
| --- | --- | --- |
| Hero/casting idle | Standing Idle 04.fbx | 7.45 s; open left palm and lifted casting arms at the inspected phase. Best starting point for a hand orb. |
| Combat idle | standing idle.fbx | 1.87 s; compact alert stance, suitable for rapid transitions. |
| Relaxed alternative | Standing Idle 03.fbx | 11.4 s; longer gesture, better as a fidget than the main loop. |
| Moving with a weapon | standing idle 02.fbx | 5.18 s; visibly rotates/changes stance; inspect before using as a seamless default. |
| Single-hand cast | standing 1H cast spell 01.fbx | 2.27 s; suitable candidate for left-hand void orb release. |
| Charged cast | Standing 2H Cast Spell 01.fbx | 2.17 s; candidate for a stronger channel/ultimate startup. |
| Basic magic chain | Standing 1H Magic Attack 01/02/03.fbx | Distinct releases; actual cast frames must be measured after retargeting. |
| Heavy pulse | Standing 2H Magic Area Attack 02.fbx | Candidate for a radial void discharge. Body/air burst should not automatically excavate concrete. |
| Locomotion | Standing Walk/Run Forward, Back, Left, Right.fbx | Existing matching pack; recalculate gait for the new rig. |
| Guard/reactions/death | Standing Block Idle, Standing React Small From Front, Standing React Death Backward.fbx | Preserve authored reactions and death, do not substitute ragdoll deformation. |

The four idle poses were visually compared on the existing Magician rig. Those
checks establish what the source clips contain, not their final fit to the new
mage. Weapon grip, cloth deformation, loop seams and floor contact still require
verification on the actual rigged mesh.

## Intended runtime presentation

Keep the left-palm void orb attached to its hand bone; use a dark core, textured
violet rim and restrained cyan highlights. Use a small number of flowing ribbon
surfaces with alpha textures; they are cosmetic, not extra damage hitboxes.
Reduce the idle aura in combat so it does not obscure enemies. Hero-preview pose
can emphasize the raised palm and lowered weapon. Casting, interruption, death
and multiplayer snapshots must control effect state and cleanup.

Use GLB as the runtime format, with embedded textures and a humanoid skeleton.
Keep the rigging/rest pose separate from the original hero pose; a model exported
only in the dramatic image pose is not a suitable animation bind pose.

## Source links

- https://help.meshy.ai/en/articles/10421033-why-can-t-i-download-my-model
- https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models
- https://www.tripo3d.ai/product-doc/getting-started/pricing-credits
- https://www.tripo3d.ai/product-doc/export-and-integration/export-dcc

Tripo free-plan outputs require attribution under the provider's current terms.
Check the actual export and asset version; the account showed an export upgrade
screen for the first optimized preview despite the H2.5 pricing documentation.
