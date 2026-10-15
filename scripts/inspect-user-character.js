(async () => {
  const T = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const manager = new T.LoadingManager();
  let texturesReady = false;
  manager.onLoad = () => { texturesReady = true; };
  const name = window.__inspectCharacter || 'Capoeira';
  const model = await new FBXLoader(manager).loadAsync(encodeURI(`./assets/characters/${name} Type Character.fbx`));
  const mesh = [], materials = [], bones = [];
  model.traverse(o => {
    if (o.isMesh) mesh.push({ name: o.name, triangles: (o.geometry.index?.count || o.geometry.attributes.position.count) / 3, skinned: !!o.isSkinnedMesh });
    if (o.isBone) bones.push(o.name);
    if (o.isMesh) for (const m of [].concat(o.material)) materials.push({ name: m.name, color: m.color?.getHexString(), texture: m.map?.name, normal: m.normalMap?.name });
  });
  for (let i = 0; i < 400 && !texturesReady; i++) await new Promise(r => setTimeout(r, 25));
  const textures = [];
  model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.map) textures.push({ name: m.map.name, width: m.map.image?.width, height: m.map.image?.height }); });
  model.updateMatrixWorld(true);
  const hips = model.getObjectByName('mixamorigHips');
  const bounds = new T.Box3().setFromObject(model);
  window.__inspectedModel = model;
  return { name, meshes: mesh, materials, textures, bones: bones.slice(0, 12), boneCount: bones.length,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    hips: hips && { position: hips.position.toArray(), quaternion: hips.quaternion.toArray() }, clips: model.animations.map(c => ({ name: c.name, duration: c.duration, tracks: c.tracks.length })) };
})()
