# Movement verification — 2026-10-15

Tested the supplied game in a local headless Chrome session using its actual GLB models, FBX clips, renderer, movement controller, and combat state machine. No asset downloads or new dependencies were needed.

## Reproduction

The Soldier model has a parent rotated -90 degrees around X. Animation fitting previously froze hips X/Z **after** converting to that parent space. That froze vertical bounce while leaving forward travel intact. The gameplay pivot and camera moved independently of the animated model, so the model drifted away and snapped back on each loop.

A deterministic four-second run at 60 simulation steps per second measured:

| Measurement | Before | After |
| --- | ---: | ---: |
| Maximum horizontal hips offset from movement pivot | 3.138 m | < 0.000001 m |
| Largest hips pose step between frames | 3.101 m | 0.019 m |
| First-frame travel after reversing to +Z | -0.078 m | +0.080 m |

The final column includes the complete animation retargeting fix. The pose step includes normal vertical bounce and acceleration transitions.

## Changes

- Strip animation ground travel in upright source space, preserving height, before converting to the target rig.
- Map bone rotations through source and target bind poses; Xbot previously folded its legs upward because matching names were treated as matching bone axes.
- Use each GLB's native idle when the supplied `idle.fbx` cannot be parsed. Keep a static fallback for models without a native idle.
- Align Soldier's model heading with the retargeted clips.
- Travel along steering input while facing turns smoothly; stopping uses the same speed for displacement and animation.
- Advance walk and run with a continuous shared gait phase instead of resetting run time from walk time each frame.
- Add `npm start`, regression tests, and repeatable browser diagnostics.

## Validation

`npm test`: six passing tests covering a rotated parent, different bone bind axes, idle fallback, reversals, deceleration, and gait phase continuity.

Browser keyboard simulation: fourteen passing checks covering camera-right movement, W/S/A/D reversals, model centering, stopping, Shift walk/run, block entry/release, punch entry/recovery, dodge entry/recovery, both fighters' standing poses, and the runtime error overlay. No runtime error was displayed.

The browser harness uses Chrome's local debugging port 9222 and the game server on port 8123:

```powershell
npm start
# In another terminal, with a local Chrome debugging session open on the game:
node scripts/browser-check.mjs @scripts/playtest.js docs/movement-after.png
node scripts/browser-check.mjs @scripts/simulate-movement.js
```

The playtest sends keyboard events to the real input listeners; the deterministic simulation steps the actual movement and animation components directly. The scripts require Node.js with built-in WebSocket support (Node 22+).

Before: [original test capture](before-run.png). After: [corrected standing poses](movement-after.png).

The source `idle.fbx` remains unreadable; the native idle fallback handles it. This pass fixes movement and animation fitting; it does not replace the placeholder art or complete the broader game design.
