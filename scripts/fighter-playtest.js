(async () => {
  const T = await import('three');
  const w = __world, p = __player, e = __dummy;
  const results = [];
  const check = (label, passed, detail) => results.push({ label, passed: !!passed, detail });
  const select = id => { w.setPaused(false); w.match.toLobby(); w.selectFighter('player', id); w.selectFighter('opponent', id === 'capoeira' ? 'magic' : 'capoeira'); w.match.practice(); w.setPaused(true); __ai.enabled = false; };
  function setup(distance) {
    w.match.practice(); w.setPaused(true); __ai.enabled = false;
    p.position.set(0, 0, distance); e.position.set(0, 0, 0);
    for (const c of w.combatants) { c.previousPosition.copy(c.position); c.iframes = 0; }
    w.hitstop = 0;
  }
  function step() {
    for (const c of w.combatants) c.update(1 / 60);
    w.arena.resolve(w.combatants);
    for (const c of w.combatants) c.character.update(1 / 60);
    for (const c of w.combatants) c.equipment?.update(['block','blockEnd','dodge','hit','down','getup','dead','jump','land'].includes(c.state) || (c.state === 'attack' && c.moveId === 'kick'));
    for (const c of w.combatants) c.postAnimation(1 / 60);
    w.projectiles.update(1 / 60);
  }
  try {
    for (const id of ['capoeira', 'magic', 'soldier']) {
      select(id);
      const names = []; p.character.model.traverse(o => { if (o.isBone) names.push(o.name); });
      check(id + ': one canonical rig', names.length >= 52 && new Set(names).size === names.length, names.length);
      check(id + ': own idle and movement clips', ['Idle','Walk','Run','BackWalk','BackRun','StrafeLeftWalk','StrafeRightWalk','Sprint'].every(n => p.character.hasClip(n)));
      for (const attack of ['punch','kick','heavy']) {
        const distance = id === 'capoeira' || (id === 'soldier' && attack === 'kick') ? 0.95 : id === 'magic' && attack === 'heavy' ? 1.8 : 5;
        setup(distance);
        const started = p.tryAttack(attack, Math.PI);
        for (let i = 0; i < 220; i++) step();
        const damage = 100 - e.hp;
        check(id + ': ' + attack + ' confirms damage and recovers', started && damage > 0 && damage <= p.moves[attack].damage * (p.moves[attack].events?.length || 1) + 1e-4 && p.state === 'free', { damage, state: p.state });
      }
      setup(6);
      p.tryJump(); let apex = 0;
      for (let i = 0; i < 150; i++) { step(); apex = Math.max(apex, p.position.y); }
      check(id + ': jump and landing recover on ground', apex > 0.7 && apex < 1.1 && p.position.y === 0 && p.state === 'free', { apex, state: p.state });
      setup(6);
      p.wantBlock = true; for (let i = 0; i < 80; i++) step();
      check(id + ': guard holds', p.state === 'block');
      p.wantBlock = false; for (let i = 0; i < 70; i++) step();
      check(id + ': guard releases', p.state === 'free');
      if (id !== 'capoeira') {
        setup(6); p.wantCrouch = true; for (let i = 0; i < 80; i++) step();
        check(id + ': crouch selects own idle and short capsule', p.crouching && p.character.loco.w.CrouchIdle > 0.9 && p.height < 1.2, { height: p.height });
        p.mover.lockFacing = Math.PI; p.mover.steer(new T.Vector3(0, 0, 1), 1);
        for (let i = 0; i < 70; i++) step();
        check(id + ': crouch backpedal uses own backward clip', p.character.loco.w.CrouchBack > 0.85 && Math.abs(p.mover.speed - p.profile.crouchSpeed) < 0.01);
      }
      setup(6); p.mover.sprinting = true; p.mover.steer(new T.Vector3(0, 0, -1), 1);
      for (let i = 0; i < 70; i++) step();
      check(id + ': sprint selects sprint clip', p.character.loco.w.Sprint > 0.9 && Math.abs(p.mover.speed - p.profile.sprintSpeed) < 0.01);
      if (id === 'soldier') {
        setup(6); p.mover.lockFacing = Math.PI; p.mover.steer(new T.Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2), 1);
        for (let i = 0; i < 70; i++) step();
        check('soldier: diagonal rifle locomotion', p.character.loco.w.ForwardRightRun > 0.85, p.character.loco.w.ForwardRightRun);
        check('soldier: rifle attached and muzzle valid', !!p.equipment && p.equipment.muzzle.getWorldPosition(new T.Vector3()).distanceTo(p.position) < 2.5);
      }
    }
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'magic'); w.selectFighter('opponent', 'magic');
    const matP = __player.mats[0].m, matE = __dummy.mats[0].m;
    check('same-class fighters have independent materials and skeletons', matP !== matE && p.character.bone('mixamorigHips') !== e.character.bone('mixamorigHips'));
    check('no runtime error overlay', !document.getElementById('errmsg').textContent, document.getElementById('errmsg').textContent);
    return { passed: results.every(r => r.passed), results };
  } finally {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'capoeira'); w.selectFighter('opponent', 'magic');
  }
})()
