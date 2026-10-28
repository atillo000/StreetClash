# Combat feedback pass

Completed 2026-10-27 in the repository connected to GitHub. Three.js, Rapier,
existing character models, move clips, damage budgets and controls are retained.

## What changed

- Confirmed contacts have a brief white core, directional textured streaks and a
  small dust puff. Strength follows actual damage with a capped scale; critical
  hits and heavy moves are more pronounced than jabs. Shields appear on guarding
  or fully absorbed hits, rather than covering every damaged character.
- The hit tint adds a small amount of emissive light, fades over its existing
  duration and restores the exact original materials. It does not amplify the
  model's original pale emissive color into a featureless silhouette.
- Offline player melee contact stop is 28 ms for ordinary hits, 45 ms for critical
  finishers and 65 ms for heavy hits; guarding uses 18 ms. Ranged hits, remote bot
  fights and online simulation do not stop the arena. Camera response falls off
  for distant events and respects reduced-motion settings.
- Render-only recoil and a small lens response emphasize contact without
  deforming the skeleton or moving authoritative capsules. The lens pulse uses the
  current camera FOV and restores it after drawing, preserving camera tuning.
  Authored reactions,
  falls and death animations remain in charge of the character pose.
- Charge glows follow an actual strike bone or weapon muzzle. They end at the
  first active window/release or immediately after interruption/death. Ordinary
  attacks use actual limb/blade trails instead of a large generic torso sweep.
- Concrete-breaking moves emit expanding textured dust and angular flying
  fragments at the existing floor-contact event. Rapier handles the fragments.
  Uppercuts and airborne/body hits do not acquire automatic craters. Existing
  crater restoration and debris lifetimes remain in use.
- Concrete footsteps follow gait phases. Punches, heavy punches, metal blocks,
  wood/metal destruction and stone impacts use recorded CC0 sounds with three
  variants each. Synthesized cues remain available for powers and as a loading
  fallback. Audio remains limited to 16 simultaneous voices.

## Assets and limits

Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds (CC0-1.0).
Only 21 selected OGGs plus the license/source manifest are installed under
assets/audio/kenney-impact (about 172 KB of audio and license). The build script
includes this directory; no deployment build was generated during this work.

Existing Kenney flare, slash, smoke and swirl textures are reused. The new contact
renderer uses three shared instanced batches with 48/96/160 fixed slots at low,
medium/high budgets. It allocates no geometry per hit. Important contact flashes
can replace a dust slot when the pool is full. Reset and expiry clear the slots.

## Manual tuning

- src/combat/ImpactPresentation.js: contact scale/lifetime, dust, charge anchors,
  quality limits and textured batch presentation.
- src/combat/CombatJuice.js: render-only recoil, lens pulse and footstep cadence.
- src/combat/Combatant.js: _flash and _updateFlash only for the revised hit tint.
- src/main.js: local impact stop, sound/release hooks and ground response.
- src/core/SampleSounds.js: sample mappings, variations and gain.
- src/combat/DestructibleProps.js / WreckEffects.js: surface events and fragments.
- src/online/OnlineMatch.js: matching guest-side visual/audio event presentation.

## Verification and limits

Browser checks cover all eight playable fighters' basic chains and numbered skill
contacts, interrupted charge cleanup, guard versus normal contact, fixed pool
limits, particle expiry, crater/prop reactions, automatic ground restoration,
material restoration, authored Defeat and reduced-motion recoil. All 21 audio
files decode successfully and audio voices return to zero after playback.

Online hit-stop suppression is checked locally through the existing session flag;
guest presentation hooks are updated. A live two-account Supabase match and the
user's MX130 frame rate were not measured. No claim is made that this pass alone
matches the art or production quality of the reference game.
