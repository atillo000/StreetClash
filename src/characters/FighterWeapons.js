import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { palmWorld } from './HandSocket.js';

// Handle centers measured on the supplied geometry AFTER its axis conversion,
// in source units. The center of the complete asset is not the grip center:
// the bow's curved limbs and the axe head make their bounds asymmetric.
export const WEAPONS = {
  rifle: { url: './assets/Weapons/kenney/blaster-n-runtime.glb', length: 0.85, axis: 'rifle', grip: 0,
    handle: [0, -0.105, -0.09005] },
  bow: { url: './assets/Weapons/long-bow.glb', length: 1.45, axis: 'x', grip: 0.5,
    handle: [-0.020105, 0, 0.072845] },
  greatsword: { url: './assets/Weapons/generated/great-sword.glb', length: 1.45, axis: 'z', grip: 0.15,
    handle: [-0.000034, -0.384982, 0.043674] },
  axe: { url: './assets/Weapons/battle-axe.glb', length: 1.15, axis: 'x', grip: 0.17,
    handle: [-0.018299, -0.260898, -0.063499] },
};

// Build a complete mounting frame, including roll. +Y runs from the pommel
// toward the blade/upper limb; +Z faces the axe edge/bow limbs forward.
function frame(up, forward, out) {
  const y = up.clone().normalize();
  const z = forward.clone().addScaledVector(y, -forward.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  z.crossVectors(x, y).normalize();
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

export class FighterWeapons {
  constructor() { this.models = new Map(); }
  async load() {
    const loader = new GLTFLoader();
    await Promise.all(Object.entries(WEAPONS).map(async ([id, config]) => {
      this.models.set(id, (await loader.loadAsync(config.url)).scene);
    }));
    return this;
  }
  create(id, character) {
    const config = WEAPONS[id], source = this.models.get(id);
    if (!config || !source) return null;
    const root = new THREE.Group(), model = source.clone(true);
    root.name = id + ' weapon'; root.add(model);
    if (config.axis === 'x') model.rotation.z = Math.PI / 2;
    else if (config.axis === 'z') model.rotation.x = Math.PI / 2;
    else if (id === 'rifle') model.rotation.y = Math.PI;
    const bounds = new THREE.Box3().setFromObject(model);
    const height = id === 'rifle' ? bounds.max.z-bounds.min.z : bounds.max.y-bounds.min.y;
    const scale = config.length / height;
    model.scale.setScalar(scale);
    model.position.fromArray(config.handle).multiplyScalar(-scale);
    character.root.add(root);
    const marker = (name, point) => { const m = new THREE.Object3D(); m.name = name; m.position.copy(point); root.add(m); return m; };
    const tip = marker('blade tip', new THREE.Vector3(0,(bounds.max.y-config.handle[1])*scale,0));
    const mid = marker('blade middle', new THREE.Vector3(0,tip.position.y*.55,0));
    const base = marker('blade base', new THREE.Vector3(0,id==='greatsword'?.23:.1,0));
    const muzzle = marker('muzzle', new THREE.Vector3(0,id==='rifle'?(.055-config.handle[1])*scale:0,id==='rifle'?(bounds.max.z-config.handle[2])*scale:.15));
    const side = id === 'bow' ? 'Left' : 'Right', hand = character.bone('mixamorig'+side+'Hand');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
    const q = new THREE.Quaternion(), inverse = new THREE.Quaternion(), handRotation = new THREE.Quaternion();
    const mounting = new THREE.Quaternion(), swing = new THREE.Quaternion(), mountedAxis = new THREE.Vector3();
    const longAxis = new THREE.Vector3(0,id==='rifle'?0:1,id==='rifle'?1:0);
    character.root.updateMatrixWorld(true);
    character.root.getWorldQuaternion(inverse).invert();
    hand.getWorldQuaternion(handRotation).premultiply(inverse).normalize();
    if (id === 'rifle') {
      palmWorld(character,'Right',a); palmWorld(character,'Left',b);
      character.root.worldToLocal(a); character.root.worldToLocal(b); direction.subVectors(b,a).normalize();
      const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
      const y = new THREE.Vector3().crossVectors(direction,x).normalize();
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,direction));
    } else {
      // Across the knuckles, not along the fingers. The left hand uses -X.
      direction.set(side==='Left'?-1:1,0,0).applyQuaternion(handRotation);
      if (id === 'greatsword') {
        // The supporting left hand holds the POMMEL, below the right hand.
        palmWorld(character,'Right',a); palmWorld(character,'Left',b);
        character.root.worldToLocal(a); character.root.worldToLocal(b); direction.subVectors(a,b).normalize();
      }
      frame(direction,new THREE.Vector3(0,0,1),q);
    }
    mounting.copy(handRotation).invert().multiply(q);
    const materials = new Set();
    model.traverse(o => { if (o.isMesh) {
      o.castShadow=true; o.receiveShadow=true;
      o.material=[].concat(o.material).map(m=>{const copy=m.clone();materials.add(copy);return copy;});
      if(o.material.length===1)o.material=o.material[0];
    }});
    const equipment = { root, model, grip: root, tip, mid, base, muzzle, id, kick() {},
      update(stowed = false) {
        root.visible = !stowed;
        character.root.updateMatrixWorld(true);
        palmWorld(character,side,a); character.root.worldToLocal(a); root.position.copy(a);
        character.root.getWorldQuaternion(inverse).invert();
        hand.getWorldQuaternion(q).premultiply(inverse).normalize().multiply(mounting);
        if (id === 'greatsword' || id === 'rifle') {
          palmWorld(character,'Left',b); character.root.worldToLocal(b);
          const distance=b.distanceTo(a);
          // Sword points AWAY from the lower hand; rifle points TOWARD its foregrip.
          direction.subVectors(id==='greatsword'?a:b,id==='greatsword'?b:a).normalize();
          mountedAxis.copy(longAxis).applyQuaternion(q);
          if(distance>.08&&distance<.5&&mountedAxis.dot(direction)>.2)q.premultiply(swing.setFromUnitVectors(mountedAxis,direction));
        }
        root.quaternion.copy(q).normalize(); root.updateMatrixWorld(true);
      },
      dispose() { root.removeFromParent(); for (const material of materials) material.dispose(); },
    };
    equipment.update(); return equipment;
  }
}
