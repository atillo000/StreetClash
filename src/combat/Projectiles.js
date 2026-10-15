import * as THREE from 'three';
import { sweepHurtCapsule } from '../physics/collision.js';

export class Projectiles {
  constructor(scene, world, effects, capacity = 48) {
    Object.assign(this, { world, effects, capacity });
    this.free = Array.from({ length: capacity }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0 }));
    this.items = [];
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 1), new THREE.MeshBasicMaterial(), capacity);
    this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh);
    this.dummy = new THREE.Object3D();
    this.point = new THREE.Vector3();
  }

  clear() { this.free.push(...this.items); this.items.length = 0; this.mesh.count = 0; }

  emit(owner, move) {
    const it = this.free.pop(); if (!it) return;
    it.owner = owner; it.move = move;
    const source = owner.equipment?.muzzle || owner.character.bone('mixamorigRightHand');
    source.getWorldPosition(it.position);
    const target = owner.target?.alive ? owner.target : owner._nearestEnemy()?.c;
    const heading = new THREE.Vector3(Math.sin(owner.mover.facing), 0, Math.cos(owner.mover.facing));
    if (owner.castTarget) heading.copy(owner.castTarget).sub(it.position).normalize();
    else if (target && target.position.distanceTo(owner.position) <= move.range && !owner.move) {
      const direction = target.position.clone().sub(owner.position).normalize();
      if (direction.dot(heading) > 0.5) heading.copy(target.position).add(new THREE.Vector3(0, 1, 0)).sub(it.position).normalize();
    }
    it.velocity.copy(heading).multiplyScalar(move.projectileSpeed);
    it.position.addScaledVector(heading, 0.08);
    it.life = move.range / move.projectileSpeed;
    this.items.push(it);
    this.effects.spark(it.position, move.color, owner.profile?.id === 'soldier' ? 3 : 5, 1.4);
  }

  area(owner, move) {
    this.effects.pulse(owner.position, move.color, move.range);
    for (const target of this.world.combatants) {
      if (target === owner || target.team === owner.team || !target.alive) continue;
      if (target.position.distanceTo(owner.position) > move.range + target.radius || Math.abs(target.position.y - owner.position.y) > 1) continue;
      if (!this.world.arena.hasLineOfSight(owner.position, target.position)) continue;
      const dir = target.position.clone().sub(owner.position).setY(0).normalize();
      const point = target.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      const result = target.takeHit({ damage: move.damage, knock: move.knock, power: move.power, dir, attacker: owner, point });
      if (result !== 'miss') this.world.onHit(owner, target, result, move, point);
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i], from = it.position.clone();
      it.position.addScaledVector(it.velocity, dt); it.life -= dt;
      const direction = it.position.clone().sub(from), distance = direction.length();
      const ray = new THREE.Ray(from, direction.normalize());
      let wallDistance = Infinity;
      for (const box of this.world.arena.cameraBlockers || this.world.arena.obstacles) {
        if (box.containsPoint(from)) { wallDistance = 0; break; }
        const hit = ray.intersectBox(box, this.point);
        if (hit) wallDistance = Math.min(wallDistance, from.distanceTo(hit));
      }
      let spent = wallDistance <= distance;
      for (const target of this.world.combatants) {
        if (target === it.owner || target.team === it.owner.team || !target.alive) continue;
        if (!sweepHurtCapsule(from, it.position, target, it.move.projectileRadius, this.point)) continue;
        if (from.distanceTo(this.point) > wallDistance) continue;
        const dir = it.velocity.clone().setY(0).normalize();
        const result = target.takeHit({ damage: it.move.damage, knock: it.move.knock, power: it.move.power, dir, attacker: it.owner, point: this.point });
        if (result === 'miss') continue;
        this.world.onHit(it.owner, target, result, it.move, this.point.clone()); spent = true; break;
      }
      if (spent || it.life <= 0) { this.free.push(it); this.items[i] = this.items[this.items.length - 1]; this.items.pop(); }
    }
    this.sync();
  }

  sync() {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i], bullet = it.owner.profile?.id === 'soldier';
      this.dummy.position.copy(it.position);
      this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), it.velocity.clone().normalize());
      if (bullet) this.dummy.scale.set(0.5, 0.5, 3);
      else this.dummy.scale.setScalar(it.move.projectileRadius / 0.07);
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix); this.mesh.setColorAt(i, new THREE.Color(it.move.color));
    }
    this.mesh.count = this.items.length; this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
