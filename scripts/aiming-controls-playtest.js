(async () => {
  const w=__world, p=__player, e=__dummy, checks=[];
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const key=(code,down)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  const check=(label,passed,detail)=>checks.push({label,passed:!!passed,detail});
  try {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player','soldier'); w.selectFighter('opponent','magic'); w.match.practice();
    p.position.set(0,0,5.5); p.previousPosition.copy(p.position); e.position.set(0,0,-1); e.previousPosition.copy(e.position);
    await wait(300);
    check('crosshair is visible in practice', !document.getElementById('crosshair').hidden);
    key('Digit2',true); await wait(100); key('Digit2',false);
    check('2 triggers focus round and starts cooldown',p.moveId==='skill1'&&p.cooldowns.skill1>0);
    const committed=p.castTarget.clone();
    await wait(1500);
    check('aimed shot hits crosshair target',e.hp<100,{hp:e.hp,aim:committed.toArray()});
    key('Digit3',true); await wait(100); key('Digit3',false);
    check('3 triggers tactical escape',p.moveId==='skill2'&&p.cooldowns.skill2>0);
    await wait(1300);
    key('Tab',true); await wait(100); key('Tab',false);
    check('target lock remains available',__lock.target===e);
    key('Tab',true); await wait(100); key('Tab',false);
    await document.querySelector('canvas').requestPointerLock(); await wait(100);
    check('mouse capture activates',!!document.pointerLockElement);
    const before=__cam.yaw;
    const mouse=new MouseEvent('mousemove',{bubbles:true}); Object.defineProperty(mouse,'movementX',{value:160}); Object.defineProperty(mouse,'movementY',{value:0}); window.dispatchEvent(mouse);
    await wait(150);
    check('mouse motion rotates camera aim',Math.abs(__cam.yaw-before)>.2);
    const delta=p.mover.facing-w.aim.heading(p);
    check('captured rifle movement faces crosshair',Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))<.2&&p.manualAim,{facing:p.mover.facing,aim:w.aim.heading(p)});
    if(document.pointerLockElement)document.exitPointerLock();
    check('no runtime error overlay',!document.getElementById('errmsg').textContent,document.getElementById('errmsg').textContent);
    return{passed:checks.every(c=>c.passed),checks};
  } finally {
    for(const code of ['Digit2','Digit3','Tab'])key(code,false);
    if(document.pointerLockElement)document.exitPointerLock();
    w.setPaused(false);w.match.toLobby();w.selectFighter('player','capoeira');w.selectFighter('opponent','magic');
  }
})()
