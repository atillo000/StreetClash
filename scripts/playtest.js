(async () => {
  const T = await import('three');
  const c = __player;
  __world.match?.practice();
  const results = [];
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (label, condition, detail) => { results.push({ label, passed: !!condition, detail }); };
  const release = () => { for (const code of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft', 'KeyF', 'KeyJ', 'Space']) key(code, false); };
  release(); key('KeyR', true); await wait(80); key('KeyR', false);
  // Move away from the dummy so fighter separation cannot obscure input travel.
  const start = c.position.clone();
  key('KeyD', true); await wait(500); key('KeyD', false); await wait(250);
  check('D moves camera-right', c.position.x > start.x + 0.5, c.position.toArray());
  let maxOffset = 0;
  for (const code of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
    key(code, true);
    for (let i = 0; i < 20; i++) {
      await wait(20);
      const p = c.character.bone('mixamorigHips').getWorldPosition(new T.Vector3()).sub(c.position);
      maxOffset = Math.max(maxOffset, Math.hypot(p.x, p.z));
    }
    key(code, false);
  }
  await wait(300);
  check('W/S/A/D keep model centered across loops and reversals', maxOffset < 0.001, maxOffset);
  check('key release stops movement', c.mover.velocity.length() < 0.01 && c.mover.speed === 0, c.mover.speed);
  key('ShiftLeft', true); key('KeyD', true); await wait(450);
  check('Shift selects walk speed', Math.abs(c.mover.speed - 1.7) < 0.01, c.mover.speed);
  key('ShiftLeft', false); await wait(450);
  check('releasing Shift selects run speed', Math.abs(c.mover.speed - 4.8) < 0.01, c.mover.speed);
  key('KeyD', false); await wait(350);
  key('KeyF', true); await wait(350);
  check('block enters guard', c.state === 'block', c.state);
  key('KeyF', false); await wait(300);
  check('block releases to locomotion', c.state === 'free', c.state);
  key('KeyJ', true); await wait(100); key('KeyJ', false);
  check('punch enters attack', c.state === 'attack', c.state);
  await wait(2500);
  check('punch recovers', c.state === 'free', c.state);
  key('Space', true); await wait(100); key('Space', false);
  check('dodge enters roll', c.state === 'dodge', c.state);
  await wait(2200);
  check('dodge recovers', c.state === 'free', c.state);
  for (const fighter of __world.combatants) {
    const h = fighter.character.bone('mixamorigHips').getWorldPosition(new T.Vector3());
    const foot = fighter.character.bone('mixamorigLeftFoot').getWorldPosition(new T.Vector3());
    check(fighter.name + ' has feet below hips', foot.y < h.y - 0.3, { foot: foot.y, hips: h.y });
  }
  check('no startup/runtime error overlay', !document.getElementById('errmsg').textContent, document.getElementById('errmsg').textContent);
  release(); key('KeyR', true); await wait(100); key('KeyR', false); await wait(500);
  return { passed: results.every(r => r.passed), results };
})()
