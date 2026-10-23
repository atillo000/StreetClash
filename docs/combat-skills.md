# Combat skills, click chains and effects

Tap **LMB / J** during each strike to queue the next of three basic attacks.
One follow-up is buffered at a time. Holding does not auto attack. Taking a hit,
guarding or dodging interrupts the chain; waiting after recovery expires it.
**RMB / L** keeps the existing heavy. **1 / K**, **2**, **3** are offensive skills.
**4** keeps the existing ultimate and cooldown. **E** evades; its conflicting
secondary-skill binding has been removed. **Space** still jumps.

| Fighter | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Roda / Capoeira | Martelo counter | Armada rush | Compasso sweep |
| Vesper / Magician | Twin-hand blast | Astral lance | Arcane rupture |
| Rook / Soldier | Breach kick | Suppressing burst | Armor-piercing shot |
| Talon / Archer | Hunter counter | Three-arrow volley | Pinning arrow |
| Brand / Great Sword | Sliding cut | Skywheel cleave | Skybreaker slam |
| Havoc / Axe | Double cleave | Whirlwind cleave | Leaping execution |
| Brute / Mutant | Crushing blow | Crater slam | Rending rush |
| Aegis / Paladin | Oathkeeper cut | Shield-line advance | Judgment cut |
| Blight / Parasite Zombie | Parasite bite | Ravenous lunge | Parasite shock |

Ranged basic chains fire three controlled shots/casts with a stronger third hit.
Sword fighters alternate cuts and a finisher; Axe ends in a spin, Mutant in a
small slam, and Zombie in a bite. Roda keeps Meia lua / Bencao / Armada.
Ranged shots and Zombie rakes reuse suitable clips where the supplied pack has
limited distinct attack motions.

## Editing the skills

`src/combat/CombatKits.js` is the final configuration layer, applied after the
existing definitions in `fighterMoves.js` and `ImportedMoves.js`. Edit this layer
for current numbered skills and basic chains; base changes can be overridden here.
The legacy internal names are `kick` = 1, `skill1` = 2, `skill2` = 3.

Example:

```js
c.kick = skill(c.ultimateStrike, {
  label: 'Martelo counter',
  clip: 'UltimateStrike',
  speed: 2.65,
  windows: [[0.38, 0.72]],
  damage: 17,
  cooldown: 3,
});
```

`clip` must be an embedded animation alias. Aliases like `UltimateStrike` are
reusable clips, not reserved exclusively for key 4. Check each fighter's `clips`
in `FighterCatalog.js` / `ImportedFighters.js` and its generated JSON report.
All clips used here are already embedded: no character GLBs were regenerated.
Adding a new FBX alias still requires the existing asset-preparation workflow.

`windows` contains normalized melee contact intervals; `events` contains
normalized projectile/area release times. Keep these aligned with the gesture.
Projectile moves need `kind: 'projectile'`, events, projectile speed/radius/range.
Area moves need `kind: 'area'`, events and a radius in `range`. Both use empty
melee strikers. Weapon attacks use `weapon:tip/mid/base`; unarmed attacks use
actual hand, foot or head bones.

`chain(kit, [[sourceMove, overrides], ...])` defines click stages. Source settings
are copied without ultimate-only flags. The state machine validates every chain
clip before starting. Early clicks survive recovery, including fast ranged moves.
Key mappings are in `src/core/controls.js`.

## Effects

`src/combat/ArcadeVFX.js` contains original pooled shader effects:

- Cyan rim shell and animated surface ripples for a confirmed block.
- Brief warm shimmer and expanding contact ring for a confirmed hit.
- Crescent arc for each melee active window. Use `vfx: 'sweep'` for horizontal arcs.

`Effects.js` combines these with existing Three.quarks sprites. Melee arcs are
triggered by `Combatant.postAnimation()` at active-window boundaries; contact
effects use the actual `world.onHit` result. Misses produce no contact shields.
The visuals add no armor, invulnerability or damage beyond existing combat rules.

This is a local energy shimmer, not full-scene background refraction. It avoids
another full-screen render pass. Geometry and materials are allocated once in
fixed pools: up to eight shells, eight rings and eight arcs, with lower quality
limits. Pause freezes effects; reset clears them. Tune colors, ripple frequency,
opacity and lifetimes in `ArcadeVFX.js`, and sprites in `QuarksEffects.js`.

## Custom work versus free assets

The screenshot-like result needs custom timing, mesh/shader shapes and layering.
A particle pack supplies ingredients rather than the complete combat look.
This update uses the existing [Three.quarks](https://github.com/Alchemist0823/three.quarks),
[Three.js shader materials](https://threejs.org/docs/#api/en/materials/ShaderMaterial)
and already imported [Kenney Particle Pack](https://kenney.nl/assets/particle-pack)
(CC0). New effect designs are original code. No new libraries or downloads were
needed, and the existing asset-license records continue to apply.

## Verification

An isolated Chrome simulation passed 60 checks: all nine chains, all 27 offensive
skills landing swept/projectile/area damage, early buffering, interruption,
effect clearing/expiry/pool limits and the E binding. Eleven additional checks
covered all nine existing ultimates, actual left-mouse events advancing the
Archer's live chain through 1/2/3, and absence of runtime/shader errors. A real
guarded contact produced the cyan shell and expected chip damage.
Temporary verification stayed outside the repository. No build or permanent
test files were generated.
