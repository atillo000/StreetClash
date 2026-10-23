# Ultimate skills

Every fighter now has an ultimate on **4**. It plays its ordered stages automatically using the existing combat state machine, hit windows, projectiles, area pulses, weapon trails and reaction system. No new physics or effects library was added.

| Character | Ultimate | Sequence |
| --- | --- | --- |
| Capoeira / Roda | Ginga ultimate | Opening armada → martelo → compasso finisher |
| Magician / Vesper | Astral rupture | Brief charge → astral projectile → nearby pulse |
| Soldier / Rook | Focused barrage | Brief aim → three-shot burst → heavy finishing shot |
| Archer / Talon | Heartseeker | Nock → quickshot → quickshot → brief overdraw → heavy arrow |
| Great Sword / Brand | Skybreaker | Crosscut → two-hit spin → jumping attack animation |
| Axe / Havoc | Cyclone execution | Two-hit combination → spinning cleave → downward chop |
| Mutant / Brute | Cataclysm | Brief intimidation → claw swipe → landing shockwave |
| Paladin / Aegis | Judgment | Radiant oath → sword cut → radiant finishing pulse |
| Parasite Zombie / Blight | Parasite feast | Scream → claw rake → claw rake → neck bite |

Early hits use light reactions and restrained knockback so the last hit can connect. Finishers can knock down. Contact, range, guard and line of sight still matter; the sequence does not guarantee every hit. Jumping attacks are authored animation motion, not new vertical traversal physics. Balance and exact contact timing remain editable.

## Files to edit

- `src/combat/fighterMoves.js`: Capoeira, Magician (`mage`), Soldier (`rifle`).
- `src/combat/ImportedMoves.js`: Archer (`bow`), Great Sword (`sword`), Axe (`axe`), Mutant (`mutant`), Paladin (`IMPORTED_MOVES.paladin`), Parasite Zombie (`IMPORTED_MOVES.zombie`).
- `src/characters/FighterCatalog.js`: animation paths for the first three characters.
- `src/characters/ImportedFighters.js`: animation paths for the other four.

Normal attacks and existing skills retain their own definitions. Ultimate stages are separate moves marked `sequenceOnly: true`.

## Change a key or stage order

Find the character's `.ultimate` definition:

```js
mage.ultimate = {
  label: 'Astral rupture',
  input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 22,
  skill: true,
  playerOnly: true,
};
```

For U, change `input` to `{ label: 'U', codes: ['KeyU'] }`. Pick an unused key. The HUD updates automatically. `sequence` contains move IDs in playback order; repeat an ID to repeat that stage. Archer demonstrates this with two `ultimateStrike` entries. Add a new stage definition and append its ID for a longer sequence. Each character has one cooldown, charged on activation, not per stage. Capoeira keeps the user's existing cooldown value.

`playerOnly: true` keeps ultimates out of the current bot move choices. Internal stages are also excluded from bot selection.

## Change an animation or timing

Each stage uses `move('Displayed name', 'AnimationAlias', { ... })`. Change the second argument to an existing embedded animation alias to swap it immediately. For a new FBX, add its alias/path INSIDE the fighter's `clips` object, then prepare that fighter's GLB.

- `speed`: animation playback multiplier.
- `endAt`: normalized progress where this stage advances to the next one. It must follow all hit windows and release events, and be no greater than 1.
- `windows`: melee damage windows, normalized from 0–1. Separate windows allow a multi-strike animation to hit the same enemy more than once.
- `events`: projectile or area release points, normalized from 0–1. Soldier's burst has three events; each Archer recoil stage releases one arrow.
- `strikers`: bones or weapon markers used for melee contact.
- `damage`, `knock`, `range`, `lunge`, `color`: gameplay/effect settings for that stage.
- Non-damaging charge stages have `windows: []`, `strikers: []`, and zero damage. Their shortened `endAt` avoids playing a whole idle/charge clip.

Do not speed up an entire clip just to skip a long lead-in. Trim source animation lead-ins where needed and align the windows/events with the actual motion. Saving JavaScript settings is enough for playback/timing/key changes; source animation path or trim changes require regeneration.

## Preparing changed animation sources

Run `npm start` from the repository folder. In a second terminal run:

```powershell
node scripts/asset-prep-server.mjs
```

Open `http://127.0.0.1:8123/scripts/prepare.html`. In Chrome DevTools Console:

```js
window.__prepareFighter = 'magic'; // capoeira, soldier, archer, greatsword, axe, mutant, paladin, zombie
await eval(await (await fetch('/scripts/prepare-user-fighter.js')).text());
```

The character's prepared GLB and source report in `assets/characters/generated/` are updated. Stop the receiver with Ctrl+C afterward and reload the game if live reload has not already done so. Missing sequence clips prevent activation without spending cooldown; their HUD slot shows a dash and preparation hint.

## Interruption and reset

Incoming hits, knockdown, dodge cancellation, KO and match end stop the remaining stages. Pause freezes playback; resume continues it. Restart clears the sequence and cooldowns. Ordinary attack presses cannot replace a running ultimate. No invulnerability or guaranteed target capture is added by default.

## Mutant animation source

Mutant uses `Mutant Boss Enemy Animation Pack/Creature Pack`, including `mutant punch`, `mutant roaring`, and `mutant jump attack`. Crater slam and the ultimate shockwave release at 44% of the jump-attack animation, matching its measured landing. Walk/run animation data matches the previous prepared version, so existing gait calibration is retained.

The supplied Creature Pack `mutant dying.fbx` fails Three.js FBXLoader with an unknown property type. `Defeat` therefore uses the supported shared `Boxing Animation/Defeat.fbx`; it does not fall back to Creature NPC Pack. Other shared reactions and strafing clips remain available as before.
