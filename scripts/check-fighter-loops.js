(async () => {
  const T = await import('three');
  const report = [];
  for (const id of ['capoeira','magic','soldier']) {
    const { character: ch, equipment } = __world.library.create(id, 0);
    const clips = [];
    for (const name of ['Idle','AimIdle','Walk','Run','CombatWalk','BackWalk','StrafeLeftWalk','StrafeRightWalk','Sprint','CrouchWalk']) {
      if (!ch.hasClip(name)) continue;
      ch.mixer.stopAllAction(); const a = ch.actions.get(name); a.reset().setEffectiveWeight(1).setLoop(T.LoopRepeat, Infinity).play();
      ch.mixer.update(0);
      const bones = ['mixamorigLeftFoot','mixamorigRightFoot','mixamorigHead'].map(n => ch.bone(n));
      let previous = bones.map(b => b.getWorldPosition(new T.Vector3())), lastTime = 0, wrap = 0;
      for (let i = 0; i < Math.ceil(a.getClip().duration * 60) + 2; i++) {
        ch.mixer.update(1 / 60);
        const positions = bones.map(b => b.getWorldPosition(new T.Vector3()));
        if (a.time < lastTime) wrap = Math.max(...positions.map((p, j) => p.distanceTo(previous[j])));
        previous = positions; lastTime = a.time;
      }
      clips.push({ name, wrapStep: +wrap.toFixed(3) });
    }
    equipment?.dispose(); report.push({ id, clips });
  }
  return { passed: report.every(r => r.clips.every(c => c.wrapStep < 0.2)), report };
})()
