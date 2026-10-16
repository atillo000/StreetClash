(async () => {
  const w = __world, p = __player, e = __dummy, fx = __effects;
  const checks = [], check = (label, passed) => checks.push({ label, passed: !!passed });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'magic');
    w.selectFighter('opponent', 'soldier'); w.match.practice(); __ai.enabled = false;
    const children = fx.quarks.batch.parent.children.length;
    p.target = e; p.tryAttack('punch', Math.PI);
    for (let i = 0; i < 100 && fx.quarks.particleCount === 0; i++) await wait(20);
    check('magic cast activates real Quarks particles', fx.quarks.particleCount > 0);
    check('Quarks particles use an instanced batch', fx.quarks.batch.batches.length === 1);
    check('particle and queued burst budgets stay bounded', fx.quarks.particleCount <= fx.quarks.budget && fx.quarks.reserved <= fx.quarks.budget);
    w.setPaused(true); const paused = fx.quarks.particleCount;
    await wait(150); check('pause freezes the effect simulation', fx.quarks.particleCount === paused);
    w.setPaused(false); w.match.practice();
    check('match reset clears Quarks emitters and particles', fx.quarks.particleCount === 0 && fx.quarks.reserved === 0);
    check('effect playback adds no scene objects', fx.quarks.batch.parent.children.length === children);
    check('seven fighters use dedicated profiles', document.querySelectorAll('[data-fighter]').length === 7 && !w.selectLoadout);
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: checks.every(c => c.passed), checks };
  } finally {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'capoeira'); w.selectFighter('opponent', 'magic');
  }
})()
