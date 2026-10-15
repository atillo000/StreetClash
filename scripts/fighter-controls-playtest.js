(async () => {
  const w = __world, p = __player, results = [];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const check = (label, passed) => results.push({ label, passed: !!passed });
  try {
    w.setPaused(false); w.match.toLobby();
    document.querySelector('[data-fighter="soldier"]').click();
    check('fighter button selects Soldier', p.profile.id === 'soldier');
    const rival = document.getElementById('opponentChoice'); rival.value = 'magic'; rival.dispatchEvent(new Event('change'));
    check('rival dropdown selects Magic', __dummy.profile.id === 'magic');
    document.getElementById('practice').click();
    key('KeyC', true); await wait(650);
    check('C holds crouch through input loop', p.crouching);
    key('KeyC', false); await wait(600);
    check('releasing C restores standing capsule', !p.crouching && p.height > 1.7);
    key('KeyX', true); await wait(180); key('KeyX', false);
    check('X starts physical jump', p.position.y > 0.2);
    await wait(1200); check('jump lands and recovers', p.position.y === 0 && p.state === 'free');
    key('KeyW', true); key('KeyZ', true); await wait(550);
    check('Z plus movement selects sprint', p.mover.sprinting && p.character.loco.w.Sprint > 0.85);
    key('KeyW', false); key('KeyZ', false); await wait(400);
    key('Tab', true); await wait(100); key('Tab', false);
    check('Tab acquires opponent', __lock.target === __dummy);
    check('ability labels match Soldier', document.getElementById('ability-punch').textContent.includes('Rifle'));
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: results.every(r => r.passed), results };
  } finally {
    for (const k of ['KeyC','KeyX','KeyW','KeyZ','Tab']) key(k, false);
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player','capoeira'); w.selectFighter('opponent','magic');
  }
})()
