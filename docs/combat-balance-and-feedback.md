# Combat balance and feedback

The October 23 balance pass uses damage budgets per activation, original arcade-style hit feedback, and the existing character animations and status auras. These are starting values for playtesting, not a promise of competitive parity.

## Change damage and cooldowns

Edit **src/combat/CombatBalance.js**, in DAMAGE_BUDGETS. The keys are character IDs from fighterCatalog.js.

| Fighter | LMB stages | RMB | Skills 1 / 2 / 3 | Ultimate base total | Ultimate cooldown |
| --- | --- | --- | --- | --- | --- |
| Capoeira | 8 / 9 / 13 | 18 | 15 / 18 / 22 | 60 | 24s |
| Magic | 8 / 9 / 12 | 22 | 18 / 22 / 24 | 58 | 24s |
| Soldier rifle | 5 / 5 / 8 | 18 | 15 / 21 / 25 | 56 | 24s |
| Archer | 3 / 3 / 5 | 20 | 15 / 22 / 25 | 56 | 24s |
| Greatsword | 8 / 9 / 13 | 24 | 18 / 24 / 26 | 64 | 26s |
| Axe | 9 / 10 / 15 | 26 | 20 / 26 / 27 | 66 | 28s |
| Paladin | 7 / 8 / 11 | 22 | 17 / 20 / 26 | 60 | 26s |

Each number is a base budget across ALL events/windows in that activation, before criticals, guard, status modifiers and misses. For example, 18 across three projectile events means 6 per projectile, not 18 each. A three-stage basic chain has three independent budgets. An ultimate budget covers its entire configured sequence. Actual contact can miss, be interrupted or be guarded; UI reports HP actually removed.

The Soldier pistol uses 80% of rifle projectile damage, with its existing faster firing animations and shorter range. Physical kicks retain their full budget. Enemy-only zombie basics are 3 / 3 / 5; bosses retain their larger health pools but have moderated attack damage.

The numbered skill fields map to kick (1), skill1 (2), skill2 (3). Change their cooldowns in the matching three-element cooldowns array. Animations, sequencing and keys remain in fighterMoves.js, combatKits.js and core/controls.js. The balance pass runs after combat kit/enemy configuration and before status/pacing configuration, so changing a raw damage value in an earlier kit is overridden by these budgets.

## Critical damage

A playable fighter's last basic chain stage and final ultimate stage can critically hit. There is no random critical roll. A critical applies **1.25x** direct damage, once per victim per activation; later hits from the same activation use normal damage. A multi-target attack can critically hit each victim once. A blocked hit never critically hits or consumes that opportunity. Delayed projectiles keep the context of the attack that fired them, even if the owner starts another move.

Change CRITICAL_MULTIPLIER in CombatBalance.js to adjust the actual bonus. Also update the finisher caption in ui/CombatFeedback.js if you change that constant. Creature enemies and damage-over-time ticks do not critically hit. Normal humanoid rivals use the same finisher rules as players.

## Status balance

Edit definitions and per-class application/rewards in combat/StatusEffects.js. Bleed deals 1.5 damage/second for 4 seconds; infection deals 1/second for 3 seconds and reduces healing to 75%. Hunger steals 15% of actual direct damage. Stacked movement multipliers are capped to 0.7–1.2, outgoing damage to 0.75–1.25, incoming damage multiplier to 0.75–1.2. Defense multipliers below 1 mean less incoming damage.

Existing ultimate completion rewards, cleanse behavior and orbiting/shield visuals remain. Interrupting a sequence still prevents its completion reward. Reapplying an active status refreshes its duration without producing another popup; current duration remains visible in the HUD. Expiry and cleansing get separate notices.

## Read the feedback

- Cream: ordinary outgoing damage. Red: incoming damage.
- Gold CRITICAL: earned finisher bonus. Blue GUARD: blocked damage.
- Small status-colored numbers: damage over time. Green HEAL: actual health recovered.
- World callouts identify positive/negative status applications; two short player notices explain their effects. Existing status chips and 3D auras show ongoing state.
- A short hit streak counts confirmed direct player hits and total actual damage. It excludes blocked and periodic hits and fades after 2.2 seconds without a hit.

Rapid hits within 120ms merge to keep volleys readable. UI nodes are pooled (maximum 40, reduced with quality), with at most two active status callouts per target. Feedback freezes while paused and clears on arena reset/menu. Layout and styling live in ui/CombatFeedback.js and ui/combat-feedback.css; impact warp/shells remain in combat/ArcadeVFX.js.

F1 toggles debug presentation; F2 cycles quality only while debug is enabled. Q remains Soldier weapon switching. No dependencies or generated assets are needed for this feature.
