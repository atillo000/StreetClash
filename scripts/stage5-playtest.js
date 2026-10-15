(async () => {
  const T = await import('three');
  const w = __world, m = w.match, p = __player, e = __dummy;
  const originalRandom = __ai.random;
  let seed = 12345;
  __ai.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const results = [];
  const check = (label, passed, detail) => results.push({ label, passed: !!passed, detail });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const tap = async code => { key(code, true); await wait(60); key(code, false); };
  function place(c, x, z) { c.position.set(x, 0, z); c.previousPosition.copy(c.position); c.mover.speed = 0; c.mover.velocity.set(0, 0, 0); }
  function step(playerBrain = () => {}) {
    m.update(1 / 60);
    if (!m.canFight) {
      for (const c of w.combatants) { c.previousPosition.copy(c.position); c.character.update(1 / 60); }
      return;
    }
    if (w.hitstop > 0) { w.hitstop = Math.max(0, w.hitstop - 1 / 60); return; }
    playerBrain(); __ai.update(1 / 60);
    for (const c of w.combatants) c.update(1 / 60);
    w.arena.resolve(w.combatants);
    for (const c of w.combatants) c.character.update(1 / 60);
    for (const c of w.combatants) c.postAnimation(1 / 60);
    m.resolveOutcome();
  }
  function active() { m.start(); m.update(3); seed = 12345; w.setPaused(true); }
  try {
    w.setPaused(false); m.toLobby();
    check('warehouse assets loaded and statically batched', w.arena.assetCount === 19 && w.arena.staticBatches <= 20, { models: w.arena.assetCount, batches: w.arena.staticBatches, draws: w.renderInfo.render.calls });
    check('lobby blocks attacks', m.state === 'lobby' && !p.tryAttack('punch') && !document.getElementById('lobby').hidden);
    document.getElementById('startMatch').click();
    await wait(150);
    const before = p.position.clone();
    key('KeyW', true); key('KeyJ', true); await wait(200); key('KeyW', false); key('KeyJ', false);
    check('countdown blocks movement and attacks', m.state === 'countdown' && p.position.distanceTo(before) < 1e-8 && p.state === 'free');
    await wait(2900);
    check('countdown starts timed match and AI automatically', m.state === 'active' && __ai.enabled && m.remaining > 118 && m.remaining < 120, m.remaining);
    await tap('KeyP'); const remaining = m.remaining; await wait(250);
    check('pause freezes match timer', w.paused && m.remaining === remaining);
    document.getElementById('resume').click(); await wait(150);
    check('resume advances timer', !w.paused && m.remaining < remaining);

    m.practice(); w.setPaused(true); __ai.enabled = true;
    place(p, -5, 1.5); place(e, -5, -6); __ai.reset();
    let routed = false;
    for (let i = 0; i < 540; i++) { step(); routed ||= Math.abs(e.position.x + 5) > 1.35; }
    check('real AI navigates warehouse cargo and reaches player', routed && e.position.distanceTo(p.position) < 1.5, { routed, separation: e.position.distanceTo(p.position), behavior: __ai.behavior });

    // Full match driven by real steering, guard and bat attacks. No health edits.
    active();
    const direction = new T.Vector3();
    for (let i = 0; i < 7200 && m.state !== 'results'; i++) {
      step(() => {
        direction.subVectors(e.position, p.position); const d = direction.length();
        const aim = Math.atan2(direction.x, direction.z);
        p.mover.lockFacing = aim;
        p.wantBlock = d < 1.4;
        p.mover.steer(d > 1.04 ? direction.normalize() : direction.set(0, 0, 0), d > 1.04 ? 1 : 0, true);
        if (d < 1.35 && ['free', 'block'].includes(p.state) && !['down', 'getup', 'dead'].includes(e.state)) p.tryAttack('heavy', aim);
      });
    }
    check('full combat match reaches victory results without health edits', m.state === 'results' && m.result?.outcome === 'victory' && m.result.damageDealt >= 100 - 1e-6 && e.hp === 0, m.result);
    w.setPaused(false); await wait(100);
    check('results UI shows final health and damage', !document.getElementById('results').hidden && document.getElementById('resultTitle').textContent === 'VICTORY' && Number(document.getElementById('resultDamage').textContent) >= 100);
    document.getElementById('rematch').click();
    check('rematch resets fighters and starts countdown', m.state === 'countdown' && p.hp === 100 && e.hp === 100 && m.remaining === 120 && m.stats.damageDealt === 0 && !__lock.target);

    // Exercise the defeat route with an actual AI hit on a low-health player.
    active(); place(p, 0, 0.9); place(e, 0, 0); p.hp = 3; p.iframes = 0; __ai.cool = 0;
    for (let i = 0; i < 600 && m.state !== 'results'; i++) step();
    check('AI knockout produces defeat and no automatic respawn', m.state === 'results' && m.result?.outcome === 'defeat' && p.hp === 0, m.result);
    for (let i = 0; i < 300; i++) step();
    check('finished match stays finished', p.hp === 0 && m.state === 'results');

    for (const [hpP, hpE, expected] of [[80, 30, 'victory'], [20, 60, 'defeat'], [50, 50, 'draw']]) {
      active(); p.hp = hpP; e.hp = hpE; m.remaining = 0.02;
      for (let i = 0; i < 130; i++) step();
      check('timeout outcome: ' + expected, m.state === 'results' && m.result?.outcome === expected, m.result?.reason);
    }
    w.setPaused(false); document.getElementById('returnMenu').click();
    check('return to dock restores lobby', m.state === 'lobby' && !document.getElementById('lobby').hidden && !w.paused);
    document.getElementById('practice').click();
    check('practice remains available without a match timer', m.state === 'practice' && !__ai.enabled && document.getElementById('timer').textContent === 'PRACTICE');
    check('no runtime error overlay', document.getElementById('errmsg').textContent === '', document.getElementById('errmsg').textContent);
    return { passed: results.every(r => r.passed), results };
  } finally {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyF']) key(code, false);
    w.setPaused(false); m.toLobby(); __effects.clear();
    __ai.random = originalRandom;
  }
})()
