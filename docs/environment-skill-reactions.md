# Skill and environment reactions

Edit src/combat/EnvironmentMoves.js to assign a response to a move after its final combat configuration. src/combat/EnvironmentReactions.js dispatches those responses from actual active windows, cast events, surface contacts and distance-spaced power travel. Existing pooled particles, elemental artwork, decals, terrain and Rapier fragments are reused. No new dependencies.

| Fighter | Response |
| --- | --- |
| Capoeira | Wind pressure and low dust; cyclone stirs loose rubble and can damage breakable props along its route. Kicks do not excavate concrete. |
| Magician | Arcane light and surface scorch on actual projectile contacts; heavy/rupture leave temporary scorch rather than holes. Familiars pulse air/light without destroying the floor or crates. |
| Soldier | Rifle rounds chip surfaces at contact only. Electrical ability adds a discharge at its hit; no earthquake from bullets or body hits. |
| Archer | Arrow surface chips; gale arrow leaves a wind response. No crater from volleys or ultimate arrows. |
| Greatsword | Selected heavy cuts fracture only when the active weapon reaches the floor. Seismic breaker fractures a distance-spaced route even without an enemy; stops at cover. Frost mist accompanies seismic impacts. |
| Axe | Heavy chops fracture on actual floor contact. Moving cyclone stirs debris with warm light; ordinary spinning attacks do not automatically crater the arena. |
| Paladin | Sword floor contacts make small chips. Bolt adds holy contact light. Guardian pulses illuminate a low field and disturb loose debris; no floor excavation. |
| Mutant | Ground-directed slam and final area stage create temporary craters and rubble. Other hand strikes remain contact based. |
| Chupacabra | Pounce/area landing fractures the floor; howl is airborne shadow pressure. Claws do not inherit Mutant slam craters. |
| Parasite zombie | Airborne toxin pulse. Bites, claws and screams do not tear up concrete. |

groundResponse is none, chip, scorch, frost, or fracture. Only fracture changes terrain vertices. surface ground opts an area into floor contact; air never projects airborne attacks onto the floor. groundContact requires an actual active weapon sweep to touch the floor. path seismic or wind samples travel, not enemy hit locations. pathPropDamage limits each breakable to one fractional hit per travelling power, independently of render rate. Walls continue to block propagation. Setup poses never destroy scenery.

Environmental responses do not change character damage, cooldowns, hitboxes or skill bindings. Debris disturbances use Rapier linear velocity when available and the existing fallback otherwise; solid buildings are not destructible. Scorch is a temporary surface mark, not a persistent fire hazard. Air effects are visual pressure/mist/light, not a fluid simulation. Ground deformation and floor decals retain the existing nine-second lifetime with two-second restoration. Reset clears them through the existing effects/terrain reset.
