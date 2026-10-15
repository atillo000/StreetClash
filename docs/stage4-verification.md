# Stage 4 — Training arena

Implemented and tested locally on 2026-10-15. The game remains JavaScript ES modules and Three.js r160, served directly from the project. No new packages or downloaded assets were added.

## Play

Run `npm start`, open <http://localhost:8123>, then click the canvas to capture the mouse.

| Control | Action |
| --- | --- |
| WASD / arrows | Camera-relative movement |
| Shift | Walk |
| Tab | Lock nearest visible opponent / release lock |
| WASD while locked | Strafe or backpedal while facing the opponent |
| J / left click | Three-strike punch animation; later strikes can miss after knockback |
| K / E | Kick |
| L / right click | Bat swing |
| F held | Frontal guard; heavy attacks break it |
| Space | Roll in movement direction; early invulnerability, visible cooldown |
| T | Enable/disable sparring AI |
| R | Reset both fighters, lock, hitstop, effects and defensive timers |
| P / Resume button | Pause/resume |
| M | Mute/unmute synthesized sound cues |
| Q | Cycle quality, including particle budget |
| F1 | Show attack phases, strike speeds, draw calls and particle counts |
| B / V | Adjust bat grip / toggle bat |
| Esc / wheel | Release mouse / zoom |

Losing focus or hiding the tab pauses the game and clears held inputs. Sound unlocks after a real keyboard or pointer gesture, as required by the browser. A gold ground ring marks the locked opponent; lock releases on death, blocked sight or excessive distance.

## Implementation

- Gameplay and animation mixers step at 60 Hz. The render loop interpolates fighter positions and headings, preserving authoritative physics transforms. Catch-up is limited to six steps so a long browser stall does not cause a simulation backlog. Hitstop freezes combat on fixed steps while feedback continues.
- Grounded upright capsules collide with arena boundaries and four visible crate AABBs. Box sweeps prevent fast movement from crossing crates; relative circle sweeps prevent opposing fighters from passing through one another. Iterative separation handles coincident fighters and wall pressure. Static camera blockers shorten the follow-camera distance when necessary.
- Lock-on uses existing strafe and turn FBXs plus reversed walk/run clips for backpedaling. Turn clips contribute footwork with authored hips yaw removed, keeping heading under controller control. Lock-on travel is capped at 2.8 m/s, free running at 4.8 m/s, walking at 1.7 m/s.
- Attack clips are trimmed around their usable motion. Their normalized timeline windows define startup, active and recovery phases. The punch has three strike windows; kick and bat each have one. Follow-ups can be buffered into recovery, and rolls can cancel late recovery.
- Hands, feet and three bat markers sweep against moving target capsules. Sweeps are clipped to the active portion of the simulation step, including the target's relative movement. All markers share one hit ledger per victim per strike window; startup/recovery, duplicate markers and blocked sight cannot create extra damage.
- Block, roll, stagger, knockdown/get-up, death/respawn and reset use the existing state machine with phase reporting and defensive timer cleanup.
- Sparks, bat trails and slam rings share a bounded instanced pool: one particle draw call, reusable storage, and quality budgets of 48/96/192. Short Web Audio cues distinguish light/heavy hits, guard impacts and movement/attack sounds. Medium is the default graphics setting.

## Verification

`npm test`: **17 passing regression tests**. Coverage includes the earlier animation-fit fixes, fixed-step consistency at 30/60/144 rendering rates, bounded catch-up, crate tunneling and sliding, opposing/touching/coincident fighters, wall pressure, swept hits and vertical misses, active-window target movement, obstacle sight checks, lock behavior, per-window hit limits, guard breaks, dodge invulnerability, buffering/reset and particle recycling.

Local Chrome browser checks passed using the actual project models, clips and WebGL renderer:

- `scripts/playtest.js`: 14 original movement/combat input checks.
- `scripts/stage4-playtest.js`: 14 additional checks for lock acquisition/release, directional animation selection, model centering, boundaries/crates, pause/resume, quality budgets, mute, sparring damage, missing clips and runtime errors.
- `scripts/stage4-combat.js`: six deterministic real-asset combat scenarios. From 0.9 m separation, punches landed twice for 14 damage, kick once for 11, and bat once for 26. Frontal block reduced punch damage to 3.15 total; a heavy guard break dealt 15.6 damage and the target completed knockdown/get-up. An out-of-range swing missed.
- `scripts/stage4-audio.js` with a trusted CDP key gesture: AudioContext running, all five cue types scheduled, muted cue suppressed. This validates the browser audio path, not speaker hardware.

Re-run with a local Chrome debugging session on port 9222 and the game server on 8123:

```powershell
node scripts/browser-check.mjs @scripts/playtest.js
node scripts/browser-check.mjs @scripts/stage4-playtest.js docs/stage4-arena.png
node scripts/browser-check.mjs @scripts/stage4-combat.js
node scripts/browser-check.mjs @scripts/stage4-audio.js --gesture
```

[Arena screenshot](stage4-arena.png)

## Remaining scope

This is the Stage 4 gameplay foundation with placeholder Soldier/Xbot models and synthesized sound. Custom stylized fighters, class abilities, final art/audio, jumping and arena navigation for the simple sparring AI belong to later work. The AI can become blocked by a crate. Capsule-vs-box corners use conservative expanded AABBs. GPU performance on the user's physical MX130 has not been measured; the quality settings are available for that check. The existing unreadable `idle.fbx` continues to use native GLB idle fallbacks.
