(async () => {
  const T = await import('three');
  const player = __player, dummy = __dummy, world = __world;
  const results = [];
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const tap = async code => { key(code, true); await wait(60); key(code, false); };
  const check = (label, passed, detail) => results.push({ label, passed: !!passed, detail });
  function position(c, x, z) { c.position.set(x, 0, z); c.previousPosition.copy(c.position); c.mover.speed = 0; c.mover.velocity.set(0, 0, 0); }
  function reset() { world.match?.practice(); world.setPaused(false); __ai.enabled = false; player.reset(); dummy.reset(); __lock.clear(); __cam.yaw = 0; world.hitstop = 0; }
  try {
    reset(); await tap('Tab'); await wait(100);
    check('Tab acquires target', __lock.target === dummy && player.mover.lockFacing !== null);
    key('KeyD', true); await wait(500);
    const weights = player.character.loco.w;
    const lateral = (weights.StrafeRightWalk || 0) + (weights.StrafeRightRun || 0) + (weights.StrafeLeftWalk || 0) + (weights.StrafeLeftRun || 0);
    const angle = Math.atan2(dummy.position.x - player.position.x, dummy.position.z - player.position.z);
    check('lock movement uses strafe clips and keeps facing enemy', lateral > 0.5 && Math.cos(player.mover.facing - angle) > 0.98, { lateral, speed: player.mover.speed });
    const hips = player.character.bone('mixamorigHips').getWorldPosition(new T.Vector3());
    check('strafe has no animation ground drift', Math.hypot(hips.x - player.position.x, hips.z - player.position.z) < 0.03);
    key('KeyD', false); key('KeyS', true); await wait(500);
    check('locked backpedal uses reversed gait', player.character.loco.w.BackWalk + player.character.loco.w.BackRun > 0.5);
    key('KeyS', false); await tap('Tab');
    check('Tab releases lock', !__lock.target && player.mover.lockFacing === null);
    reset(); position(player, 11.3, 8); key('KeyD', true); await wait(450); key('KeyD', false);
    check('arena edge stops running capsule', player.position.x <= 11.62001 && player.position.x > 11.5, player.position.x);
    reset(); position(player, 3, -2); position(dummy, 0, 4);
    key('KeyD', true); await wait(650); key('KeyD', false);
    check('crate stops running capsule', player.position.x <= 3.72001 && player.position.x > 3.6, player.position.x);
    reset(); key('KeyD', true); await wait(250); await tap('KeyP');
    const paused = player.position.clone(), ticks = world.fixed.ticks;
    await wait(250);
    check('P freezes simulation and displays pause screen', world.paused && player.position.distanceTo(paused) < 1e-8 && world.fixed.ticks === ticks && document.getElementById('pause').style.display === 'flex');
    key('KeyD', false); await tap('KeyP'); await wait(350);
    check('resume clears held movement', !world.paused && player.mover.speed === 0);
    const budgets = [];
    for (let i = 0; i < 3; i++) { await tap('KeyQ'); budgets.push(__effects.budget); }
    check('quality controls particle budgets', [48, 96, 192].every(n => budgets.includes(n)), budgets);
    await tap('KeyM'); await wait(100);
    check('M toggles mute', document.getElementById('sound').textContent === 'OFF');
    await tap('KeyM');
    reset(); position(player, 0, 0.9); position(dummy, 0, 0);
    player.iframes = dummy.iframes = 0; __ai.cool = 0;
    await tap('KeyT'); await wait(3500);
    check('sparring AI approaches and damages player', __ai.enabled && player.hp < 100, player.hp);
    check('no runtime error overlay', document.getElementById('errmsg').textContent === '', document.getElementById('errmsg').textContent);
    check('animation bank includes directional and turn clips', ['StrafeLeftWalk', 'StrafeRightRun', 'TurnLeft', 'TurnRight', 'BackWalk', 'BackRun'].every(n => player.character.hasClip(n)));
    return { passed: results.every(r => r.passed), results };
  } finally {
    for (const code of ['KeyW','KeyS','KeyA','KeyD','ShiftLeft','KeyF']) key(code, false);
    reset(); await wait(400);
  }
})()
