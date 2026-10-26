# Performance and combat feel

Graphics dropdowns are available in the lobby and pause screen. Auto starts Balanced, reduces shadows/particles under sustained frame load, then adjusts rendering resolution with a minimum scale and recovery hysteresis. Performance, Balanced and High are fixed choices. Settings persist locally. Simulation, movement/skill speed, damage, collision and Supabase authority are unchanged.

Removed the duplicate render-loop weapon update, limited lobby animation to the selected fighter, skipped inactive attachment/hit-window work, replaced full rig traversals inside weapon/Soldier attachment queries with ancestor-only updates, and skipped sole sampling while foot correction is disabled. The 360 preview reuses the main shadow map rather than rendering it again. Idle particle batches no longer update continuously.

CombatJuice adds short render-only hit leans, a restrained camera lens impulse, directional textured impact streaks, health-panel feedback and footsteps. Original hit/fall/death clips remain authoritative; dead actors are never scaled or squashed. Render transforms are restored immediately after drawing. Reduced-motion preferences disable camera/body/UI motion feedback. Damage bars retain a short trailing health segment.

Sound uses reusable noise and layered transients/tones with per-cue cooldowns, pitch variation, a compressor and a 16-voice cap. Hits, criticals, guard, weapons, spell casts, dodges, footsteps and landings have separate envelopes. All cues are synthesized original audio, not downloaded recordings. Sound unlocks on user interaction and respects the existing mute control.

Online responsiveness also depends on Supabase's room-size update rates (15/10/6 Hz for 2/3/4 players) and network delay. These rendering optimizations do not remove that transport/interpolation delay. A direct peer transport or a dedicated server remains the next step for faster online responsiveness.

Global hit-stop is now restricted to short offline melee contacts (12–40 ms). Projectiles and online hits use hit reactions, camera/audio/UI cues instead of pausing everyone. This removes a source of perceived combat stutter without increasing movement speed.

Guests receive an immediate quiet input cue when pressing an attack while the round is active; hit sounds and damage effects still wait for host confirmation. This improves button feedback without predicting damage or bypassing network authority.
