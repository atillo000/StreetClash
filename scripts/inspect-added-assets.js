(async () => {
  const T = await import('three'); const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const result = [];
  for (const file of ['Weapons/long-bow.glb', 'Weapons/great-sword.glb', 'Weapons/battle-axe.glb', 'environment/old-barrel.glb', 'environment/wooden-crate.glb']) {
    const gltf = await new GLTFLoader().loadAsync('./assets/' + file);
    gltf.scene.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(gltf.scene), names = []; let triangles = 0;
    gltf.scene.traverse(o => { if (o.isMesh) { names.push(o.name); triangles += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3; } });
    result.push({ file, min: bounds.min.toArray(), max: bounds.max.toArray(), triangles, names });
  }
  return result;
})()
