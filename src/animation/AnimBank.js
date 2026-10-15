import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CLIP_TRIMS } from '../combat/moves.js';

// Every Mixamo clip the game uses. key -> file (relative to index.html).
export const CLIP_FILES = {
  Idle:    ['./assets/animations/locomotion/idle.fbx'],
  Walk:    './assets/animations/locomotion/walking.fbx',
  Run:     './assets/animations/locomotion/running.fbx',
  StrafeLeftWalk: './assets/animations/locomotion/left strafe walking.fbx',
  StrafeRightWalk: './assets/animations/locomotion/right strafe walking.fbx',
  StrafeLeftRun: './assets/animations/locomotion/left strafe.fbx',
  StrafeRightRun: './assets/animations/locomotion/right strafe.fbx',
  TurnLeft: './assets/animations/locomotion/left turn 90.fbx',
  TurnRight: './assets/animations/locomotion/right turn 90.fbx',
  Punch:   './assets/animations/Boxing Animation/Punch Combo.fbx',
  Kick:    './assets/animations/Boxing Animation/Mma Kick.fbx',
  Heavy:   './assets/animations/Boxing Animation/Heavy Weapon Swing.fbx',
  Block:   './assets/animations/Boxing Animation/Outward Block.fbx',
  Roll:    './assets/animations/Boxing Animation/Stand To Roll.fbx',
  Hit:     './assets/animations/Boxing Animation/Hit Reaction.fbx',
  Down:    './assets/animations/Boxing Animation/Knocked Down.fbx',
  GetUp:   './assets/animations/Boxing Animation/Getting Up.fbx',
  Defeat:  './assets/animations/Boxing Animation/Defeat.fbx',
  Victory: './assets/animations/Boxing Animation/Victory.fbx',
  // Jump is reserved for a later stage.
};

// Loads all FBX files in parallel and keeps the raw clips (Mixamo units: centimetres).
export async function loadAnimBank(files = CLIP_FILES, onProgress) {
  const loader = new FBXLoader();
  const bank = new Map();
  bank.roots = new Map();   // key -> loaded FBX scene (needed to read the FBX hips parent orientation)
  let done = 0;
  await Promise.all(Object.entries(files).map(async ([key, url]) => {
    // Accept one URL or several candidates (a missing file makes the server answer with an HTML 404 page,
    // which the FBX parser reports as "Unknown property type").
    for (const u of [].concat(url)) {
      try {
        const fbx = await loader.loadAsync(encodeURI(u));
        if (fbx.animations?.length) { bank.set(key, fbx.animations[0]); bank.roots.set(key, fbx); break; }
        console.warn('No animation inside', u);
      } catch (e) {
        console.warn('Could not load', u, '(file missing or unreadable)');
      }
    }
    if (!bank.has(key)) console.warn('[AnimBank] clip "' + key + '" is missing - tried: ' + [].concat(url).join(', '));
    onProgress?.(++done, Object.keys(files).length);
  }));
  // Prefer each model's native idle if this file is unreadable. Keep a last-resort
  // static pose for rigs without an idle; fitClips handles native rig headings.
  if (!bank.has('Idle')) {
    bank.useNativeIdle = true;
    const sourceKey = ['Hit', 'Victory', 'Walk'].find(key => bank.has(key));
    const src = bank.get(sourceKey);
    if (src) {
      const tracks = src.tracks.map(t => {
        const stride = t.values.length / t.times.length;
        const first = Array.from(t.values.slice(0, stride));
        return new t.constructor(t.name, [0, 1], first.concat(first));
      });
      bank.set('Idle', new THREE.AnimationClip('Idle', 1, tracks));
      bank.roots.set('Idle', bank.roots.get(sourceKey));
      console.warn('[AnimBank] idle.fbx could not be loaded; using native model idle where available');
    }
  }
  return bank;
}

// Best source for the unit ratio: compare the hips rest position in the model and in the FBX (both T-pose).
function restRatio(model, bank) {
  const ref = bank.roots?.get('Idle') || [...(bank.roots?.values() || [])][0];
  const mh = model.getObjectByName('mixamorigHips');
  const fh = ref?.getObjectByName('mixamorigHips');
  if (!mh || !fh) return null;
  const a = mh.position.length(), b = fh.position.length();
  const r = a / b;
  console.log('[AnimBank] hips rest length model=' + a.toFixed(4) + ' fbx=' + b.toFixed(4) + ' ratio=' + r.toFixed(5));
  return (a > 1e-6 && b > 1e-6 && r > 0.001 && r < 5) ? r : null;
}

