# Elemental combat presentation

The supplied screenshots guide the energy shapes, layering and timing. Their
characters, textures, effects files and engine assets were not imported.

## What is connected to gameplay

- CombatArt.js assigns wind (Capoeira), fire/arcane (Magician), storm (Soldier),
  frost (Archer/Greatsword), fire (Axe), holy (Paladin), earth (Mutant), toxin
  (Zombie) and shadow (Chupacabra). Edit element, artColor and launchSpeed here.
- ElementalEffects.js renders layered curved attack sweeps, timed startup/ultimate
  auras, fire/mist veils, sparks, ice crystals and short impact lights. It uses
  fixed pools, quality-dependent counts and two non-shadowed point lights.
- BladeTrails.js samples real active strike-point sweeps in one instanced draw.
  Startup and recovery do not add weapon trails or extra hit windows.
- Magician dragon powers now render a painted spectral apparition with flowing
  fire tails. This is a sprite-based magical creature, not a new rigged model.
- Greatsword's seismic projectile carries a moving frost crystal wave; it retains
  its existing hit radius, wall stopping, ground contact and damage rules.
- Soldier/Paladin lightning gets a short vertical strike at the authoritative
  endpoint, alongside its original weapon-aligned beam. It does no extra damage.
- Summon pulses show their actual radius; Paladin wards use the supplied textured
  great-sword GLB in place of cone placeholders. Terrain effects stay separate
  from body/air impacts. Ice crystals are cosmetic; they do not block navigation.
- Confirmed hits drive a short colored light and existing hit-stop/shake. Incoming
  hits and criticals add a faint edge flash. Synthesized audio adds filtered noise
  for impact/swing/fire/electric cues; no external sound recording is claimed.

## Hit reactions and collision

Selected heavy melee moves/finishers launch regular enemies using the existing
vertical velocity and gravity. Downed victims wait for ground contact before
getting up. Guarded hits and giant bosses resist these launches. Landing adds
dust, with a small local camera/sound cue for the player. Damage budgets, input
bindings, cooldowns and original animation clips remain unchanged.

Death presentation has been restored to each rig's own Defeat animation.
The Ragdolls module is disabled by default and is not started by onKill.
Rapier debris, launches, landings and character collision proxies remain.
See status-and-companions.md for newer status indicators, wards and familiars.
The existing swept hitboxes/hurtboxes, character controller and combat balance
remain authoritative. This is not a full animation/character-controller rewrite.

## Artwork and performance

Runtime artwork: assets/textures/combat/elemental-atlas-v1.png (about 2.24 MB).
Created with the built-in image-generation tool, preserving PNG transparency.
The atlas is included by the existing assets/textures production copy rule.
No new dependency, full-screen bloom/refraction pipeline, build output or
permanent test suite was added. These are layered real-time game effects;
cinematic offline fluid simulation and exact reference-image parity are not
claimed. Quality presets bound emitters, trail samples, debris and ragdolls.

## Exact artwork generation prompt

Use case: stylized-concept. Asset type: original game VFX texture atlas, a square 2 by 2 grid with exactly four equal cells and transparent background, to be mapped onto 3D ability meshes. Not a scene, no characters, no lettering, no grid lines, no logos. Top-left cell: isolated wide horizontal band of turbulent orange-gold fire, tongues licking upward, smoky red wispy edges, white hot fine streaks, transparent soft edges all around and 10% empty padding. Top-right cell: isolated horizontal spectral Chinese dragon head with horns, long snout, open jaws and curling flame mane, head points RIGHT, emerald white eyes, rest orange-gold fire, long wispy flame neck extends to LEFT, transparent background and ample padding. Bottom-left cell: a broad horizontal flowing white/silver luminous sword slash brushstroke with several thin feathered streaks, tapers at both ends, transparency, no circle. Bottom-right cell: dense turbulent grayscale smoke/noise patch with curling whorls, useful as a scrolling magic mask, soft fully transparent edges. All four cells fit entirely in their own equally sized quadrants, do not overlap or cross cell boundaries. Professional hand-painted VFX texture artistry, crisp detailed cores and smoothly fading alpha. Truly transparent PNG alpha outside effects. Original designs only.
