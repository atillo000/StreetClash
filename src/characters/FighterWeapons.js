import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const WEAPONS = {
  bow: { url: './assets/Weapons/long-bow.glb', length: 1.25, axis: 'x', grip: 0.5 },
  greatsword: { url: './assets/Weapons/generated/great-sword.glb', length: 1.35, axis: 'z', grip: 0.17 },
  axe: { url: './assets/Weapons/battle-axe.glb', length: 0.95, axis: 'x', grip: 0.18 },
};

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
    const root = new THREE.Group(), pivot = new THREE.Group(), model = source.clone(true);
    root.name = id + ' weapon'; character.root.add(root); root.add(pivot); pivot.add(model);
    if (config.axis === 'x') model.rotation.z = Math.PI / 2;
    // The supplied sword's handle is at +Z; its blade extends toward -Z.
    else model.rotation.x = Math.PI / 2;
    let bounds = new THREE.Box3().setFromObject(model), height = bounds.max.y - bounds.min.y;
    model.scale.setScalar(config.length / height);
    bounds = new THREE.Box3().setFromObject(model);
    model.position.add(new THREE.Vector3(-(bounds.min.x + bounds.max.x) / 2,
      -bounds.min.y - config.length * config.grip, -(bounds.min.z + bounds.max.z) / 2));
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const marker = y => { const m = new THREE.Object3D(); m.position.y = y; pivot.add(m); return m; };
    const tip = marker(config.length * (1 - config.grip)), mid = marker(config.length * 0.45), base = marker(0.1);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, 0.15); root.add(muzzle);
    const right = character.bone('mixamorigRightHand'), left = character.bone('mixamorigLeftHand');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
    const q = new THREE.Quaternion(), inverse = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const materials = new Set();
    model.traverse(o => { if (o.isMesh) { o.material = [].concat(o.material).map(m => { const copy = m.clone(); materials.add(copy); return copy; }); if (o.material.length === 1) o.material = o.material[0]; } });
    const equipment = { root, tip, mid, base, muzzle, id, kick() {},
      update(stowed = false) {
        root.visible = !stowed;
        const hand = id === 'bow' ? left : right;
        hand.getWorldPosition(a); character.root.worldToLocal(a); root.position.copy(a);
        if (id === 'bow') root.quaternion.identity();
        else {
          character.root.getWorldQuaternion(inverse).invert();
          hand.getWorldQuaternion(q); q.premultiply(inverse);
          direction.set(1, 0, 0).applyQuaternion(q);
          if (id === 'greatsword') {
            left.getWorldPosition(b); character.root.worldToLocal(b);
            if (b.distanceTo(a) > 0.07) direction.subVectors(b, a).normalize();
          }
          root.quaternion.setFromUnitVectors(up, direction.normalize());
        }
        root.updateMatrixWorld(true);
      },
      dispose() { root.removeFromParent(); for (const material of materials) material.dispose(); },
    };
    equipment.update(); return equipment;
  }
}
