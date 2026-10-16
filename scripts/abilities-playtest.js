(async () => {
  const T = await import('three');
  const w = __world, p = __player, e = __dummy, checks = [];
  const check = (label, passed, detail) => checks.push({ label, passed: !!passed, detail });
  function setup(id, distance = 6) {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', id); w.match.practice(); w.setPaused(true); __ai.enabled = false;
    p.position.set(0,0,distance); e.position.set(0,0,0);
    for (const c of w.combatants) { c.previousPosition.copy(c.position); c.iframes = 0; }
    p.target = e;
  }
  function step() {
    for (const c of w.combatants) c.update(1/60);
    w.arena.resolve(w.combatants);
    for (const c of w.combatants) c.character.update(1/60);
    for (const c of w.combatants) c.equipment?.update(c.move?.kind === 'mobility');
    for (const c of w.combatants) c.postAnimation(1/60);
    w.projectiles.update(1/60);
  }
  try {
    for (const [id, skill, distance] of [['capoeira','skill1',3.2],['capoeira','skill2',1.8],['magic','skill1',7],['soldier','skill1',6]]) {
      setup(id,distance); p.aimPoint = e.position.clone(); const start = p.position.clone();
      check(id + ': ' + skill + ' starts', p.tryAttack(skill,Math.PI));
      w.signals.update(true,p);
      check(id + ': startup warning is visible', w.signals.entries.find(x => x.c === p).group.visible);
      if (id === 'magic') check('ground seal warning commits to distant target', p.castPoint.distanceTo(e.position) < .01);
      for (let i = 0; i < 200; i++) step();
      check(id + ': ' + skill + ' deals confirmed damage and recovers', e.hp < 100 && p.state === 'free', { damage: 100-e.hp, state: p.state });
      check(id + ': ability cooldown prevents immediate reuse', p.cooldowns[skill] > 0 && !p.tryAttack(skill,Math.PI));
      if (id === 'capoeira' && skill === 'skill1') check('rush closes distance without teleporting', p.position.distanceTo(start) > 1.5 && p.position.distanceTo(start) < 4, p.position.distanceTo(start));
      w.signals.update(true,p); check(id + ': warning disappears after recovery', !w.signals.entries.find(x => x.c === p).group.visible);
    }
    for (const id of ['magic','soldier']) {
      setup(id,6); const start = p.position.clone();
      p.tryAttack('skill2', Math.PI/2);
      for (let i = 0; i < 8; i++) step();
      const hit = { damage: 10, power: 'light', knock: 0, dir: new T.Vector3(0,0,1), attacker: e };
      check(id + ': escape has a bounded invulnerable window', p.takeHit(hit) === 'miss', p.character.actionProgress());
      for (let i = 0; i < 160; i++) step();
      check(id + ': escape displaces and recovers', p.position.distanceTo(start) > 1.5 && p.state === 'free');
      check(id + ': escape invulnerability ends', p.takeHit(hit) === 'hit');
    }
    setup('capoeira',.95);
    const clips = [];
    for (let stage = 0; stage < 3; stage++) {
      p.tryAttack('punch',Math.PI); clips.push(p.character.actionName);
      check('chain advances to stage ' + (stage+1), p.comboStage === stage+1);
      for (let i = 0; i < 200 && p.state === 'attack'; i++) step();
      // Put the victim back in reach after each confirmed knockback.
      e.position.set(0,0,0); e.previousPosition.copy(e.position); p.position.set(0,0,.95); p.previousPosition.copy(p.position);
    }
    check('three J attacks use three distinct class clips', clips.join(',') === 'Light,Kick,Heavy', clips);
    for (let i = 0; i < 65; i++) step();
    p.tryAttack('punch',Math.PI); check('expired chain restarts from first strike', p.comboStage === 1 && p.character.actionName === 'Light');
    setup('magic',7); p.tryAttack('skill1',Math.PI); p.takeHit({ damage: 5, power: 'light', knock: 0, dir: new T.Vector3(0,0,1), attacker: e });
    for (let i = 0; i < 200; i++) step();
    check('interrupting ground cast cancels its damage', e.hp === 100 && p.cooldowns.skill1 > 0);
    w.match.practice(); check('reset clears every skill cooldown and combo', Object.keys(p.cooldowns).length === 0 && p.comboStage === 0);
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: checks.every(x => x.passed), checks };
  } finally { w.setPaused(false); w.match.toLobby(); w.selectFighter('player','capoeira'); w.selectFighter('opponent','magic'); }
})()
