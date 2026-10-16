(async () => {
  const w = __world, p = __player, e = __dummy;
  w.setPaused(false); w.match.toLobby(); w.selectFighter('player','magic'); w.selectFighter('opponent','soldier');
  w.match.practice(); __ai.enabled=false;
  p.position.set(0,0,5.5); p.previousPosition.copy(p.position);
  e.position.set(0,0,-1); e.previousPosition.copy(e.position);
  p.aimPoint=e.position.clone(); p.tryAttack('skill1',Math.PI);
  e.tryAttack('skill1',0);
  await new Promise(r=>setTimeout(r,250));
  return { ready: __ready, playerSkill:p.move?.label, enemySkill:e.move?.label, error:document.getElementById('errmsg').textContent };
})()
