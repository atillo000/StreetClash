(async () => {
  const T = await import('three');
  const c = __player, ch = c.character;
  const result = [];
  for (const [name, objects] of [['Punch', ['mixamorigRightHand', 'mixamorigLeftHand']], ['Kick', ['mixamorigRightFoot', 'mixamorigLeftFoot']], ['Heavy', ['bat']]]) {
    ch.mixer.stopAllAction();
    const action = ch.actions.get(name); action.reset().setEffectiveWeight(1).play();
    action.timeScale = 1;
    ch.mixer.update(0);
    const bones = objects.map(n => n === 'bat' ? c.bat.tip : ch.bone(n));
    const previous = bones.map(b => b.getWorldPosition(new T.Vector3()));
    const duration = action.getClip().duration;
    const buckets = Array.from({ length: 20 }, (_, i) => ({ phase: i / 20, maxSpeed: 0, reach: 0 }));
    for (let i = 1; i <= Math.floor(duration * 120); i++) {
      ch.mixer.update(1 / 120);
      const bucket = buckets[Math.min(19, Math.floor(action.time / duration * 20))];
      bones.forEach((b, j) => {
        const p = b.getWorldPosition(new T.Vector3());
        bucket.maxSpeed = Math.max(bucket.maxSpeed, p.distanceTo(previous[j]) * 120);
        bucket.reach = Math.max(bucket.reach, Math.hypot(p.x - c.position.x, p.z - c.position.z));
        previous[j].copy(p);
      });
    }
    result.push({ name, duration, buckets: buckets.map(b => ({ phase: b.phase, maxSpeed: +b.maxSpeed.toFixed(1), reach: +b.reach.toFixed(2) })) });
  }
  location.reload();
  return result;
})()
