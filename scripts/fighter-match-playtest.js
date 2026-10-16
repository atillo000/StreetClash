(async () => {
  const { SparringAI } = await import('./src/combat/SparringAI.js');
  const w = __world, m = w.match, p = __player, e = __dummy;
  const results = [], originalRandom = __ai.random;
  let seed = 9241;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const brain = new SparringAI(p, { random });
  const check = (label, passed, detail) => results.push({ label, passed: !!passed, detail });
  try {
    for (const [a, b] of [['capoeira','soldier'], ['capoeira','magic'], ['soldier','capoeira'], ['magic','soldier'],
      ['archer','axe'], ['greatsword','mutant'], ['axe','greatsword'], ['mutant','archer']]) {
      w.setPaused(false); m.toLobby(); w.selectFighter('player', a); w.selectFighter('opponent', b);
      m.start(); m.update(3); w.setPaused(true); brain.reset(); brain.enabled = true; __ai.random = random;
      check(a + ': selection locked during match', w.selectFighter('player', b) === false && p.profile.id === a);
      for (let i = 0; i < 7500 && m.state !== 'results'; i++) {
        m.update(1 / 60);
        if (!m.canFight) { for (const c of w.combatants) c.character.update(1 / 60); continue; }
        if (w.hitstop > 0) { w.hitstop = Math.max(0, w.hitstop - 1 / 60); continue; }
        brain.update(1 / 60); __ai.update(1 / 60);
        for (const c of w.combatants) c.update(1 / 60);
        w.arena.resolve(w.combatants);
        for (const c of w.combatants) c.character.update(1 / 60);
        for (const c of w.combatants) c.equipment?.update(c.state !== 'free' && c.state !== 'attack' || c.moveId === 'kick');
        for (const c of w.combatants) c.postAnimation(1 / 60);
        w.projectiles.update(1 / 60); m.resolveOutcome();
      }
      check(a + ' vs ' + b + ': complete match with real damage', m.state === 'results' && m.result.damageDealt + m.result.damageTaken > 0, m.result);
      check(a + ': projectiles cleared at result', w.projectiles.items.length === 0);
      document.getElementById('rematch').click();
      check(a + ': rematch restores health and fighter', m.state === 'countdown' && p.hp === p.maxHp && e.hp === e.maxHp && p.profile.id === a);
    }
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: results.every(r => r.passed), results };
  } finally { __ai.random = originalRandom; w.setPaused(false); m.toLobby(); w.selectFighter('player','capoeira'); w.selectFighter('opponent','magic'); }
})()