// Mixamo FBX hips are in cm, our glb models are in metres (or whatever their own rig uses).
// Compare each model's own Idle hips position with the FBX Idle to get the real ratio.
function hipsRatio(gltf, fbxIdle) {
  const find = (clip) => clip?.tracks.find(t => /Hips\.position$/.test(t.name));
  const mine = find(gltf.animations.find(c => /idle/i.test(c.name)));
  const theirs = find(fbxIdle);
  if (mine && theirs) {
    const a = Math.hypot(mine.values[0], mine.values[1], mine.values[2]);
    const b = Math.hypot(theirs.values[0], theirs.values[1], theirs.values[2]);
    const r = a / b;
    if (b > 1e-6 && r > 0.001 && r < 5) return r;
  }
  return 0.01;
}

// Accumulated rotation from `stop` (excluded) down to node's parent (included).
function parentRotation(node, stop) {
  const q = new THREE.Quaternion();
  const chain = [];
  for (let n = node.parent; n && n !== stop; n = n.parent) chain.push(n);
  for (let i = chain.length - 1; i >= 0; i--) q.multiply(chain[i].quaternion);
  return q;
}

// Mixamo FBX and our glb can have differently-rotated parents above the hips (e.g. a -90 deg armature node),
// which makes the whole body lie down. This finds the rotation that fixes it: inv(modelParent) * fbxParent.
function hipsFix(model, bank) {
  const ref = bank.roots?.get('Idle') || [...(bank.roots?.values() || [])][0];
  const fix = new THREE.Quaternion();
  if (!ref) return fix;
  const mh = model.getObjectByName('mixamorigHips');
  const fh = ref.getObjectByName('mixamorigHips');
  if (!mh || !fh) return fix;
  const pm = parentRotation(mh, model);
  const pf = parentRotation(fh, ref);
  fix.copy(pm).invert().multiply(pf);
  const angle = 2 * Math.acos(Math.min(1, Math.abs(fix.w))) * 180 / Math.PI;
  console.log('[AnimBank] hips orientation fix: ' + angle.toFixed(1) + ' deg');
  return fix;
}

const KEEP_ROOT_MOTION = new Set([]); // clips that should keep their hips x/z travel

