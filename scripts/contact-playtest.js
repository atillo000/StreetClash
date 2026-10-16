(async () => {
  const T = await import('three'), { palmWorld } = await import('./src/characters/HandSocket.js');
  const w=__world,p=__player,rows=[],checks=[];
  const median = values => values.sort((a,b)=>a-b)[Math.floor(values.length/2)] || 0;
  const check=(label,passed,detail)=>checks.push({label,passed:!!passed,detail});
  try {
    for(const id of ['capoeira','magic','soldier','archer','greatsword','axe','mutant']) {
      w.setPaused(false);w.match.toLobby();w.selectFighter('player',id);
      for(const mode of ['idle','walk','run','sprint','back','left','right']) {
        w.match.practice();w.setPaused(true);__ai.enabled=false;
        p.position.set(0,0,0);p.previousPosition.copy(p.position);p.mover.facing=0;
        p.character.root.rotation.y=0;
        const direction=mode==='left'?new T.Vector3(-1,0,0):mode==='right'?new T.Vector3(1,0,0):new T.Vector3(0,0,mode==='back'?-1:1);
        p.mover.steer(direction,mode==='idle'?0:1,mode==='walk');
        p.mover.sprinting=mode==='sprint';p.mover.lockFacing=['back','left','right'].includes(mode)?0:null;
        let maxGrip=0,minGap=Infinity,maxGap=-Infinity;const slips=[],previous=new Map();
        for(let i=0;i<100;i++) {
          p.update(1/60);p.character.update(1/60);p.equipment?.update();p.character.root.updateMatrixWorld(true);
          if(p.equipment)maxGrip=Math.max(maxGrip,p.equipment.root.getWorldPosition(new T.Vector3()).distanceTo(palmWorld(p.character,p.profile.weapon==='bow'?'Left':'Right')));
          const gap=p.character.feet.minimum()-p.position.y;
          if(i>20){minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);}
          for(const sample of p.character.feet.samples) {
            const point=sample.mesh.getVertexPosition(sample.index,new T.Vector3()).applyMatrix4(sample.mesh.matrixWorld),prev=previous.get(sample);
            if(i>20&&prev&&point.y<p.position.y+.03)slips.push(Math.hypot(point.x-prev.x,point.z-prev.z)*60);
            previous.set(sample,point);
          }
        }
        rows.push({id,mode,minGap:+minGap.toFixed(4),maxGap:+maxGap.toFixed(4),gripCm:+(maxGrip*100).toFixed(4),medianSoleSlip:+median(slips).toFixed(3)});
        check(id+'/'+mode+': grip stays in the palm',!p.equipment||maxGrip<.002,maxGrip);
        check(id+'/'+mode+': sole contact stays near the floor',minGap>-.025&&maxGap<.1,{minGap,maxGap});
      }
      w.match.practice();w.setPaused(true);__ai.enabled=false;p.tryJump();
      let apex=0,freeAir=true;
      for(let i=0;i<100;i++){p.update(1/60);p.character.update(1/60);apex=Math.max(apex,p.position.y);if(p.position.y>.15)freeAir&&=Math.abs(p.character.feet.offset)<1e-6;}
      check(id+': grounding preserves jump arc',apex>.7&&freeAir&&p.position.y===0);
    }
    check('Kenney particle atlas loaded',__effects.quarks.atlasLoaded);
    return{passed:checks.every(c=>c.passed),checks,rows};
  }finally{w.setPaused(false);w.match.toLobby();w.selectFighter('player','capoeira');w.selectFighter('opponent','magic');}
})()
