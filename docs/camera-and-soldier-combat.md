# Camera and Soldier combat

## Camera

The old camera clamped pitch to 0.12–0.85 radians (roughly 7–49 degrees). Its position always looked at the player, so just increasing the clamp would still stop upward viewing when the camera reached the floor.

ThirdPersonCamera.js now keeps view orientation separate from the collision-safe orbit. Mouse pitch and yaw have no angular hard stop. Quaternion orientation passes through straight up/down and can continue through a full rotation. Camera collision, compact zoom, smoothing and boss framing remain. A one-second grace period gives manual mouse look priority over automatic lock-on yaw. Movement uses the horizontal view direction even after passing a vertical pole. Passing a pole can invert the view; this follows the unrestricted rotation requested. Tab still toggles target lock.

Edit sensitivity in **src/core/ThirdPersonCamera.js**. Orbit position still has elevation bounds to keep it above the ground; these do not clamp the direction the user can look.

## Active Soldier combat

The installed firing rifle clip lasts about 1.17 seconds and contains very little torso motion. Previously all three basic stages reused the same clip, attacks disabled movement, and pistol shots were minimal recoil over idle. Bullets existed in the simulation but their 3.5cm-wide meshes were difficult to read at gameplay distance.

The Soldier now uses a tactical arcade shooting style:

- LMB: three distinct aimed shot actions with recovery and small weight shifts.
- RMB: a short combat burst.
- 1: the existing close-range breach kick.
- 2: advancing fire, a controlled burst that permits movement.
- 3: Arc penetrator, the existing special lightning shot; this intentionally remains an electrical special rather than a ballistic round.
- 4: acquire / focused burst / stopping shot sequence.
- Q: rifle/pistol switching, retaining health, cooldowns and status effects.

Basic shots, RMB and skill 2 permit movement at 60% of normal movement speed. Upper-body shooting clips blend additively over the dedicated lower-body locomotion. The rifle uses an authored aiming stance when ready. A reversible upper-body layer follows aim elevation and horizontal target direction and applies recoil only when an actual shot is released. Hit reactions, guard, roll, jump and kick retain their original full-body behavior.

Original clips remain embedded and unchanged. Short runtime variants are derived from your existing rifle and pistol clips; no new mocap download is claimed, no large GLB rebuild is required, and character models/weapons remain your existing assets. Rifle movement still uses the supplied rifle pack; pistol movement uses the supplied pistol pack. Damage budgets and cooldowns remain centralized in CombatBalance.js. Pistol projectile stages, including ultimate stages, use 80% of rifle damage.

## Visible bullet travel

Projectiles.js still advances real bullets and performs swept hit tests. BulletTracers.js adds bounded luminous streaks (128 reusable slots, 0.1-second lifetime) following those actual positions. A streak is clipped to the confirmed body, wall or ground hit; it does not draw through an enemy into a wall behind it. These effects do not deal damage or change the hitbox. Bullet range and speed remain arcade values rather than real firearm velocities. The muzzle flash remains a separate effect. Reset/menu transitions clear the trail pool.

## Manual editing

- **src/characters/SoldierCombat.js**: action names, durations, normalized firing events, playback speeds, movement-enabled shots and pose/recoil response.
- **src/characters/SoldierLoadout.js**: ready stance and rifle/pistol action aliases, sidearm damage/range.
- **src/characters/Character.js**: additive upper-body action support and the optional pose-layer hook; other fighters retain their existing full-body actions.
- **src/combat/Projectiles.js**, **BulletTracers.js**: bullet simulation and visual tracer size/lifetime.
- **src/characters/fighterCatalog.js** and **scripts/prepare-user-fighter.js**: the existing source-animation import/preparation pipeline.

To supply a new animation, add a matching named clip to the Soldier catalog and prepare that fighter using the existing workflow. The runtime builder preserves an already supplied action with its target name. Full-body replacements should disable mobileFire for that move unless converted to an additive upper-body clip. New upper-body clips must use the same rig and have their reference pose and release events aligned; changing just playback speed does not repair mismatched weapon grips. Pistol aliases use the Pistol prefix, for example PistolRifleShotI.

## Free animation sources checked

- **Mixamo**: https://www.mixamo.com/ . Adobe confirms it is free with an Adobe ID and supports royalty-free game use: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html . This Soldier already uses a Mixamo-compatible humanoid skeleton. Suggested catalog search terms for this tactical style: Firing Rifle, Rifle Aiming Idle, Rifle Run, rifle strafe, rifle reload, and handgun firing. Preview against the actual Soldier before choosing a take; download FBX without skin and in-place locomotion where offered. Account-based downloads were not performed in this session.
- **Quaternius Universal Animation Library**: https://quaternius.com/packs/universalanimationlibrary.html . The official page lists CC0 licensing, humanoid retargeting, directional locomotion and gun/combat motions. Its universal rig is an alternative source, not a drop-in Mixamo action: it needs retargeting and grip checks. The free and expanded tiers differ; check that the desired take is in the free download. Replacing the existing humanoid with Quaternius's preview character is unnecessary.

For the next mocap additions, prioritize a rifle buttstock strike, a rifle reload/bolt action, and a dedicated handgun firing take. Those fill gaps in the installed packs more usefully than adding another generic walk animation. The current implementation already supplies the camera, tracer, aiming, recoil and mobile-fire behavior while those future clips can be swapped in through the existing pipeline.
