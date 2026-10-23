# Status effects, attached visuals and companions

## Death fix

Every character (including zombie, Mutant and Chupacabra) uses the Defeat clip
from its own supplied animation package. The onKill hook stops any old ragdoll
and clears statuses. Ragdolls.enabled defaults to false, so it cannot override
the character's pose. No rig/model/animation asset was regenerated. Rapier debris
and the existing hit/launch/landing animations stay active.

## Status mechanics

Edit src/combat/StatusEffects.js:
- STATUS_TYPES defines duration, color, stat modifiers, control, DOT or shield HP.
- STATUS_LOADOUTS assigns statuses to confirmed moves. kick=1, skill1=2, skill2=3.
- ULTIMATE_REWARDS supplies the class buff on completion, not on button press.

Reapplications refresh duration without stacking. Duration/ticks stop on pause.
Death/reset remove effects. Cleansing removes debuffs and releases stun.
Status multipliers are recomputed and bounded; base profile stats stay intact.

Soldier Breach kick (1) applies 0.65 s stun to unguarded regular enemies. It
interrupts attacks/movement but cannot extend active stun. After stun ends or is
cleansed, 1.25 s immunity prevents immediate chaining. Bosses, dodges, knockdown
and get-up resist stun. Existing physical knockback still resolves.

Zombie Parasite shock (3) applies poison: 1.25 HP each second for four seconds.
Bites retain infection. Poison refreshes without stacking and does not crit,
stagger, trigger lifesteal or reapply other debuffs. Poison/bleeding bypass shields.

Paladin guardians grant an 18 HP Aegis shield for their three-second summon.
Completing the ultimate extends its duration to five seconds without refilling
spent shield HP. Magician completion grants a 10 HP Arcane ward for four seconds.
Shields absorb direct damage after defense/guard reduction; overflow hits HP.
A fully absorbed hit does not stagger or apply enemy debuffs. Self buffs still
trigger on contact. Refreshing an active shield preserves spent capacity.
HUD chips show remaining shield HP and lifetime; absorption has a dedicated popup.

Completed ultimates mark class rewards as empowered for up to four seconds.
This adds a following class aura/orbitals, not another damage multiplier.
Ordinary skill refreshes cannot extend the empowered timer. Interrupted ultimates
do not grant completion rewards. Death removes their following visuals.

## Visuals and indicators

src/ui/StatusVisuals.js contains the editable visual mapping and original vector
icons. Stun stars orbit the head; poison/bleeding mist attaches to the chest;
focus/power glow follows the hand; movement effects follow the feet. Skeleton
bones are cached per character and refreshed when a different rig is selected.
Shields keep the curved energy membrane. World icons prioritize control, shields,
companions and damage-over-time; the full HUD list keeps every active effect.
Low/medium/high show two/three/four world icons per fighter, using fixed slots.
Icons, colors, countdowns and duration bars communicate state without debug text.

## Following companions

The Magician's two small painted spectral dragons orbit/follow the caster and
attack for four one-second pulses. Paladin's two actual sword models orbit/follow
for three pulses and grant Aegis protection. The creatures are sprite-based
apparitions using the existing original atlas; no new creature model was imported.
Pulse damage retains the existing total budget per target and line-of-sight
checks, rather than adding hidden extra attacks. Attack streaks start at an
orbital's position. Owner death, expiry, recast and match reset dismiss summons
and remove their status indicator. Multiple copies of the same summon do not stack.

PowerSystem.js owns following centers, targeting, lifetime and damage.
PowerVFX.js / ElementalEffects.js own orbit visuals; PowerMoves.js owns range,
powerPulses and the selected ultimate stage. Effects never decide damage.

No extra library, external asset download, build output or permanent tests were
added. The new icon artwork is original canvas/SVG code. Existing licensed
particle textures, original elemental atlas and sword model are reused.
