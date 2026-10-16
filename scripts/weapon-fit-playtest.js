(async () => {
  const T = await import('three');
  const checks=[], rows=[];
  const check=(label,passed,detail)=>checks.push({label,passed:!!passed,detail});
  for(const id of ['archer','greatsword','axe','soldier']) {
    const {character:c,equipment:e}=__world.library.create(id,0);
    const side=id==='archer'?'Left':'Right', hand=c.bone('mixamorig'+side+'Hand');
    let reference, maxRollDrift=0, maxGripGap=0, frames=0;
    // Intersect the actual handle triangles with a plane through the socket.
    // This catches asymmetric models whose group origin is in the palm while
    // their visible shaft floats several centimeters outside it.
    const section=new T.Box3(), a=new T.Vector3(),b=new T.Vector3();
    e.model.updateMatrixWorld(true);
    const inverse=e.root.matrixWorld.clone().invert();
    e.model.traverse(mesh=>{if(!mesh.isMesh)return;
      const pos=mesh.geometry.attributes.position,ix=mesh.geometry.index;
      const n=ix?ix.count:pos.count;
      for(let i=0;i<n;i+=3)for(let edge=0;edge<3;edge++) {
        a.fromBufferAttribute(pos,ix?ix.getX(i+edge):i+edge).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        b.fromBufferAttribute(pos,ix?ix.getX(i+(edge+1)%3):i+(edge+1)%3).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        // Rifle handle crosses a horizontal plane, other handles cross Y=0 too.
        if(a.y*b.y<=0&&Math.abs(b.y-a.y)>1e-8) {
          const p=a.clone().lerp(b,-a.y/(b.y-a.y));
          // Exclude the bowstring, a separate thin component behind the handle.
          if((id!=='soldier'||Math.abs(p.z)<.1)&&(id!=='archer'||Math.abs(p.z)<.06))section.expandByPoint(p);
        }
      }
    });
    const center=section.getCenter(new T.Vector3()), size=section.getSize(new T.Vector3());
    check(id+': visible handle is centered on the grip',!section.isEmpty()&&Math.hypot(center.x,center.z)<.012,{center:center.toArray(),size:size.toArray()});
    for(const pose of ['Idle','Run','Light','Heavy','Block','Kick','Roll']) {
      if(!c.hasClip(pose))continue;
      c.mixer.stopAllAction();const action=c.actions.get(pose);action.reset().setEffectiveWeight(1).play();
      for(let i=0;i<30;i++) {
        action.time=(i/30)*action.getClip().duration;c.mixer.update(0);
        c.root.rotation.y=i*.07;c.root.position.set(i*.03,0,-i*.02);c.root.updateMatrixWorld(true);e.update();
        const hq=hand.getWorldQuaternion(new T.Quaternion()).normalize();
        const local=e.root.getWorldQuaternion(new T.Quaternion()).premultiply(hq.invert()).normalize();
        if(!reference)reference=local.clone();
        if(id==='archer'||id==='axe')maxRollDrift=Math.max(maxRollDrift,reference.angleTo(local));
        const grip=e.root.getWorldPosition(new T.Vector3());
        const knuckle=c.bone('mixamorig'+side+'HandMiddle1').getWorldPosition(new T.Vector3());
        maxGripGap=Math.max(maxGripGap,grip.distanceTo(knuckle));frames++;
      }
    }
    check(id+': grip stays inside the fingers',maxGripGap<.1,maxGripGap);
    check(id+': hand rotation stays attached across poses',maxRollDrift<1e-5,maxRollDrift);
    c.mixer.stopAllAction();const idle=c.actions.get('Idle');idle.reset().setEffectiveWeight(1).play();c.mixer.update(0);e.update();
    if(id==='greatsword') {
      const blade=e.tip.getWorldPosition(new T.Vector3()).sub(e.root.getWorldPosition(new T.Vector3()));
      const lower=c.bone('mixamorigLeftHand').getWorldPosition(new T.Vector3()).sub(hand.getWorldPosition(new T.Vector3()));
      check('sword blade points away from the supporting hand',blade.dot(lower)<0);
    }
    if(id==='soldier')check('rifle muzzle is in front of its grip',e.muzzle.position.z>.45);
    rows.push({id,frames,maxGripGap,maxRollDrift}); e.dispose();c.mixer.stopAllAction();
  }
  return{passed:checks.every(c=>c.passed),checks,rows};
})()
