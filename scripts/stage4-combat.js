(async () => {
  const T = await import('three');
  const world = __world, player = __player, dummy = __dummy;
  world.match?.practice();
  world.setPaused(true);
  const report = [];
  const originalHit = world.onHit;
  let events = [];
  world.onHit = function (...args) { events.push({ result: args[2], damage: args[3].damage, phase: args[0].character.actionProgress() }); originalHit.apply(this, args); };
  function setup(distance = 0.9) {
    player.reset(); dummy.reset(); __lock.clear(); world.hitstop = 0;
    player.position.set(0, 0, distance); dummy.position.set(0, 0, 0);
    for (const c of world.combatants) { c.previousPosition.copy(c.position); c.iframes = 0; }
    events = [];
  }
  function step() {
    for (const c of world.combatants) c.update(1 / 60);
    world.arena.resolve(world.combatants);
    for (const c of world.combatants) c.character.update(1 / 60);
    for (const c of world.combatants) c.postAnimation(1 / 60);
  }
  try {
    for (const move of ['punch', 'kick', 'heavy']) {
      setup();
      player.tryAttack(move);
      const phases = new Set();
      for (let i = 0; i < 150; i++) { step(); phases.add(player.phase); }
      report.push({ move, hits: events.slice(), hp: dummy.hp, phases: [...phases], playerState: player.state, targetState: dummy.state,
        passed: events.length > 0 && events.length <= (move === 'punch' ? 3 : 1) && player.state === 'free' && phases.has('startup') && phases.has('active') && phases.has('recovery') });
    }
    setup(); dummy.wantBlock = true; step(); player.tryAttack('punch');
    for (let i = 0; i < 100; i++) step();
    report.push({ label: 'frontal guard reduces punch damage', hp: dummy.hp, hits: events.slice(), passed: events.length > 0 && events.every(e => e.result === 'blocked') && dummy.hp > 90 });
    setup(); dummy.wantBlock = true; step(); player.tryAttack('heavy');
    let knockedDown = false;
    for (let i = 0; i < 300; i++) { step(); knockedDown ||= dummy.state === 'down'; }
    report.push({ label: 'heavy breaks guard and target gets up', hp: dummy.hp, hits: events.slice(), passed: knockedDown && events[0]?.result === 'down' && dummy.hp > 74 && dummy.state !== 'down' && dummy.state !== 'getup' });
    setup(4); player.tryAttack('heavy');
    for (let i = 0; i < 100; i++) step();
    report.push({ label: 'out-of-range swing misses', passed: events.length === 0 && dummy.hp === 100 });
    return { passed: report.every(r => r.passed), report };
  } finally {
    world.onHit = originalHit; setup(); player.reset(); dummy.reset(); world.setPaused(false);
  }
})()
