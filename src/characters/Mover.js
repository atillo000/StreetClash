import * as THREE from 'three';

const ZERO = new THREE.Vector3();

export function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Grounded movement for any fighter (player or AI): acceleration, smooth turning,
// optional forced facing (auto-aim during attacks) and a decaying impulse (lunges, rolls, knockback).
// A controller calls steer() each frame; the Combatant calls update().
export class Mover {
  constructor(character, { walkSpeed = 1.7, runSpeed = 4.8, accel = 22, turnRate = 14, arenaRadius = 28, facing = Math.PI } = {}) {
    this.character = character;
    this.walkSpeed = walkSpeed;
    this.runSpeed = runSpeed;
    this.accel = accel;
    this.turnRate = turnRate;
    this.arenaRadius = arenaRadius;
    this.speed = 0;
    this.facing = facing;            // yaw the character faces
    this.facingTarget = null;        // when set, turn toward this yaw quickly (ignores steering)
    this.lockFacing = null;
    this.lockSpeed = 2.8;
    this.sprintSpeed = 6; this.crouchSpeed = 1;
    this.sprinting = false; this.crouching = false;
    this.faceRate = 24;
    this.velocity = new THREE.Vector3();
    this.impulse = new THREE.Vector3();
    this.impulseDecay = 6;
    this.enabled = true;             // false while attacking, stunned, etc.
    this._dir = new THREE.Vector3();
    this._mag = 0;
    this._walk = false;
    character.root.rotation.y = facing;
  }

  get position() { return this.character.root.position; }

  // dir: world-space direction (unit or zero), mag 0..1
  steer(dir, mag, walk = false) { this._dir.copy(dir); this._mag = mag; this._walk = walk; }

  addImpulse(vec, decay = 6) { this.impulse.copy(vec); this.impulseDecay = decay; }

  update(dt) {
    const mag = this.enabled ? this._mag : 0;
    const dir = mag > 0 ? this._dir : ZERO;

    const top = this.crouching ? this.crouchSpeed : this._walk ? this.walkSpeed : this.lockFacing !== null ? this.lockSpeed : this.sprinting ? this.sprintSpeed : this.runSpeed;
    const targetSpeed = mag > 0 ? top * Math.min(1, mag) * (this.statusSpeed ?? 1) : 0;
    const rate = (targetSpeed > this.speed ? this.accel : this.accel * 1.4) * dt;
    this.speed += THREE.MathUtils.clamp(targetSpeed - this.speed, -rate, rate);

    const previousFacing = this.facing;
    if (this.facingTarget !== null) {
      this._turnToward(this.facingTarget, this.faceRate * dt);
    } else if (this.lockFacing !== null && this.enabled) {
      this._turnToward(this.lockFacing, this.turnRate * dt);
    } else if (mag > 0) {
      this._turnToward(Math.atan2(dir.x, dir.z), this.turnRate * dt);
    }

    if (mag > 0) {
      // Steering owns travel; smooth facing only rotates the visible fighter.
      // Using the interpolated facing here made reversals arc the wrong way.
      this.velocity.copy(dir).multiplyScalar(this.speed);
    } else {
      // Decelerate travel and the locomotion blend together.
      this.velocity.setLength(this.speed);
      if (this.speed < 0.01) { this.speed = 0; this.velocity.set(0, 0, 0); }
    }

    const p = this.character.root.position;
    p.addScaledVector(this.velocity, dt);
    if (this.impulse.lengthSq() > 1e-4) {
      p.addScaledVector(this.impulse, dt);
      this.impulse.multiplyScalar(Math.exp(-this.impulseDecay * dt));
    } else this.impulse.set(0, 0, 0);

    const r = Math.hypot(p.x, p.z);
    if (r > this.arenaRadius) { p.x *= this.arenaRadius / r; p.z *= this.arenaRadius / r; }

    this.character.root.rotation.y = this.facing;
    const vx = this.speed > 0.01 ? this.velocity.x / this.speed : 0;
    const vz = this.speed > 0.01 ? this.velocity.z / this.speed : 0;
    this.character.locomote(this.speed, dt, {
      locked: this.lockFacing !== null,
      side: vx * Math.cos(this.facing) - vz * Math.sin(this.facing),
      forward: vx * Math.sin(this.facing) + vz * Math.cos(this.facing),
      turn: dt > 0 ? shortestAngle(previousFacing, this.facing) / dt : 0,
      crouching: this.crouching,
    });
  }

  _turnToward(want, step) {
    const diff = shortestAngle(this.facing, want);
    this.facing += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
  }
}
