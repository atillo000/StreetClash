# Expanded roster, weapon integration and controls

Implemented in `D:\Carl\Personal\Game\streetclash\streetclash\Repository\StreetClash`.
This extends the earlier cutoff version with the subsequently supplied assets.

## Controls

| Input | Action |
| --- | --- |
| Left mouse / J | Basic attack; repeated taps chain Capoeira's kicks |
| Right mouse / L | Heavy or special attack |
| 1 / E / K | Character's secondary attack |
| 2 | First character skill |
| 3 | Second character skill |
| WASD / Shift / Z | Move / walk / sprint |
| X / C | Jump / crouch when the character has crouch clips |
| F / Space / Tab | Guard / evade / target lock |

The first mouse press during combat captures the mouse and attacks. Escape releases
it; P pauses. Mouse buttons over menus do not trigger attacks. HUD labels follow the
same binding definitions in `src/core/controls.js`.

## Fighter assignments

| Fighter | Basic | Heavy | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- |
| Capoeira / Roda | Meia lua chain | Armada | Bencao | Rush kick | Roda sweep |
| Magician / Vesper | Arc bolt | Arcane pulse | Twin-hand blast | Astral seal | Phase step |
| Soldier / Rook | Rifle shot | Rifle burst | Close kick | Focus round | Tactical roll |
| Archer / Talon | Quick arrow | Piercing shot | Archer kick | Triple volley | Hunter dive |
| Great Sword / Brand | Crosscut | Breaker | Sword kick | Skywheel | Steel slide |
| Axe / Havoc | Hook cut | Skull splitter | Axe kick | Whirlwind | Leaping cleave |
| Mutant / Brute | Claw swipe | Rending claw | Stomp | Crater slam | Primal roar |

Archer uses Pro Longbow movement, aiming, draw/recoil, kick, guard, dive and death
clips. Great Sword uses its sword stance, walk/run/strafe, cuts, spin, slide, jump,
block, impacts and death clips. Axe uses its dedicated melee stance, locomotion,
horizontal/downward/spinning cuts, running leap, kick, jump and reactions.
Mutant uses creature idle, walk/run, swipe, jump, flex/intimidation, turns and death.
Its backward gait reverses its own travelling walk/run. Shared clips fill missing
guard, evade, hit/get-up or lateral movement coverage; these are not substituted
for the supplied character's main combat and locomotion style.

The Mutant uses a larger capsule and 140 HP; other fighters use 100 HP. Balance is
provisional. Re-selecting a normal fighter restores its normal capsule and health.
All nine fighters are available as player or rival; there are no interchangeable
class/body/costume overrides.

## Assets and preparation

Raw animations were extracted from the supplied ZIPs. Three standalone characters
use FBX 6100, so local FBX2glTF conversion creates ignored GLB intermediates in
`assets/characters/source-converted/`. The original FBXs are preserved. Axe's FBX
loads directly. `scripts/prepare-user-fighter.js` fits clips to each rig, removes
travel motion, consolidates duplicate bones, resamples tracks and embeds textures.
`scripts/prepare.html` isolates conversion from the running game. Preparation output
is in `assets/characters/generated/`; it is what the deployed game loads.

The bow is held in Archer's left hand. Great Sword uses both hands to orient its
grip; Axe follows the right hand. The source Axe's baked weapon mesh is removed
before export to avoid rendering a second axe. Imported weapons have real tip,
mid and base strike markers, sharing the existing swept hit detection, cover checks
and per-swing victim tracking. Weapons are hidden during unarmed reactions/evades.

The downloaded sword is preserved. Its generated runtime copy reduces 300,010
triangles to 20,000 using meshoptimizer. Rebuild it with `scripts/optimize-sword.mjs`
and `MESHOPT_MODULE` set to the installed meshoptimizer `index.js`. These conversion
tools are development tools, not additional browser dependencies.

Two barrels and four wooden crates use their supplied textured GLBs. Their actual
transformed bounds join character collision, AI navigation, projectile cover and
camera collision. The central lane and starting positions remain clear. Their
materials survive warehouse static batching.

The effects update adds instanced arrow shafts/heads and subtle trails, expanding
ground shockwaves, fighter-colored hit bursts and the existing Quarks cast effects.
Particle/ring pools follow the quality setting and clear on reset. Portrait fill
lighting makes character faces and outfits easier to inspect in the menu.

## Verification

- `npm test`: 51 tests, including embedded clips, weapon geometry, controls and collision.
- `roster-playtest.js`: seven selections, all 35 attacks/skills, recovery, native clips,
  running, jumping, weapon attachment and imported prop collision.
- `combat-controls-playtest.js --gesture`: both mouse buttons, 1/2/3 and HUD labels.
- `fighter-match-playtest.js`: eight seeded full AI matches, including the four new
  characters, real damage, outcomes, selection lock and rematch health cleanup.
- `production-smoke.js`: all seven GLBs, three weapons, two props and Quarks modules.

The static build includes the runtime assets and excludes source FBXs, intermediate
conversions, ZIPs and the original dense sword. Physical MX130 performance still
needs an on-device check.

## Paladin and Parasite Zombie (2026-10-19)

The roster now has nine selectable fighters. Paladin / Aegis (115 HP) uses the
Pro Sword and Shield Pack, a one-handed reuse of the existing optimized sword,
and an original shield attached to the left hand. Guard uses the dedicated block
animations and takes 8% chip damage from ordinary light attacks. It has sword cuts,
a kick, Radiant advance, Consecration and the three-stage Judgment ultimate.

Parasite Zombie / Blight (110 HP; original source filename spells it Paraiste)
uses the Scary Zombie Pack for lurching walk/run, claws, neck bite, scream and
running crawl. The long feeding animations are not used for standing attacks.
Neck-bite lead-ins/recoveries are trimmed for responsiveness. Skills are Frenzied
bite and Grave crawl; the latter is a mobility skill with an early invulnerability
window, not a damaging attack. Parasite feast chains a scream, two rakes and a bite.

Both use standard LMB/RMB/1/2/3 inputs and 4 for ultimate; their keys, clips and
moves remain editable in ImportedFighters.js and ImportedMoves.js. Shared reactions,
strafe/jump/roll clips fill gaps where the dedicated packs contain no equivalent.
New gait calibration entries were measured from the supplied soles and planted-foot
speeds; the existing seven entries are preserved. Strafe directions were checked
from actual foot motion rather than numbered animation filenames.

Source models use FBX 6100 and are converted to ignored GLB intermediates in
assets/characters/source-converted with FBX2glTF before the normal preparation step.
The Zombie attack FBX fails FBXLoader; its preserved recovered GLB is in
assets/animations/generated/zombie-attack.glb. The preparation script supports
these metre-based GLB clips by normalizing them to the centimetre convention of
the supplied Mixamo FBXs before retargeting. No runtime converter is needed.

Prepare only paladin or zombie using the existing scripts/prepare.html workflow.
The local preparation receiver now accepts those two IDs as well as the original
seven. The existing deployment script already copies their generated assets; no
build output is needed for local development.
