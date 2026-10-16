(async () => {
  const w = __world, p = __player, e = __dummy, checks = [];
  const { FIGHTER_LIST } = await import('./src/characters/FighterCatalog.js');
  const T = await import('three');
  const check = (label, passed, detail) => checks.push({ label, passed: !!passed, detail });
  function step() {
    for (const c of w.combatants) c.update(1 / 60);
    w.arena.resolve(w.combatants);
    for (const c of w.combatants) c.character.update(1 / 60);
    for (const c of w.combatants) c.equipment?.update(c.state === 'attack' && c.move?.clip === 'Kick');
    for (const c of w.combatants) c.postAnimation(1 / 60);
    w.projectiles.update(1 / 60);
  }
  try {
    w.setPaused(false); w.match.toLobby();
    check('all seven supplied fighters are selectable', w.library.models.size === 7 && document.querySelectorAll('[data-fighter]').length === 7);
    check('imported props have shared combat/camera collision', w.arena.importedPlacements.length === 6
      && w.arena.importedPlacements.every(p => w.arena.obstacles.some(b => b.equals(p.bounds)) && w.arena.cameraBlockers.some(b => b.equals(p.bounds))));
    for (const profile of FIGHTER_LIST) {
      w.setPaused(false); w.match.toLobby(); w.selectFighter('player', profile.id); w.selectFighter('opponent', 'capoeira');
      const native = w.library.models.get(profile.id).animations;
      check(profile.id + ': native animations assigned without class overrides', ['Idle', 'Run', 'Light', 'Heavy'].every(name => p.character.actions.get(name).getClip() === native.find(c => c.name === name)));
      for (const id of ['punch', 'heavy', 'kick', 'skill1', 'skill2']) {
        w.match.practice(); w.setPaused(true); __ai.enabled = false;
        const move = p.moves[id], distance = move.kind === 'projectile' ? 5 : move.kind === 'area' ? 1.6 : 1.1;
        p.position.set(0, 0, distance); e.position.set(0, 0, 0); p.target = e; p.aimPoint = e.position.clone();
        for (const c of w.combatants) { c.previousPosition.copy(c.position); c.iframes = 0; }
        p.character.root.updateMatrixWorld(true); p.equipment?.update();
        const started = p.tryAttack(id, Math.PI);
        for (let i = 0; i < 200; i++) step();
        const damage = e.maxHp - e.hp;
        check(profile.id + ': ' + id + ' confirms and recovers', started && p.state === 'free' && (move.kind === 'mobility' || damage > 0), { damage, state: p.state });
      }
      if (profile.weapon && profile.weapon !== 'rifle') {
        check(profile.id + ': imported weapon is attached', p.equipment?.id === profile.weapon && p.equipment.root.parent === p.character.root);
      }
      w.match.practice(); w.setPaused(true); __ai.enabled = false;
      p.position.set(0, 0, 4); p.previousPosition.copy(p.position);
      p.mover.steer(new T.Vector3(1, 0, 0), 1);
      const start = p.position.clone();
      for (let i = 0; i < 30; i++) step();
      check(profile.id + ': running translates with its own gait', p.position.distanceTo(start) > 0.5 && p.character.loco.w.run > 0.5);
      p.mover.steer(new T.Vector3(), 0); for (let i = 0; i < 40; i++) step();
      p.tryJump(); let apex = 0;
      for (let i = 0; i < 130; i++) { step(); apex = Math.max(apex, p.position.y); }
      check(profile.id + ': jump lands without a stuck state', apex > 0.7 && p.position.y === 0 && p.state === 'free');
    }
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: checks.every(c => c.passed), checks };
  } finally { w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'capoeira'); w.selectFighter('opponent', 'magic'); }
})()
