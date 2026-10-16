import * as THREE from 'three';

// Trace the crosshair through the scene, then fire from the fighter's hand.
// Cover wins over a fighter behind it; no renderer or DOM is needed here.
export class Aim {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.point = new THREE.Vector3(); this.target = null;
    this.floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }
  update(camera, owner, world) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0.12), camera);
    const ray = this.raycaster.ray, hit = new THREE.Vector3();
    let distance = 40; this.target = null;
    this.point.copy(ray.origin).addScaledVector(ray.direction, distance);
    if (ray.intersectPlane(this.floor, hit) && ray.origin.distanceTo(hit) < distance) {
      distance = ray.origin.distanceTo(hit); this.point.copy(hit);
    }
    for (const box of world.arena.cameraBlockers || world.arena.obstacles || []) {
      if (ray.intersectBox(box, hit) && ray.origin.distanceTo(hit) < distance) {
        distance = ray.origin.distanceTo(hit); this.point.copy(hit).addScaledVector(ray.direction, -0.08);
      }
    }
    for (const c of world.combatants) {
      if (c === owner || c.team === owner.team || !c.alive) continue;
      const box = new THREE.Box3(c.position.clone().add(new THREE.Vector3(-c.radius, 0, -c.radius)),
        c.position.clone().add(new THREE.Vector3(c.radius, c.height, c.radius)));
      if (ray.intersectBox(box, hit) && ray.origin.distanceTo(hit) < distance) {
        distance = ray.origin.distanceTo(hit); this.point.copy(hit); this.target = c;
      }
    }
    return this;
  }
  heading(owner) { return Math.atan2(this.point.x - owner.position.x, this.point.z - owner.position.z); }
}
