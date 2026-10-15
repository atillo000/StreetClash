(async () => {
  const T = await import('three');
  const w = __world, p = __player, results = [];
  const check = (label, passed, detail) => results.push({ label, passed: !!passed, detail });
  const step = () => {
    for (const c of w.combatants) c.update(1/60);
    w.arena.resolve(w.combatants);
    for (const c of w.combatants) c.character.update(1/60);
    for (const c of w.combatants) c.postAnimation(1/60);
    w.projectiles.update(1/60);
  };
  try {
    for (const id of ['capoeira','magic','soldier']) {
      w.setPaused(false); w.match.toLobby(); w.selectFighter('player',id);
      w.match.practice(); w.setPaused(true); __ai.enabled = false;
      p.position.set(0,0,5); p.previousPosition.copy(p.position);
      p.mover.lockFacing = 0; p.mover.steer(new T.Vector3(1,0,0),1);
      for (let i = 0; i < 12; i++) step();
      check(id + ': reaches locked speed within 200 ms', Math.abs(p.mover.speed - p.profile.lockSpeed) < .01, p.mover.speed);
      p.mover.steer(new T.Vector3(-1,0,0),1); const x = p.position.x; step();
      check(id + ': reverses travel on next step', p.position.x < x);
      for (const attack of ['punch','kick','heavy']) {
        p.reset(); p.position.set(0,0,6); p.previousPosition.copy(p.position); p.tryAttack(attack,Math.PI);
        const m = p.move, action = p.character.action, duration = action.getClip().duration;
        const threshold = m.dodgeCancelAt ?? m.cancelAt;
        // Press 80 ms before the recovery window; startup must remain committed.
        action.time = Math.max(0, threshold * duration - m.speed * .08);
        check(id + ': ' + attack + ' cannot evade before strike ends', !p.tryDodge(Math.PI/2) && p.state === 'attack' && !!p.dodgeBuffer);
        for (let i = 0; i < 9; i++) step();
        check(id + ': ' + attack + ' buffered evade opens in recovery', p.state === 'dodge' && p.buffer === null, p.state);
        for (let i = 0; i < 150; i++) step();
        check(id + ': ' + attack + ' evade recovers cleanly', p.state === 'free' && p.dodgeBuffer === null);
      }
    }
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: results.every(r => r.passed), results };
  } finally { w.setPaused(false); w.match.toLobby(); w.selectFighter('player','capoeira'); w.selectFighter('opponent','magic'); }
})()
