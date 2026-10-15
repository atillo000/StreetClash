import * as THREE from 'three';
import { ArenaCollision } from '../physics/collision.js';

export function createTrainingArena(scene) {
  const obstacles = [], cameraBlockers = [];
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x354565, roughness: 0.85 });
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0xbc7743, roughness: 0.8 });
  const trimMaterial = new THREE.MeshBasicMaterial({ color: 0xffbe53 });
  function box(x, z, w, h, d, material, obstacle = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    const bounds = new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2));
    cameraBlockers.push(bounds);
    if (obstacle) obstacles.push(bounds);
  }
  for (const [x, z, w, d] of [[-12.2, 0, 0.4, 24.8], [12.2, 0, 0.4, 24.8], [0, -12.2, 24, 0.4], [0, 12.2, 24, 0.4]]) {
    box(x, z, w, 1, d, wallMaterial);
  }
  for (const [x, z] of [[-5, -2], [5, -2], [-5, 5], [5, 5]]) {
    box(x, z, 1.8, 1.4, 1.8, crateMaterial, true);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 1.84), trimMaterial);
    stripe.position.set(x, 1.1, z); scene.add(stripe);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.9, 3.95, 64), new THREE.MeshBasicMaterial({ color: 0x94b7db, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const collision = new ArenaCollision({ halfSize: 12, obstacles });
  collision.cameraBlockers = cameraBlockers;
  return collision;
}
