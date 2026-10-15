(async () => {
  const T = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const { mergeVertices } = await import('three/addons/utils/BufferGeometryUtils.js');
  const { FIGHTERS } = await import('../src/characters/FighterCatalog.js');
  const { fitClips } = await import('../src/animation/AnimBank.js');
  const id = window.__prepareFighter || 'capoeira', config = FIGHTERS[id];
  if (!config) throw new Error('Unknown fighter');
  const manager = new T.LoadingManager();
  let complete = false;
  manager.onLoad = () => { complete = true; };
  const model = await new FBXLoader(manager).loadAsync(encodeURI(config.source));
  for (let i = 0; i < 1200 && !complete; i++) await new Promise(r => setTimeout(r, 25));
  if (!complete) throw new Error('Character textures did not finish loading');
  model.updateMatrixWorld(true);

  // Some multi-mesh FBXs repeat bone names across separate skin deformers.
  // PropertyBinding would animate only the first copy. Rebind every skin to one
  // canonical rig, preserving bind matrices and verifying equivalent rest poses.
  const originals = [], canonical = new Map(), matrices = new Map();
  model.traverse(o => { if (o.isBone) originals.push(o); });
  let maximumBindDifference = 0;
  for (const bone of originals) {
    if (!canonical.has(bone.name)) {
      const clone = new T.Bone(); clone.name = bone.name; canonical.set(bone.name, clone);
      matrices.set(bone.name, bone.matrixWorld.clone());
    } else {
      const a = matrices.get(bone.name).elements, b = bone.matrixWorld.elements;
      maximumBindDifference = Math.max(maximumBindDifference, ...a.map((v, i) => Math.abs(v - b[i])));
    }
  }
  if (maximumBindDifference > 0.01) throw new Error('Repeated bones have different bind poses; manual rig repair needed');
  const modelInverse = model.matrixWorld.clone().invert();
  const seen = new Set();
  for (const bone of originals) {
    if (seen.has(bone.name)) continue; seen.add(bone.name);
    const clone = canonical.get(bone.name), parent = bone.parent?.isBone ? canonical.get(bone.parent.name) : null;
    const local = (parent ? matrices.get(bone.parent.name).clone().invert() : modelInverse.clone()).multiply(matrices.get(bone.name));
    local.decompose(clone.position, clone.quaternion, clone.scale);
    if (parent) parent.add(clone);
  }
  for (const bone of originals) if (!bone.parent?.isBone) bone.removeFromParent();
  for (const bone of canonical.values()) if (!bone.parent) model.add(bone);
  model.updateMatrixWorld(true);
  model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const skeleton = new T.Skeleton(mesh.skeleton.bones.map(b => canonical.get(b.name)), mesh.skeleton.boneInverses.map(m => m.clone()));
    mesh.bind(skeleton, mesh.bindMatrix.clone());
  });

  const materials = new Map();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    const convert = material => {
      if (!materials.has(material)) materials.set(material, new T.MeshStandardMaterial({ name: material.name,
        color: material.color, map: material.map, normalMap: material.normalMap,
        normalScale: material.normalScale?.clone() || new T.Vector2(1, 1), roughness: 0.8, metalness: 0.02,
        alphaMap: material.alphaMap, alphaTest: material.transparent ? 0.35 : 0,
        side: material.transparent ? T.DoubleSide : T.FrontSide }));
      return materials.get(material);
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
    mesh.geometry = mergeVertices(mesh.geometry);
  });
  const restBounds = new T.Box3().setFromObject(model);
  const scale = config.height / (restBounds.max.y - restBounds.min.y);
  // Fit before scaling/export, while both source and target rigs use native cm.
  const bank = new Map(); bank.roots = new Map();
  const cache = new Map();
  for (const [key, url] of Object.entries(config.clips)) {
    let fbx = cache.get(url);
    if (!fbx) { fbx = await new FBXLoader().loadAsync(encodeURI(url)); cache.set(url, fbx); }
    if (!fbx.animations[0]) throw new Error('No animation: ' + url);
    bank.set(key, fbx.animations[0]); bank.roots.set(key, fbx);
  }
  const clips = fitClips(bank, { animations: [] }, model, { trims: config.clipTrims || {} });
  if (!clips.some(c => c.name === 'Sprint')) {
    const sprint = clips.find(c => c.name === 'Run').clone(); sprint.name = 'Sprint';
    const ratio = config.runSpeed / config.sprintSpeed; sprint.duration *= ratio;
    for (const track of sprint.tracks) for (let i = 0; i < track.times.length; i++) track.times[i] *= ratio;
    clips.push(sprint);
  }
  for (const clip of clips) {
    if (['Jump', 'JumpRun', 'JumpLoop'].includes(clip.name)) for (const track of clip.tracks) if (/Hips\.position$/.test(track.name)) {
      for (let i = 3; i < track.values.length; i += 3) {
        track.values[i] = track.values[0]; track.values[i + 1] = track.values[1]; track.values[i + 2] = track.values[2];
      }
    }
    // Keep animation sampling at 30 fps; AnimationMixer interpolates at 60 Hz.
    const count = Math.ceil(clip.duration * 30);
    for (const track of clip.tracks) {
      const size = track.getValueSize(), sample = track.createInterpolant();
      const times = new Float32Array(count + 1), values = new Float32Array((count + 1) * size);
      for (let i = 0; i <= count; i++) {
        times[i] = Math.min(clip.duration, i / 30);
        values.set(sample.evaluate(times[i]), i * size);
      }
      // The supplied travelling ginga takes do not end in their starting pose.
      // Close their final 28% into the first pose instead of snapping at repeat.
      if (id === 'capoeira' && ['CombatWalk','CombatRun','BackWalk','BackRun','StrafeLeftWalk','StrafeRightWalk','StrafeLeftRun','StrafeRightRun'].includes(clip.name)) {
        const first = Array.from(values.slice(0, size));
        for (let i = 0; i <= count; i++) {
          const phase = times[i] / clip.duration;
          if (phase < 0.72) continue;
          const k = T.MathUtils.smoothstep(phase, 0.72, 1);
          if (size === 4 && track.name.endsWith('.quaternion')) {
            const q = new T.Quaternion().fromArray(values, i * size).slerp(new T.Quaternion().fromArray(first), k);
            q.toArray(values, i * size);
          } else for (let j = 0; j < size; j++) values[i * size + j] = T.MathUtils.lerp(values[i * size + j], first[j], k);
        }
      }
      track.times = times; track.values = values; track.optimize();
    }
  }
  model.scale.setScalar(scale); model.position.y = -restBounds.min.y * scale;
  model.name = config.name;
  model.updateMatrixWorld(true);
  const binary = await new GLTFExporter().parseAsync(model, { binary: true, animations: clips, maxTextureSize: 1024, onlyVisible: false });
  const response = await fetch(`http://127.0.0.1:8124/${id}.glb`, { method: 'POST', body: binary });
  if (!response.ok) throw new Error(await response.text());
  const report = { id, originalBones: originals.length, uniqueBones: canonical.size, maximumBindDifference,
    height: config.height, scale, bytes: binary.byteLength,
    clips: clips.map(c => ({ name: c.name, duration: c.duration, tracks: c.tracks.length })), sources: config.clips };
  await fetch(`http://127.0.0.1:8124/${id}.json`, { method: 'POST', body: JSON.stringify(report, null, 2) });
  model.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  for (const material of materials.values()) { for (const key of ['map', 'normalMap', 'alphaMap']) material[key]?.dispose(); material.dispose(); }
  return { id, originalBones: originals.length, uniqueBones: canonical.size, maximumBindDifference, bytes: binary.byteLength, clipCount: report.clips.length };
})()
