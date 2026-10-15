(async () => {
  const T = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { Character } = await import('../src/characters/Character.js');
  const id = window.__analyzeFighter || 'capoeira';
  const gltf = await new GLTFLoader().loadAsync(`./assets/characters/generated/${id}.glb`);
  const ch = new Character(gltf, { modelYaw: 0 }), report = [];
  for (const name of ['Light','Kick','Heavy']) {
    ch.mixer.stopAllAction(); const action = ch.actions.get(name); action.reset().setEffectiveWeight(1).play();
    ch.mixer.update(0);
    const names = id === 'capoeira' ? ['mixamorigRightFoot','mixamorigLeftFoot'] : ['mixamorigRightHand','mixamorigLeftHand'];
    const bones = names.map(n => ch.bone(n)), previous = bones.map(b => b.getWorldPosition(new T.Vector3()));
    const buckets = Array.from({ length: 10 }, (_, i) => ({ phase: i / 10, speed: 0, reach: 0, height: 0 }));
    for (let i = 0; i < Math.floor(action.getClip().duration * 120); i++) {
      ch.mixer.update(1 / 120);
      const b = buckets[Math.min(9, Math.floor(action.time / action.getClip().duration * 10))];
      bones.forEach((bone, j) => { const p = bone.getWorldPosition(new T.Vector3()); b.speed = Math.max(b.speed, p.distanceTo(previous[j]) * 120); b.reach = Math.max(b.reach, p.z); b.height = Math.max(b.height, p.y); previous[j].copy(p); });
    }
    report.push({ name, duration: action.getClip().duration, buckets: buckets.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, +v.toFixed(2)]))) });
  }
  return { id, report };
})()
