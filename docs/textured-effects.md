# Textured combat effects

Rapier now simulates loose debris. Character movement and combat retain custom
fixed-step capsule/projectile/AABB collision. See rapier-physics.md.
Three.js renders the world and Three.quarks handles pooled sprite bursts.

TexturedVFX.js owns four shared CC0 Kenney images and pooled storm renderers.
The tornado combines two smoke-textured funnel surfaces, 12–24 camera-facing
clouds, a rotating dust decal and ten orbiting rubble pieces. Quality affects
cloud count. The lightning uses a thick white-core glow ribbon with four
branching forks and an endpoint flare; it stops at the real collision endpoint.
No renderer adds damage, knockback or collision bodies.

Holding guard shows a front-facing curved energy membrane. Bulwark/Poise use
a softer surrounding barrier; damage/speed buffs use light wisps and debuffs
use colored smoke. HUD effect labels and durations remain authoritative.
Contact flashes and weapon sweeps now sample authored flare/slash images.

Textures live in assets/textures/kenney and are already included by build.mjs.
No build output or permanent test files are required by this change.
These are layered real-time game effects, not fluid or volumetric simulation.
The dragon now uses original painted apparition artwork and layered flame tails;
see elemental-combat.md for the newer ability and terminal ragdoll presentation.
