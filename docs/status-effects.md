# Buffs, debuffs and trade-offs

These are an initial original balance pass, not a reproduction of another game's
class rules. Both the player and bots use the same status system. All skill
effects below require an unblocked confirmed hit; pressing a skill or missing
does not grant them. Additional rewards are earned on a completed ultimate, plus Paladin's defensive reward on a successful
block. Numbers in the trigger columns are the actual keyboard skill slots.

| Fighter | Positive effect / trigger | Enemy effect / trigger |
| --- | --- | --- |
| Capoeira | **2: Flow** — +10% movement, 4s | **3: Off balance** — +25% knockback received, 3s |
| Magician | **3: Arcane surge** — +15% direct damage, 4s | **2: Weakened** — -15% direct damage dealt, 4s |
| Soldier | **2: Focus** — +12% direct damage, 4s | **3: Exposed** — +15% direct damage received, 4s |
| Archer | **2: Hunter pace** — +8% movement, 4s | **3: Hobbled** — -25% movement, 3s |
| Great Sword | **2: Poise** — -35% knockback received, 4s | **3: Sundered** — +15% direct damage received, 4s |
| Axe | **2: Fury** — +18% direct damage, but +10% direct damage received, 4s | **3: Bleeding** — 2 HP/s for 4s |
| Mutant | **3: Enraged** — +15% direct damage and -30% knockback, but -10% movement, 4s | **2: Crushed** — -20% movement, 3s |
| Paladin | **2: Bulwark** — -20% direct damage received, 4s; also 2s after a successful block | **3: Judged** — -10% direct damage dealt, 4s; also cleanses the Paladin's debuffs |
| Parasite Zombie | **2: Hunger** — heal for 20% of subsequent unblocked direct damage, 4s | **1 or 3: Infected** — 2 HP/s and 50% less healing, 4s |

Fury and Enraged are trade-off buffs: their drawbacks remain for the buff's whole
duration. Cleansing negative effects does not selectively remove those costs.
Poise reduces knockback only; it does not grant stagger/knockdown immunity.
Slows affect normal movement, walking, strafing and sprinting. They do not alter
knockback, attack lunges or dodge impulses, allowing escape options.

## Timing and stacking

- The same effect refreshes rather than stacking. Refreshing bleed/infection
  preserves progress toward the next tick.
- Different effects multiply, with bounds: movement 60–125%, outgoing direct
  damage 65–140%, incoming direct damage 65–135%, knockback 40–140%, healing
  25–125%. These are aggregate safety limits, not additional bonuses.
- Bleed/infection tick once per simulated second. Each is 8 HP over its original
  four-second lifetime. They can coexist. After application they bypass guard,
  dodge and spawn/get-up invulnerability, and can cause a knockout.
- Periodic damage causes no repeated stagger, hitstop, knockback, new statuses or
  lifesteal. It contributes damage and knockout outcome without increasing the
  landed-hit statistic. It does not scale with direct-damage modifiers.
- Hunger heals actual HP damage dealt, including an overkill cap, without going
  above maximum health. It does not heal from blocked hits or damage over time.
  Earning Hunger starts healing on following hits, not the hit that grants it.
- Durations use simulation time and freeze during pause/hitstop. Death, reset,
  class replacement and match end clear effects. Player effects can carry across
  gauntlet encounters only for their remaining short duration; enemies reset.

## Display and editing

`src/combat/StatusEffects.js` contains `STATUS_TYPES` (names, durations, stats,
colors), `ULTIMATE_REWARDS` (key 4 completion), and `STATUS_LOADOUTS` (which skill applies each effect). `skill1` is key 2,
`skill2` is key 3, and legacy `kick` is key 1. `configureStatuses()` runs after
`CombatKits.js`, so animations, click chains and ultimate definitions are retained.

Example:

```js
flow: {
  label: 'Flow', positive: true, color: 0xe9c37a,
  duration: 4, moveSpeed: 1.10,
  description: '+10% movement speed.',
}
// In STATUS_LOADOUTS:
capoeira: { skill1: { statusSelf: ['flow'] } }
```

Use `statusTarget` for an enemy debuff, `statusSelf` for a personal buff, and
`statusCleanse: true` to remove the attacker's debuffs on a confirmed hit.
Effects travel with the move metadata, including projectiles that land after
their owner starts another animation. Direct-damage modifiers are evaluated at
impact time. No random critical hits, hard stuns or roots were added.

`Combatant` owns per-fighter status instances; base moves/profile stats are not
modified. `Mover.statusSpeed` adjusts speed while preserving the existing gait
system. `StatusPresentation.js` draws thin full buff rings and broken debuff rings,
plus named HUD chips with remaining seconds. Skill/chip tooltips explain effects.
Colors supplement the explicit +/minus text. Adjust presentation in
`src/ui/status-effects.css`. Meshes are allocated once per fighter; no external
assets or new packages are needed.

## Validation

Browser simulation verified every configured skill applies its effect through
actual melee/projectile/area contact, refresh/expiry, damage/defense modifiers,
real movement changes, knockback, healing/lifesteal, exact periodic ticks,
cleanse, blocked-hit rules, KO/score handling, pause, resets and class changes.
Visual checks confirmed HUD timers and persistent auras. Temporary verification
remained outside the repository; no build or permanent test files were created.

The values are intended as readable starting points. Longer play sessions against
bots are still needed to tune class balance and the boss difficulty.

See [pacing and ultimate effects](pacing-ultimate-effects.md) for the four-second completion rewards and orbiting body shields.
