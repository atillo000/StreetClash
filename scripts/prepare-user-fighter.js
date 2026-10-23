(async () => {
  const T = await import('three');
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const { mergeVertices } = await import('three/addons/utils/BufferGeometryUtils.js');
  const { FIGHTERS } = await import('../src/characters/FighterCatalog.js?prepare=roster-v2');
  const { fitClips } = await import('../src/animation/AnimBank.js');
  const id = window.__prepareFighter || 'capoeira', config = FIGHTERS[id];
  if (!config) throw new Error('Unknown fighter');
  const manager = new T.LoadingManager();
  let complete = false;
  manager.onLoad = () => { complete = true; };
  const model = config.source.endsWith('.glb')
    ? (await new GLTFLoader(manager).loadAsync(encodeURI(config.source))).scene
    : await new FBXLoader(manager).loadAsync(encodeURI(config.source));
  for (let i = 0; i < 1200 && !complete; i++) await new Promise(r => setTimeout(r, 25));
  if (!complete) throw new Error('Character textures did not finish loading');
  model.updateMatrixWorld(true);
  for (const name of config.omitMeshes || []) model.getObjectByName(name)?.removeFromParent();

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
    if (!fbx) {
      if (/\.(glb|gltf)$/i.test(url)) {
        // glTF source clips use metres; normalize to the centimetres used by
        // the supplied Mixamo FBXs before fitClips applies the model's ratio.
        const gltf = await new GLTFLoader().loadAsync(encodeURI(url));
        fbx = gltf.scene; fbx.animations = gltf.animations;
        fbx.traverse(node => node.position.multiplyScalar(100));
        for (const clip of fbx.animations) for (const track of clip.tracks) {
          if (track.name.endsWith('.position')) for (let i=0;i<track.values.length;i++) track.values[i] *= 100;
        }
        fbx.updateMatrixWorld(true);
      } else fbx = await new FBXLoader().loadAsync(encodeURI(url));
      cache.set(url, fbx);
    }
    if (!fbx.animations[0]) throw new Error('No animation: ' + url);
    bank.set(key, fbx.animations[0]); bank.roots.set(key, fbx);
  }
  const clips = fitClips(bank, { animations: [] }, model, { trims: config.clipTrims || {} });
  if(id==='soldier'){
    const idle=clips.find(c=>c.name==='PistolIdle');
    // The pack has no travelling crouch/landing takes. Reuse the existing leg
    // motion while preserving the pistol's authored upper-body aiming posture.
    const aiming=new Map(idle.tracks.filter(t=>/(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/.test(t.name)).map(t=>[t.name,t]));
    for(const name of ['CrouchWalk','CrouchBack','CrouchLeft','CrouchRight','CrouchForwardLeft','CrouchForwardRight','CrouchBackLeft','CrouchBackRight','TurnLeft','TurnRight','MoveStart','MoveStop','JumpLoop','Land']){
      const source=clips.find(c=>c.name===name);if(!source)continue;
      const clip=source.clone();clip.name='Pistol'+name;
      clip.tracks=clip.tracks.map(track=>{const pose=aiming.get(track.name);if(!pose)return track;const first=Array.from(pose.createInterpolant().evaluate(0));return new track.constructor(track.name,[0,clip.duration],first.concat(first));});clips.push(clip);
    }
    // Original recoil over the supplied two-handed pistol stance. No rifle pose
    // is reused for sidearm shooting. Peaks follow each move's release events.
    for(const[name,events]of Object.entries({PistolLight:[.25],PistolHeavy:[.18,.45,.72],PistolUltimateStart:[],PistolUltimateStrike:[.18,.4,.62],PistolUltimateFinisher:[.25]})){
      const duration=.75,times=Array.from({length:31},(_,i)=>i/30*duration);
      const tracks=idle.tracks.map(track=>{
        const size=track.getValueSize(),start=track.createInterpolant().evaluate(0).slice(),values=[];
        for(const time of times){
          const p=time/duration,recoil=Math.max(0,...events.map(at=>Math.max(0,1-Math.abs(p-at-.04)/.12)));
          if(track.name.endsWith('.quaternion')&&/(Right|Left)(ForeArm|Hand)\./.test(track.name)){
            const q=new T.Quaternion().fromArray(start).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.09*recoil));values.push(q.x,q.y,q.z,q.w);
          }else values.push(...start);
        }
        return new track.constructor(track.name,times,values);
      });clips.push(new T.AnimationClip(name,duration,tracks));
    }
  }
  if (!clips.some(c => c.name === 'Sprint')) {
    const sprint = clips.find(c => c.name === 'Run').clone(); sprint.name = 'Sprint';
    const ratio = config.runSpeed / config.sprintSpeed; sprint.duration *= ratio;
    for (const track of sprint.tracks) for (let i = 0; i < track.times.length; i++) track.times[i] *= ratio;
    clips.push(sprint);
  }
  for (const clip of clips) {
    if (config.reverseClips?.includes(clip.name)) for (const track of clip.tracks) {
      const stride = track.getValueSize(), original = track.values.slice();
      for (let i = 0; i < track.times.length; i++) track.values.set(original.subarray((track.times.length - 1 - i) * stride, (track.times.length - i) * stride), i * stride);
    }
    if (['Jump', 'JumpRun', 'JumpLoop','PistolJump','PistolJumpRun'].includes(clip.name)) for (const track of clip.tracks) if (/Hips\.position$/.test(track.name)) {
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
  const receiver = window.__assetReceiver || 'http://127.0.0.1:8124';
  const response = await fetch(`${receiver}/${id}.glb`, { method: 'POST', body: binary });
  if (!response.ok) throw new Error(await response.text());
  const report = { id, originalBones: originals.length, uniqueBones: canonical.size, maximumBindDifference,
    height: config.height, scale, bytes: binary.byteLength,
    clips: clips.map(c => ({ name: c.name, duration: c.duration, tracks: c.tracks.length })), sources: config.clips };
  await fetch(`${receiver}/${id}.json`, { method: 'POST', body: JSON.stringify(report, null, 2) });
  model.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  for (const material of materials.values()) { for (const key of ['map', 'normalMap', 'alphaMap']) material[key]?.dispose(); material.dispose(); }
  return { id, originalBones: originals.length, uniqueBones: canonical.size, maximumBindDifference, bytes: binary.byteLength, clipCount: report.clips.length };
})()
