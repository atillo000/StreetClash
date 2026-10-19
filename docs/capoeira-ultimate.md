# Editing Capoeira's ultimate

This placeholder uses one press of **4** to play `UltimateStart` → `UltimateStrike` → `UltimateFinisher`. It uses the normal hit detection and reactions, and has a single 20-second cooldown starting on activation. Hits, knockdowns, dodges, KO, match end and restart stop the remaining stages. Other fighters have no ultimate assigned.

## 1. Change the key or number of stages

In `src/combat/fighterMoves.js`, find `cap.ultimate`:

```js
cap.ultimate = {
  label: 'Ginga ultimate',
  input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 20,
  skill: true,
  playerOnly: true,
};
```

For U, change BOTH `label: 'U'` and `codes: ['KeyU']`. Choose an unused key: WASD, E, F, M, P, Q, R, T, Z and the existing attack keys already have actions. The input label and slot on the HUD update automatically. No main.js change is needed.

Two stages:

```js
sequence: ['ultimateStrike', 'ultimateFinisher'],
```

Four stages, reusing one strike twice:

```js
sequence: ['ultimateStart', 'ultimateStrike', 'ultimateStrike', 'ultimateFinisher'],
```

These strings are **move IDs** in this file. Their order and array length control playback. The sequence plays automatically, rather than requiring a new press for each stage. It doesn't require pressing the normal 2 and 3 skills together.

## 2. Change the animations

Edit the `clip` argument (second argument to `move`) in `cap.ultimateStart`, `cap.ultimateStrike`, and `cap.ultimateFinisher`. For example:

```js
cap.ultimateStrike = move('Ultimate Strike', 'Heavy', {
  // Keep the rest of this stage's current settings.
});
```

`Heavy` already exists in the prepared character. Selecting an existing embedded alias, changing move timing, or rebinding the key only requires saving and refreshing the game.

For NEW animation files, change these mappings INSIDE Capoeira's `clips` object in `src/characters/FighterCatalog.js`:

```js
UltimateStart: cap('au'),
UltimateStrike: cap('armada'),
UltimateFinisher: cap('martelo 2'),
```

`cap('filename')` means `assets/animations/Capoeira Character Animation Pack/Capoeira Locomotion Pack/filename.fbx`. Preserve filename capitalization. You can also use a complete relative path such as `./assets/animations/custom/my-kick.fbx`. New animations need to be compatible with the character's rig and prepared into its GLB as described below.

## 3. Add a distinct fourth stage

Add a stage definition BEFORE `cap.ultimate`:

```js
cap.ultimateExtra = {
  ...cap.ultimateStrike,
  label: 'Extra kick',
  clip: 'Kick', // Existing alias; or add your own alias in the catalog.
};
```

Append `'ultimateExtra'` to `sequence`. It inherits hit detection and `sequenceOnly: true` from the strike. You can repeat this for as many stages as you need. `sequenceOnly` prevents internal stages from being triggered as ordinary attacks or chosen individually by bots. `playerOnly` on the ultimate keeps this example out of the existing AI's move choices.

## 4. Match damage to the animation

- `windows: [[0.32, 0.55]]`: melee hit window from 32% to 55% of the clip. Adjust it to when the foot actually connects.
- `events`: projectile/area release points, also from 0–1.
- `speed`: playback multiplier; 1 is authored speed.
- `endAt`: when this stage finishes and the next one begins. Keep after its hit windows and events, at most 1.
- `damage`, `knock`, `lunge`: damage, knockback, forward impulse.
- `strikers`: bones or weapon markers that perform melee hit detection. The example uses feet.
- The wind-up has `windows: []`, `strikers: []`, and zero damage. It is deliberately non-damaging.

Each stage has independent hit tracking. Actual hits still require contact; this is a sequence framework, not a guaranteed cinematic combo. The placeholder's timing and balance need tuning to the final animations.

## 5. Prepare only Capoeira after changing animation source files

From the repository folder, run `npm start`. In a second terminal run:

```powershell
node scripts/asset-prep-server.mjs
```

Open `http://127.0.0.1:8123/scripts/prepare.html`, then run this in Chrome DevTools Console:

```js
window.__prepareFighter = 'capoeira';
await eval(await (await fetch('/scripts/prepare-user-fighter.js')).text());
```

Wait for completion, stop the receiver with Ctrl+C, and reload the game. Preparation replaces only `assets/characters/generated/capoeira.glb` and its source report `capoeira.json`; it does not build the site or regenerate the other fighters. If any sequence clip is missing, activation spends no cooldown and the ultimate slot shows a dash with an explanatory tooltip.
