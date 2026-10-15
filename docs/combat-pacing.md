# Combat pacing pass

Movement and combat timing were tuned together for a faster arcade feel. Controls are unchanged.

| Fighter | Run, m/s | Sprint, m/s | Locked movement, m/s | Acceleration, m/s² |
| --- | ---: | ---: | ---: | ---: |
| Capoeira | 6.4 | 7.8 | 3.8 | 42 |
| Magic | 5.7 | 6.8 | 3.8 | 36 |
| Soldier | 5.5 | 6.7 | 3.5 | 36 |

Capoeira was previously limited to 1.7 m/s when locked. Turning is quicker and gait cadence increases by 30% for Capoeira and 20% for the other fighters. Gait phase stays continuous across blends. Crouch travel increases to 1.35 m/s.

Attack playback, recovery cutoffs and follow-up windows are tuned individually. Every strike window and projectile event finishes before a combo or dodge may cancel the attack. Space pressed within 160 ms of the dodge opening is buffered, so it need not land on a single frame. Damage reactions and reset clear that buffer; dodges retain cooldowns and a finite invulnerability window. Buffered follow-up attacks also recheck cooldowns before starting.

Dodges cover distance more quickly, with a faster Capoeira cartwheel. Hit recovery, knockdown hold and get-up downtime are shorter. Capoeira attacks gain a stronger closing lunge. Melee AI runs the last few metres instead of switching to walking.

Ranged attacks snapshot their target point during startup rather than following a moving victim up to every shot. Projectiles remain straight after release. Rifle projectile speed falls from 38 to 24 m/s; shot damage changes from 9 to 8, burst damage from 8 to 7 per round, and shot cooldown from 0.45 to 0.6 s. AI can dodge diagonally toward a ranged attacker to close distance.

## Checks

- `npm test`: 36 passing tests, including reversal, continuous gait phase, collisions, strike windows, committed ranged aim, dodge buffering and interruption.
- `fighter-playtest.js`: all nine attacks still deal damage and recover; jump, guard, crouch, sprint and diagonal animation checks pass.
- `pacing-playtest.js`: all classes reach locked speed within 200 ms, reverse on the next simulation step, preserve attack commitment and execute buffered recovery dodges for every attack.
- `fighter-match-playtest.js`: Capoeira/Soldier, Capoeira/Magic, Soldier/Capoeira and Magic/Soldier complete through actual damage, result cleanup and rematch.

In the seeded sample, Capoeira dealt 53.6 damage against Soldier; the reversed matchup dealt 61.6 to Soldier. Magic dealt 79 to Soldier. Soldier won these samples, so this is an initial balance improvement, not a statistically validated balance result. Faster movement and cadence still need human playtesting for visual foot sliding and feel, plus performance checks on the target MX130.

With Chrome debugging on port 9222 and the game open at `http://127.0.0.1:8123`, run the additional browser check with:

```powershell
node scripts/browser-check.mjs @scripts/pacing-playtest.js
```
