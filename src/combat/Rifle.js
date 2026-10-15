import * as THREE from 'three';

// An original rifle prop. Its grip follows the right hand and the fore-end
// follows the support hand in the supplied rifle poses; unarmed actions stow it.
export function createRifle(character) {
  const root = new THREE.Group(); character.root.add(root);
  const steel = new THREE.MeshStandardMaterial({ color: 0x29323a, metalness: 0.65, roughness: 0.4 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x554c3c, roughness: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xd59d53, roughness: 0.6 });
  function box(x, y, z, w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; root.add(mesh); return mesh;
  }
  box(0, 0.03, 0.13, 0.065, 0.1, 0.32, steel);
  box(0, 0.02, -0.16, 0.065, 0.13, 0.25, grip);
  box(0, -0.08, 0, 0.045, 0.15, 0.07, grip).rotation.x = -0.2;
  box(0, -0.07, 0.18, 0.05, 0.15, 0.08, steel).rotation.x = 0.15;
  box(0, 0.025, 0.36, 0.075, 0.075, 0.21, grip);
  box(0, 0.11, 0.13, 0.04, 0.045, 0.17, steel);
  box(0.036, 0.05, 0.13, 0.004, 0.03, 0.15, accent);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.28, 10), steel);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, 0.59); root.add(barrel);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.04, 0.75); root.add(muzzle);
  const right = character.bone('mixamorigRightHand'), left = character.bone('mixamorigLeftHand'), spine = character.bone('mixamorigSpine2');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), forward = new THREE.Vector3(0, 0, 1);
  let recoil = 0;
  return { root, muzzle,
    kick() { recoil = 0.055; },
    update(stowed = false) {
      if (stowed) {
        spine.getWorldPosition(a); character.root.worldToLocal(a);
        root.position.copy(a); root.position.z -= 0.2; root.rotation.set(0, 0, -0.65); return;
      }
      right.getWorldPosition(a); left.getWorldPosition(b);
      character.root.worldToLocal(a); character.root.worldToLocal(b);
      dir.subVectors(b, a).normalize();
      if (dir.z < 0.3) dir.copy(forward);
      root.position.copy(a).addScaledVector(dir, -recoil); root.quaternion.setFromUnitVectors(forward, dir); recoil *= 0.72;
    },
    dispose() { root.removeFromParent(); root.traverse(o => o.geometry?.dispose()); for (const m of [steel, grip, accent]) m.dispose(); },
  };
}