// Turn raw FBX clips into clips that fit one particular model:
//  - drops scale tracks and tracks for bones the model doesn't have
//  - scales hips position to the model's units
//  - removes forward/side travel ("in place") so gameplay code owns movement
export function fitClips(bank, gltf, model, { trims = CLIP_TRIMS } = {}) {
  const ratio = restRatio(model, bank) ?? (bank.get('Idle') ? hipsRatio(gltf, bank.get('Idle')) : 0.01);
  console.log('[AnimBank] hips scale used: ' + ratio);
  const fix = hipsFix(model, bank);
  const needFix = Math.abs(fix.w) < 0.99999;
  const out = [];
  for (const [key, src] of bank) {
    if (key === 'Idle' && bank.useNativeIdle) {
      const native = gltf.animations.find(c => /^idle$/i.test(c.name));
      if (native) {
        const clip = native.clone();
        clip.name = 'Idle';
        for (const track of clip.tracks) {
          if (!/Hips\.position$/.test(track.name)) continue;
          const hips = model.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.')));
          const parent = parentRotation(hips, model), inverse = parent.clone().invert();
          const tmp = new THREE.Vector3();
          for (let i = 0; i < track.values.length; i += 3) {
            tmp.fromArray(track.values, i).applyQuaternion(parent);
            tmp.x = 0; tmp.z = 0;
            tmp.applyQuaternion(inverse).toArray(track.values, i);
          }
        }
        out.push(clip);
        continue;
      }
    }
    const sourceRoot = bank.roots?.get(key);
    const sourceHips = sourceRoot?.getObjectByName('mixamorigHips');
    const targetHips = model.getObjectByName('mixamorigHips');
    // Align the rigs' bind-pose headings before transferring rotations. GLB
    // exports can bake different bone axes even when names match (notably Xbot).
    const restWorld = (bone, root) => parentRotation(bone, root).multiply(bone.quaternion);
    const heading = (bone, root) => {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(restWorld(bone, root));
      return Math.atan2(forward.x, forward.z);
    };
    const alignment = sourceHips && targetHips
      ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading(targetHips, model) - heading(sourceHips, sourceRoot))
      : new THREE.Quaternion();
    const tracks = [];
    for (const t of src.tracks) {
      const dot = t.name.lastIndexOf('.');
      const node = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
      if (prop === 'scale') continue;
      if (!model.getObjectByName(node)) continue;
      if (prop === 'position') {
        if (!/Hips$/.test(node)) continue; // only the hips move in Mixamo clips
        const tr = t.clone();
        const v = tr.values;
        // Remove travel in the FBX's upright coordinates BEFORE converting into
        // the target hips parent's space. Soldier's parent rotates -90 degrees
        // around X: local Y is ground travel and local Z is height on that rig.
        // Freezing target-local X/Z kept forward travel and removed the bounce.
        if (!KEEP_ROOT_MOTION.has(key)) {
          const hips = model.getObjectByName(node);
          const sourceHips = bank.roots?.get(key)?.getObjectByName(node);
          const sourceRotation = sourceHips ? parentRotation(sourceHips, bank.roots.get(key)) : new THREE.Quaternion();
          const targetInverse = parentRotation(hips, model).invert();
          const tmp = new THREE.Vector3();
          // Center every clip over the gameplay pivot, avoiding offsets when blending.
          for (let i = 0; i < v.length; i += 3) {
            tmp.set(v[i], v[i + 1], v[i + 2]).applyQuaternion(sourceRotation);
            tmp.x = 0; tmp.z = 0;
            tmp.multiplyScalar(ratio).applyQuaternion(targetInverse);
            v[i] = tmp.x; v[i + 1] = tmp.y; v[i + 2] = tmp.z;
          }
        } else {
          const tmp = new THREE.Vector3();
          for (let i = 0; i < v.length; i += 3) {
            tmp.set(v[i], v[i + 1], v[i + 2]).multiplyScalar(ratio).applyQuaternion(fix);
            v[i] = tmp.x; v[i + 1] = tmp.y; v[i + 2] = tmp.z;
          }
        }
        tracks.push(tr);
      } else {
        const tr = t.clone();
        const sourceBone = sourceRoot?.getObjectByName(node);
        const targetBone = model.getObjectByName(node);
        if (prop === 'quaternion' && sourceBone) {
          const left = parentRotation(targetBone, model).invert()
            .multiply(alignment).multiply(parentRotation(sourceBone, sourceRoot));
          const right = restWorld(sourceBone, sourceRoot).invert()
            .multiply(alignment.clone().invert()).multiply(restWorld(targetBone, model));
          const q = new THREE.Quaternion(), v = tr.values;
          for (let i = 0; i < v.length; i += 4) {
            q.set(v[i], v[i + 1], v[i + 2], v[i + 3]);
            // Gameplay owns heading: turn clips contribute footwork, not another
            // authored 90-degree spin on top of the movement controller's turn.
            if (key.startsWith('Turn') && /Hips$/.test(node)) {
              const yaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
              q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw));
            }
            q.premultiply(left).multiply(right).normalize();
            v[i] = q.x; v[i + 1] = q.y; v[i + 2] = q.z; v[i + 3] = q.w;
          }
        } else if (needFix && prop === 'quaternion' && /Hips$/.test(node)) {
          const q = new THREE.Quaternion(), v = tr.values;
          for (let i = 0; i < v.length; i += 4) {
            q.fromArray(v, i).premultiply(fix).toArray(v, i);
          }
        }
        tracks.push(tr);
      }
    }
    let clip = new THREE.AnimationClip(key, src.duration, tracks);
    const trim = trims[key];
    if (trim) clip = THREE.AnimationUtils.subclip(clip, key, trim[0] * src.duration * 30, trim[1] * src.duration * 30, 30);
    out.push(clip);
  }
  for (const [source, name] of [['Walk', 'BackWalk'], ['Run', 'BackRun']]) {
    const clip = out.find(c => c.name === source);
    if (!clip || out.some(c => c.name === name)) continue;
    const reversed = clip.clone(); reversed.name = name;
    for (const track of reversed.tracks) {
      const size = track.getValueSize(), times = track.times.slice(), values = track.values.slice();
      for (let i = 0; i < times.length; i++) {
        const j = times.length - 1 - i;
        track.times[i] = clip.duration - times[j];
        for (let k = 0; k < size; k++) track.values[i * size + k] = values[j * size + k];
      }
    }
    out.push(reversed);
  }
  return out;
}
