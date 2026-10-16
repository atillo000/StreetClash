(async () => {
  const T = await import('three'), { FIGHTER_LIST } = await import('./src/characters/FighterCatalog.js');
  const rows = [];
  const median = values => { values.sort((a,b)=>a-b); return values[Math.floor(values.length / 2)] || 0; };
  function soles(character) {
    const samples = { Left: [], Right: [] }, point = new T.Vector3();
    character.root.updateMatrixWorld(true);
    character.model.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return;
      const index = mesh.geometry.attributes.skinIndex, weight = mesh.geometry.attributes.skinWeight;
      for (let i = 0; i < index.count; i++) for (const side of ['Left', 'Right']) {
        let influence = 0;
        for (let k = 0; k < 4; k++) if (new RegExp(side + '(Foot|Toe)').test(mesh.skeleton.bones[index.array[i*4+k]]?.name)) influence += weight.array[i*4+k];
        if (influence < 0.5) continue;
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        samples[side].push({ mesh, index: i, y: point.y });
      }
    });
    return Object.fromEntries(Object.entries(samples).map(([side, vertices]) => {
      const min = vertices.reduce((min, v)=>Math.min(min,v.y), Infinity), low = vertices.filter(v=>v.y < min + 0.045);
      return [side, low.filter((v,i)=>i % Math.max(1,Math.floor(low.length/32)) === 0).slice(0,40)];
    }));
  }
  for (const config of FIGHTER_LIST) {
    const { character, equipment } = __world.library.create(config.id, 0), samples = soles(character);
    const foot = new T.Vector3(), prev = {}, clips = [];
    for (const name of character.clipNames().filter(name => /^(Idle|AimIdle|Walk|Run|Sprint|CombatWalk|CombatRun|BackWalk|BackRun|Strafe.*(Walk|Run)|Forward.*(Walk|Run)|Back.*(Walk|Run)|Crouch(Idle|Walk|Back|Left|Right|ForwardLeft|ForwardRight|BackLeft|BackRight))$/.test(name))) {
      character.mixer.stopAllAction();
      const action = character.actions.get(name); if (!action) continue;
      action.reset().setEffectiveWeight(1).play(); action.timeScale = 1;
      const duration = action.getClip().duration, points = [], speeds = { Left: [], Right: [] }, leftFrames = [];
      for (let i=0;i<=96;i++) {
        action.time = Math.min(duration-1e-5, i/96*duration); character.mixer.update(0); character.root.updateMatrixWorld(true);
        const heights = {};
        for (const side of ['Left','Right']) {
          heights[side] = Math.min(...samples[side].map(sample => sample.mesh.getVertexPosition(sample.index, foot).applyMatrix4(sample.mesh.matrixWorld).y));
          const p = character.bone('mixamorig'+side+'Foot').getWorldPosition(new T.Vector3());
          if (side === 'Left') leftFrames.push({ phase:i/96, y:heights[side], projection:/Left/.test(name)?-p.x:/Right/.test(name)?p.x:/Back/.test(name)?-p.z:p.z });
          if (i>0) speeds[side].push({ y: heights[side], dx:(p.x-prev[side].x)/(duration/96), dz:(p.z-prev[side].z)/(duration/96), speed: Math.hypot(p.x-prev[side].x,p.z-prev[side].z)/(duration/96) });
          prev[side] = p;
        }
        points.push(Math.min(heights.Left, heights.Right));
      }
      const floor = Math.min(...points), planted = Object.values(speeds).flat().filter(v=>v.y<floor+.035).map(v=>v.speed);
      const leftFloor = Math.min(...leftFrames.map(f=>f.y));
      const strike = leftFrames.filter(f=>f.y<leftFloor+.035).sort((a,b)=>b.projection-a.projection)[0];
      clips.push({ name, duration:+duration.toFixed(3), soleMin:+Math.min(...points).toFixed(3), soleMedian:+median(points).toFixed(3), soleMax:+Math.max(...points).toFixed(3), nativePlantSpeed:+median(planted).toFixed(3), dx:median(Object.values(speeds).flat().filter(v=>v.y<floor+.035).map(v=>v.dx)), dz:median(Object.values(speeds).flat().filter(v=>v.y<floor+.035).map(v=>v.dz)), phase: strike?.phase || 0 });
    }
    const palm = side => {
      const hand = character.bone('mixamorig'+side+'Hand'), finger = character.bone('mixamorig'+side+'HandMiddle1') || character.bone('mixamorig'+side+'HandIndex1');
      return hand.getWorldPosition(new T.Vector3()).lerp(finger ? finger.getWorldPosition(new T.Vector3()) : hand.getWorldPosition(new T.Vector3()), .65);
    };
    character.mixer.stopAllAction(); character.actions.get('Idle').reset().setEffectiveWeight(1).play(); character.mixer.update(0); character.root.updateMatrixWorld(true); equipment?.update();
    const hand = config.weapon === 'bow' ? 'Left' : 'Right';
    const gripError = equipment ? equipment.root.getWorldPosition(new T.Vector3()).distanceTo(palm(hand)) : null;
    rows.push({ id:config.id, gripToPalm:gripError, soles:Object.fromEntries(Object.entries(samples).map(([side,s])=>[side,s.length])), clips });
    equipment?.dispose(); character.mixer.stopAllAction();
  }
  return { rows, error:document.getElementById('errmsg').textContent };
})()
