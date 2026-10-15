import * as THREE from 'three';
import { shortestAngle } from '../characters/Mover.js';

// Orbit-style follow camera: mouse (pointer lock) rotates, wheel zooms,
// camera trails a smoothed focus point above the player's head.
export class ThirdPersonCamera {
  constructor(camera, { distance = 5.5, pitch = 0.35, height = 1.5 } = {}) {
    this.camera = camera;
    this.yaw = 0;           // 0 = camera sits behind the player on +Z looking toward -Z
    this.pitch = pitch;
    this.distance = distance;
    this.height = height;
    this.minDistance = 2.5;
    this.maxDistance = 10;
    this.sensitivity = 0.0022;
    this.focus = new THREE.Vector3();
    this._first = true;
    this.shakeAmt = 0;
  }

  shake(amount) { this.shakeAmt = Math.max(this.shakeAmt, amount); }

  // World-space horizontal forward direction as seen by the camera.
  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
  right(out = new THREE.Vector3()) {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  applyLook(look) {
    this.yaw -= look.dx * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.dy * this.sensitivity, -0.05, 1.25);
    this.distance = THREE.MathUtils.clamp(this.distance + look.wheel * 0.6, this.minDistance, this.maxDistance);
  }

  trackTarget(dt, playerPos, enemyPos) {
    const heading = Math.atan2(enemyPos.x - playerPos.x, enemyPos.z - playerPos.z) + Math.PI;
    this.yaw += shortestAngle(this.yaw, heading) * (1 - Math.exp(-5 * dt));
  }

  update(dt, targetPos, look = { dx: 0, dy: 0, wheel: 0 }, lockPos = null, blockers = []) {
    this.applyLook(look);

    const want = new THREE.Vector3(targetPos.x, targetPos.y + this.height, targetPos.z);
    if (lockPos) { want.x += (lockPos.x - targetPos.x) * 0.25; want.z += (lockPos.z - targetPos.z) * 0.25; }
    if (this._first) { this.focus.copy(want); this._first = false; }
    else this.focus.lerp(want, 1 - Math.exp(-14 * dt));

    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.focus.x + Math.sin(this.yaw) * cp * this.distance,
      this.focus.y + Math.sin(this.pitch) * this.distance,
      this.focus.z + Math.cos(this.yaw) * cp * this.distance
    );
    if (this.shakeAmt > 0.001) {
      const a = this.shakeAmt;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      this.camera.position.z += (Math.random() - 0.5) * a;
      this.shakeAmt *= Math.exp(-14 * dt);
    }
    // Never dip below the floor.
    if (this.camera.position.y < 0.3) this.camera.position.y = 0.3;
    const offset = this.camera.position.clone().sub(this.focus), length = offset.length();
    const ray = new THREE.Ray(this.focus, offset.normalize()), point = new THREE.Vector3();
    let clear = length;
    for (const box of blockers) {
      const hit = ray.intersectBox(box, point);
      if (hit) clear = Math.min(clear, Math.max(0.4, point.distanceTo(this.focus) - 0.2));
    }
    if (clear < length) this.camera.position.copy(this.focus).addScaledVector(ray.direction, clear);
    this.camera.lookAt(this.focus);
  }
}
