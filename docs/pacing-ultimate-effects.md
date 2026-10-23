# Calmer pacing and ultimate completion rewards

The game now runs about 10% slower in movement and attacks, without changing the
fixed simulation timestep, input polling, mouse sensitivity, cooldown values,
status durations or damage values. The character rigs and animation sources remain
the same. No GLBs or production builds were regenerated.

## Speed settings

Edit `src/core/Pacing.js`:

| Setting | Factor | Effect |
| --- | --- | --- |
| movement | 0.90 | Walking, running, sprinting, strafing, crouching |
| attack | 0.90 | Basics, heavy attacks, numbered skills and ultimate stages |
| projectile | 0.90 | Arrows, rifle rounds and magic projectiles |
| lunge | 0.90 | Forward attack impulses |
| knockback | 0.90 | Attack pushback |
| dodge | 0.92 | Dodge animation and impulse |
| reaction | 0.95 | Hit, knockdown, get-up and guard animations |
| turn / acceleration | 0.95 | Small reduction while preserving input response |
| jump / gravity | 0.95 / 0.90 | Slightly slower flight, approximately the same height |

Multiplying animation rate by 0.90 means playback takes about 11% longer. Release
events and damage windows remain normalized to the animation, so they stay aligned
with the slowed gesture. Locomotion receives the paced profile speed and uses the
existing gait calibration. Profile source data is copied, not permanently mutated.
Shared move objects are tuned once to prevent repeated scaling when selecting
characters. HUD timers and camera look speed do not use a time-scale shortcut.

Flow was reduced to +10% movement and Hunter pace to +8%. After the 0.90 movement
factor, even those buffs stay just below the previous unbuffed speed. Their other
rules remain unchanged.

## Rewards after key 4

A reward is granted once, after the final ultimate stage fully completes. It does
not require a hit, but an interrupted ultimate grants no completion reward. The
buff can coexist with enemy debuffs; repeated applications refresh the same effect
rather than stacking. Death, class changes, reset and match end still clear it.

| Fighter | Four-second completion reward |
| --- | --- |
| Capoeira | Flow: +10% movement |
| Magician | Arcane surge: +15% direct damage |
| Soldier | Focus: +12% direct damage |
| Archer | Hunter pace: +8% movement |
| Great Sword | Poise: 35% less knockback; no stagger immunity |
| Axe | Fury: +18% direct damage, but takes 10% more direct damage |
| Mutant | Enraged: +15% direct damage, 30% less knockback, but 10% slower movement |
| Paladin | Bulwark: takes 20% less direct damage; also cleanses current debuffs |
| Parasite Zombie | Hunger: heals for 20% of subsequent unblocked direct damage |

`ULTIMATE_REWARDS` in `src/combat/StatusEffects.js` maps the class to its effect.
`configureStatuses()` assigns `statusOnComplete` to each ultimate. Paladin also
sets `statusCleanseOnComplete`. `Combatant` invokes `grantUltimateReward()` only
after the sequence finishes normally. Buff percentages/durations are in
`STATUS_TYPES`. The existing short, manually configured ultimate cooldowns are
preserved, so repeated ultimates may sustain buff uptime; this remains a balance
choice you can tune in the move definitions.

## Orbiting shield visuals

`src/ui/StatusPresentation.js` now displays persistent, transparent body shells
while an effect is active. Buffs have smooth shells and three orbiting shield
panels; debuffs have interrupted ripples and three jagged orbiting shards.
Existing ground rings, named HUD timers and explanatory skill tooltips remain.

The effects use original shader code and instanced shapes, with meshes allocated
once per fighter. They follow the character and pause with the game. Removing or
expiring statuses hides the shell and orbiting shapes. These visuals indicate an
active status; they do not grant a universal damage shield or invulnerability.
Actual protection comes from the named buff, such as Bulwark.

Adjust colors through `STATUS_TYPES`; adjust shell opacity, panel opacity, orbit
radius and angular speed in `StatusPresentation.js`. When several positive or
negative effects coexist, each category shares a shell colored by its first
active effect, while HUD chips identify every effect separately. This limits
clutter and draw calls. Existing hit/block flashes remain separate and brief.

## Verification

Browser checks covered all nine reduced movement profiles and dodge rates,
completion rewards, no startup rewards, interruption cancellation, expiry,
Paladin cleansing, projectile rates, preserved cooldowns, no double scaling,
paused visuals and removal of shells. Combat regression checks confirmed all nine
three-click chains and all 27 offensive skills still land damage at the reduced
rates. Visual inspection caught and corrected overly bright debuff shards.
No new dependencies, external assets, builds or permanent test files were added.
