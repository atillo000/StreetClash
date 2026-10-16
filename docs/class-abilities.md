# Stage 6: Class abilities, aiming and combat feedback

This stage adds two original skills per fighter using their supplied animation clips. No additional character downloads or FBX conversion are needed.

## Controls

Click the game canvas to capture the mouse, then move the mouse to aim the crosshair. Escape releases it. The camera shifts over the shoulder while captured and free aiming. Magic and Soldier strafe while facing the crosshair; Z sprint still allows ordinary travel. Tab switches to the existing target lock. J/K/L and their mouse alternatives remain available. Skills use the number-row **1** and **2**; Q remains graphics quality.

| Fighter | 1 | 2 |
| --- | --- | --- |
| Roda / Capoeira | Rush kick: forward gap closer, 18 damage, 4 s cooldown | Roda sweep: circular spin, 23 damage, 2.4 m radius, knockdown, 8 s cooldown |
| Vesper / Magic | Astral seal: aimed ground explosion, 23 damage, 2.3 m radius, 9 m placement range, 6 s cooldown | Phase step: directional escape, brief invulnerability, 5 s cooldown |
| Rook / Soldier | Focus round: slower startup with committed aim, 19 damage, 5 s cooldown | Tactical roll: directional escape, brief invulnerability, 5 s cooldown |

For either escape, hold a movement direction and press 2. With no movement input, the player escapes backward. These are physical movement abilities and stop at walls; Phase step does not teleport through cover. Mobility skill invulnerability spans animation progress 0.08–0.35, leaving startup and recovery vulnerable. Ordinary Space evade remains separate.

Capoeira's repeated J attacks chain Light → Kick → Heavy with damage 12/14/20. The third strike knocks down. Follow-up input can be buffered during an attack and executes after its strike window. The chain expires after 0.85 seconds outside its attacks, and guard, evade, another attack or taking a hit breaks it. K and L remain independent attacks with their own cooldown rules.

## Aiming and readability

- The crosshair ray selects visible enemies, cover or the floor. Shots originate at the hand/muzzle and retain world collision, so an unobstructed camera view cannot shoot through cover next to the fighter.
- Free aim suppresses the old nearby-enemy heading correction. Target lock and AI preserve committed target aiming. Ground-spell location snapshots at startup and clamps to placement range; moving the camera afterward does not move the warning.
- Pooled warning rings show area footprints and enemy attacks in red. Direction arrows show the committed attack heading. Warnings disappear on release, interruption, death or match end.
- Class-colored melee trails and impacts, synthesized cast/rifle cues, a brief hit-confirm reticle, damage/guard confirmation and a chain counter distinguish combat outcomes.
- Skill names and remaining cooldowns appear in the HUD. Camera shake and hit pauses are restrained to preserve the faster pacing.

AI uses rush kicks to close distance, selects offensive skills by range/cooldown, places seals at committed target positions, and uses escape skills under close pressure. Match balance is provisional; a few seeded matches are verification, not a win-rate study.

## Verification

`npm test` includes 42 checks across the current project, including chain buffering/expiry/interruption, escape vulnerability windows, collision against cover, manual aim, crosshair occlusion and targeted-area range/visibility.

With the game open at `http://127.0.0.1:8123` and Chrome debugging on port 9222:

```powershell
node scripts/browser-check.mjs @scripts/abilities-playtest.js
node scripts/browser-check.mjs @scripts/aiming-controls-playtest.js --gesture
node scripts/browser-check.mjs @scripts/fighter-playtest.js
node scripts/browser-check.mjs @scripts/fighter-match-playtest.js
```

These verify real character clips, all six skills, damage/recovery, interruption/cooldowns, the three-clip chain, mouse capture/look, keyboard skill activation, aimed confirmed hits, target lock, full AI matches and rematch cleanup. `--gesture` supplies a trusted browser key event so the pointer-lock test has user activation. `abilities-preview.js` stages a visible seal/focus-round startup for screenshots. `npm run build` includes the new modules in the existing static Vercel output.

This stage is now included in the GitHub-connected repository folder; see the
[cutoff and transfer record](repository-update-2026-10-16.md).
