(async () => {
  const T = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { Character } = await import('../src/characters/Character.js');
  const id = window.__previewFighter || 'capoeira';
  const gltf = await new GLTFLoader().loadAsync(`./assets/characters/generated/${id}.glb`);
  const c = new Character(gltf, { modelYaw: 0 }); c.startLocomotion();
  __world.match.practice(); __world.setPaused(true); document.getElementById('pause').style.display = 'none';
  __player.character.model.visible = false;
  window.__previewCharacter?.root.removeFromParent();
  __player.character.root.parent.add(c.root); c.root.position.copy(__player.position); c.root.rotation.y = Math.PI;
  for (let i = 0; i < 60; i++) { c.locomote(0, 1 / 60); c.update(1 / 60); }
  window.__previewCharacter = c;
  const bounds = new T.Box3().setFromObject(c.root);
  return { id, min: bounds.min.toArray(), max: bounds.max.toArray(),
    feet: ['LeftFoot','RightFoot','LeftToeBase'].map(n => c.bone('mixamorig' + n).getWorldPosition(new T.Vector3()).toArray()),
    bones: (() => { const list = []; c.model.traverse(o => { if (o.isBone) list.push(o.name); }); return { count: list.length, unique: new Set(list).size }; })() };
})()
