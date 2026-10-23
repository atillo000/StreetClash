# Editing Capoeira's ultimate

Press **4** to play the three damaging stages: `UltimateStart` (opening armada), `UltimateStrike` (martelo), then `UltimateFinisher` (compasso). The previous non-damaging `au` cartwheel opener has been replaced. Your existing cooldown setting is preserved in `cap.ultimate`.

Edit `src/combat/fighterMoves.js`:

```js
input: { label: '4', codes: ['Digit4'] },
sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
```

For U, use `{ label: 'U', codes: ['KeyU'] }`. Remove, repeat or append stage IDs to change the sequence. Each stage definition above `cap.ultimate` contains its animation alias, speed, hit windows and damage. Animation paths are inside Capoeira's `clips` object in `src/characters/FighterCatalog.js`.

For a fourth distinct stage, define it before `cap.ultimate`:

```js
cap.ultimateExtra = {
  ...cap.ultimateStrike,
  label: 'Extra kick',
  clip: 'Kick',
};
```

Append `'ultimateExtra'` to the sequence. New animation aliases/files must be prepared into the GLB; existing embedded aliases, keys and gameplay settings only need a save/reload.

See [ultimate-skills.md](./ultimate-skills.md) for all nine characters, timing fields, hit/release events and the preparation workflow.
