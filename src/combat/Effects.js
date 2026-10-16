import * as THREE from 'three';
import { QuarksEffects } from './QuarksEffects.js';

// Fixed particle pool rendered in one draw call, with no per-impact meshes.
export class Effects {
  constructor(scene, capacity = 192) {
    this.capacity = capacity;
    this.budget = 96;
    this.free = Array.from({ length: capacity }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3(),
      rotation: new THREE.Quaternion(), color: new THREE.Color(), life: 0, max: 1, length: 1, trail: false }));
    this.items = [];
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false }), capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this._dummy = new THREE.Object3D();
    this._dir = new THREE.Vector3();
    this.quarks = new QuarksEffects(scene);
    this.rings = []; this.ringFree = Array.from({ length: 16 }, () => ({ position: new THREE.Vector3(), color: new THREE.Color() }));
    this.ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.88, 1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 16);
    this.ringMesh.count = 0; this.ringMesh.frustumCulled = false; scene.add(this.ringMesh);
  }

  setBudget(count) { this.budget = Math.min(this.capacity, count); this.quarks.setBudget(this.budget); }
  clear() { this.free.push(...this.items); this.items.length = 0; this.mesh.count = 0; this.quarks.clear();
    this.ringFree.push(...this.rings); this.rings.length = 0; this.ringMesh.count = 0; }

  cast(pos, color) { this.quarks.burst(pos, color, 'cast'); }
  impact(pos, color, heavy = false) { this.quarks.burst(pos, color, heavy ? 'heavy' : 'impact'); }
  projectileTrail(pos, color, style) { this.quarks.burst(pos, color, style === 'arrow' ? 'wind' : 'arcane'); }

  shockwave(pos, color, radius) {
    if (!this.ringFree.length || this.rings.length >= Math.max(2, this.budget / 12)) return;
    const ring = this.ringFree.pop(); ring.position.copy(pos); ring.position.y += 0.04;
    ring.color.set(color); ring.radius = radius; ring.remaining = ring.life = 0.4; this.rings.push(ring);
  }

  spawn(pos, color, life, trail = false) {
    if (!this.free.length || this.items.length >= this.budget) return null;
    const it = this.free.pop();
    it.position.copy(pos); it.color.set(color); it.life = it.max = life;
    it.trail = trail; it.length = 1; it.rotation.identity(); it.velocity.set(0, 0, 0);
    this.items.push(it);
    return it;
  }

  spark(pos, color = 0xffe08a, count = 8, speed = 4) {
    for (let i = 0; i < count; i++) {
      const it = this.spawn(pos, color, 0.25 + Math.random() * 0.2);
      if (!it) break;
      it.velocity.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5)
        .normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
    }
  }

  trail(from, to, color = 0xffcb61) {
    this._dir.subVectors(to, from);
    if (this._dir.lengthSq() < 0.0004) return;
    const it = this.spawn(from, color, 0.12, true);
    if (!it) return;
    it.position.lerp(to, 0.5); it.length = this._dir.length() / 0.1;
    it.rotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this._dir.normalize());
  }

  slam(pos) {
    const count = this.budget < 64 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const it = this.spawn(pos, 0xff924d, 0.3);
      if (!it) break;
      it.position.y = 0.06;
      it.velocity.set(Math.cos(angle) * 4, 0.7, Math.sin(angle) * 4);
    }
  }

  pulse(pos, color, radius) {
    this.shockwave(pos, color, radius);
    this.quarks.burst(pos.clone().add(new THREE.Vector3(0, 0.15, 0)), color, 'pulse', Math.min(1.5, radius));
    const count = this.budget < 64 ? 12 : 28;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, it = this.spawn(pos, color, 0.4);
      if (!it) break;
      it.position.y += 0.12;
      it.velocity.set(Math.cos(a) * radius * 3, 1.4, Math.sin(a) * radius * 3);
    }
    this.spark(pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0xffffff, 6, 2);
  }

  update(dt) {
    this.quarks.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]; ring.remaining -= dt;
      if (ring.remaining <= 0 || i >= Math.max(2, this.budget / 12)) { this.ringFree.push(ring); this.rings.splice(i, 1); }
    }
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i], t = 1 - ring.remaining / ring.life;
      this._dummy.position.copy(ring.position); this._dummy.quaternion.identity();
      this._dummy.scale.setScalar(ring.radius * (0.2 + 0.8 * t)); this._dummy.updateMatrix();
      this.ringMesh.setMatrixAt(i, this._dummy.matrix); this.ringMesh.setColorAt(i, ring.color.clone().multiplyScalar(1 - t));
    }
    this.ringMesh.count = this.rings.length; this.ringMesh.instanceMatrix.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0 || i >= this.budget) {
        this.free.push(it); this.items[i] = this.items[this.items.length - 1]; this.items.pop(); continue;
      }
      if (!it.trail) { it.velocity.y -= 9 * dt; it.position.addScaledVector(it.velocity, dt); }
    }
    const dummy = this._dummy;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i], fade = Math.max(0, it.life / it.max);
      dummy.position.copy(it.position); dummy.quaternion.copy(it.rotation);
      if (it.trail) dummy.scale.set(0.5 * fade, it.length, 0.5 * fade);
      else dummy.scale.setScalar(0.4 + fade);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix); this.mesh.setColorAt(i, it.color);
    }
    this.mesh.count = this.items.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
