# Campaign and class powers

Choose **Campaign / missions & progress** in the Encounter selector, choose an unlocked mission, choose a fighter, and start. The six missions use the existing Dock 09 arena, zombies and two boss models. This is a local PvE mission campaign, with no new maps, cutscenes or online service.

## Missions and progression

1. Dock quarantine — three zombie waves, 150 seconds, 8 HP between waves.
2. The first Brute — Mutant plus two Parasites, 210 seconds, reduced enemy HP for the first boss contract.
3. Night shift — five zombie waves, 240 seconds, 8 HP between waves.
4. Predator contract — El Chupacabra plus three Parasites, 240 seconds.
5. The last watch — six reinforced zombie waves, 300 seconds, 8 HP between waves.
6. Ironworks finale — zombies, Mutant and El Chupacabra in three encounters, 420 seconds, one health pool without recovery.

Each mission unlocks the next on victory. Earn one star for clearing, one for finishing with at least 50% HP, and one for retaining at least 25% of the time limit. The same clear must meet each condition to receive its star; replaying preserves your highest star total and score. XP comes from first clears and improved best stars, so replaying the same result does not farm XP. Ranks are Recruit, Survivor, Hunter and Dock Champion; they do not increase combat stats. The results panel offers Retry and Next mission.

Progress saves at mission completion and mission selection using localStorage key **streetclash.campaign.v1**. It restores on the same browser profile and site origin. Saves are mission checkpoints, not a mid-fight resume; clearing browser data loses them. If storage is unavailable the game retains session progress and says so. Practice, standalone matches, defeats and timeouts do not grant mission progression. Existing local circuit records remain separate.

The standalone **Zombie Survival / five waves**, Mutant Hunt, Chupacabra Hunt, Gauntlet and Duel options remain. There are at most four active enemies: the main opponent plus three reused Parasite slots. Later survival waves increase enemy health, without adding unbounded actors.

Edit **src/game/Campaign.js** to change MISSIONS, durations, rewards, wave order, support count, enemy HP scale or between-wave healing. ArenaCircuit.js runs wave transitions and win conditions. EnemyPool.js reuses the support actors. A wave counts as cleared only after every enemy is defeated. Mission stars and best scores are validated and capped when loaded.

## Class powers and controls

| Fighter | Key | Power |
| --- | --- | --- |
| Capoeira | 3 | Compasso cyclone: moving wind funnel, one hit per target |
| Magician | 2 | Astral dragon: spectral dragon projectile, stops at first target or cover |
| Magician | 4 | Dragon covenant: existing sequence releases a dragon, then two summoned wisps with four one-second pulses |
| Soldier | 3 | Arc penetrator: weapon-origin electrical bolt into first target or cover; works with rifle and pistol |
| Archer | 3 | Gale arrow: narrow wind-wrapped projectile |
| Greatsword | 3 | Seismic breaker: floor-following wave, one hit per target; ground damage on confirmed grounded impact |
| Axe | 2 | Iron cyclone: broad wind funnel, one hit per target |
| Paladin | 3 | Judgment bolt: golden lightning from the weapon hand |
| Paladin | 4 | Guardian oath: existing sword sequence, then two holy sword wards with three one-second pulses |

Summons are temporary stationary arcane/holy constructs, not extra humanoid AI fighters. Their circle shows their active damage zone. Walls block pulses. Summons do not increase the number of combatants or replace your character assets. Pulses use light damage with zero knockback so they do not repeatedly throw a target out of their area. Walking out, guarding, invulnerability, terrain height and interruption before release remain relevant.

The new powers release from normalized animation events; pressing a key alone does not deal damage. Damage goes through existing takeHit/onHit handling, including guard, status, damage popups, critical finishers and scoring. Previous damage budgets and cooldowns remain in CombatBalance.js. A multi-pulse summon divides its activation budget across all pulses; it does not deal that full budget each second. Criticals occur at most once per target per activation. Moving cyclones and seismic waves hit each target once, and solid cover stops them. Death, round end, wave changes and reset clear powers.

## Editing powers and effects

- **src/combat/PowerMoves.js** maps character/move IDs to power types, range, release event, speed, radius and pulse count. Keep its configuration before CombatBalance so changing event counts does not inflate damage.
- **src/combat/PowerSystem.js** owns movement, swept hit tests, obstruction, timed damage and lifespan on the fixed simulation step.
- **src/combat/PowerVFX.js** owns eight reusable visual slots: original translucent dragon silhouette, animated wind ribbons, lightning segments, seismic arcs and orbiting wisps/swords. These are procedural spectral effects, not downloaded fully rigged dragon/minion character models.
- **src/combat/Effects.js** retains the installed Three.quarks and existing particle/sprite pools for impacts and trails. No dependency, texture pack or asset license was added. Quality limits reduce visual slots without reducing damage or changing mission rules.
- **src/ui/campaign.css** styles the campaign selector and result rewards. The existing gameplay HUD and buff visuals remain.

No additional character is required for these powers. If the roster grows later, an original Storm Lancer could specialize in chain lightning, a Beast Warden in mobile animal companions, or a Necromancer in controllable minions. A true companion fighter would need a licensed rigged model, locomotion/attack clips, friendly AI, navigation, target selection and a bounded companion pool. The current stationary summons provide a smaller working foundation without loading more humanoid rigs.
