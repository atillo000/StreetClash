# Soldier firearms and enemy encounters

Implemented in the GitHub-connected `Repository/StreetClash` folder.

## Soldier

- The old Kenney blaster has been replaced with Poly Haven's textured **Bolt
  Action Rifle 7.62**, as selected in this session. The **Service Pistol** is the
  second loadout. Both use the original geometry and embedded 1K PBR maps.
- Press **Q** while ready to switch rifle/pistol. LMB, RMB, 1–4 keep their combat
  slots. Switching preserves health, statuses and cooldowns and cannot interrupt
  an attack, jump, stagger or dodge. A stopped start/stop animation is cleared.
- Each firearm has its own measured grip and muzzle marker. The rifle aligns to
  its supporting hand; the pistol follows the shooting hand. Extra pistol variants,
  spare magazines and loose bullets from the source scene are hidden.
- Pistol idle, forward/backward movement, diagonals, strafes, kneeling and jumps
  use the newly supplied Pistol or Handgun Locomotion Pack. It contains no shooting
  take, so short original recoil clips are generated from its aiming pose. Missing
  crouch-travel/landing variants combine the existing leg motion with pistol arms.
- The rifle keeps its existing dedicated rifle animations. The current arcade
  fire/skill rules remain shared; this is not a mechanical firearm simulator.

Edit `src/characters/FighterWeapons.js` for asset URLs, proportions, grip and muzzle.
Edit `src/characters/SoldierLoadout.js` for switching and sidearm move labels/stats.
Edit `src/characters/FighterCatalog.js` for source pistol animation aliases. Recoil
and mixed posture preparation live in `scripts/prepare-user-fighter.js`.

## Bosses and zombies

| Enemy | Height | Health | Encounter behavior |
| --- | --- | --- | --- |
| Mutant / Brute | 3.8 m | 480 | Creature movement, claw/punch combination, heavy blow, ground slam and rushing rake |
| El Chupacabra | 4.1 m | 560 | Upright unarmed movement suited to the supplied masked wrestler model, raking/punch combination, two-hit rake, pounce and howl |
| Parasite Zombie / Blight | 1.75 m | 45 | Smaller approaching enemies using their dedicated zombie attacks, bite and infection |

These three types are enemy-only. The seven remaining humanoid fighters stay
selectable. The bosses also remain available as practice rivals.

**Gauntlet** has three encounters: four Parasites; Mutant plus two Parasites;
El Chupacabra plus three Parasites. **Mutant Hunt** and **Chupacabra Hunt** let the
player fight either boss directly with its zombie support. Defeating the main boss
does not end the encounter while zombies remain. Gauntlet counts all eleven enemies.
Practice and Duel do not automatically spawn support waves.

Three zombie slots are reused, each with its own AI and floating health bar.
Hidden/inactive slots do not collide, attack or respawn in practice. Returning to
the menu clears the pool. Boss movement/capsules, melee reach, navigation radius,
health and close-range camera framing match their increased size. The camera stays
inside the existing distance limits. Terrain destruction still follows the damaged
surface for all actors.

Edit `src/game/ArenaCircuit.js` for wave order, timers and support counts.
Edit `src/game/EnemyPool.js` for the three-slot limit, spawn points and zombie bars.
Edit `src/characters/ImportedFighters.js` for sizes, health and animation sources.
Edit `src/combat/EnemyMoves.js` for boss moves, reach and combinations, and
`src/combat/EnemyAI.js` for approach/combo behavior. Bosses do not use human guard
or dodge behavior. Their attacks still use existing animation hit windows.

## Free sources and animation suggestions

- Rifle: https://polyhaven.com/a/bolt_action_rifle_7_62
- Pistol: https://polyhaven.com/a/service_pistol
- Both are CC0: https://polyhaven.com/license
- Local files, sizes and hashes: `assets/Weapons/realistic/SOURCES.json`.
- **Mixamo** is the closest fit for this character's existing humanoid rig:
  https://www.mixamo.com/ . Search for heavy boxing/punch combinations, unarmed
  forward/backward locomotion, a jumping attack, a roar/taunt, hit reaction and
  knockdown/death. A simple boss kit is idle → walk/run → jab/cross/rake chain →
  heavy blow → leaping slam → recovery. Preview the hand reach on this larger
  model before choosing exact takes. Adobe documents free Adobe-ID access and
  royalty-free use in games at
  https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html .
- **Quaternius Universal Animation Library** is a CC0 alternative for general
  unarmed movement and combat: https://quaternius.com/packs/universalanimationlibrary.html .
  Its universal humanoid rig needs retargeting to this character; files cannot
  simply be renamed into Mixamo bone tracks.

The installed boss uses compatible clips already present in this repository;
no new online animation pack was downloaded or represented as installed. Mutant
keeps Creature Pack movement. El Chupacabra uses the pack's unarmed humanoid
locomotion plus retargeted creature strikes and the supplied zombie rake take.
Original character/animation licenses remain user-supplied and unconfirmed.

## Validation

Browser simulation checks weapon grips, human proportions, PBR maps, Q switching,
cooldown/health preservation, pistol attack releases and ultimate completion,
boss capsule/head scale, attack clips and actual damage against human targets,
AI approach and three-stage combinations, all three Gauntlet encounters, clearing
support before victory, enemy counts, repeated starts and the bounded zombie pool.
The normal player moves and ultimate sequences are checked separately. No build
output or permanent test directory is generated by this update.
