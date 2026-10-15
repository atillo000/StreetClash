(async () => {
  const T = await import('three');
  const c = __player, ch = c.character;
  const hips = ch.bone('mixamorigHips'), p = new T.Vector3();
  c.reset();
  c.mover.steer(new T.Vector3(0, 0, -1), 1);
  let maxOffset = 0, maxPoseStep = 0, previous = null;
  for (let i = 0; i < 240; i++) {
    c.update(1 / 60); ch.update(1 / 60);
    hips.getWorldPosition(p);
    const relative = p.clone().sub(c.position);
    maxOffset = Math.max(maxOffset, Math.hypot(relative.x, relative.z));
    if (previous) maxPoseStep = Math.max(maxPoseStep, relative.distanceTo(previous));
    previous = relative;
  }
  c.mover.steer(new T.Vector3(0, 0, 1), 1);
  const start = c.position.clone();
  c.update(1 / 60);
  const reversalForwardDelta = c.position.z - start.z;
  c.reset();
  ch.loco.w = { idle: 0, walk: 0, run: 1 };
  for (const [k, a] of Object.entries(ch.loco.a)) a.setEffectiveWeight(k === 'run' ? 1 : 0);
  ch.loco.a.run.time = 0.55;
  ch.update(0);
  return { maxOffset, maxPoseStep, reversalForwardDelta, error: document.getElementById('errmsg').textContent };
})()
