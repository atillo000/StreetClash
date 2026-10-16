import * as THREE from 'three';
import { Navigator } from '../physics/Navigator.js';

const _dir = new THREE.Vector3();

// Very simple opponent so block / dodge / being hit can be tested.
// T toggles it on and off; off = passive training dummy.
export class SparringAI {
  constructor(combatant, { random = Math.random } = {}) {
    this.c = combatant;
    this.enabled = false;
    this.cool = 1.5;
    this.random = random;
    this.navigator = combatant.world.arena ? new Navigator(combatant.world.arena, combatant.radius) : null;
    this.reset();
  }

  reset() {
    this.cool = 0.8; this.blockT = 0; this.thinkT = 0;
    this.repathT = 0; this.path = []; this.lastGoal = new THREE.Vector3(999, 0, 999);
    this.behavior = 'idle';
  }

  update(dt) {
    const c = this.c;
    c.wantBlock = false;
    c.mover.lockFacing = null;
    if (!this.enabled || !c.alive) { c.mover.steer(_dir.set(0, 0, 0), 0); this.behavior = 'idle'; return; }
    const e = c._nearestEnemy();
    if (!e) { c.mover.steer(_dir.set(0, 0, 0), 0); return; }
    this.cool -= dt;
    this.thinkT -= dt; this.repathT -= dt;
    const visible = !c.world.arena || c.world.arena.hasLineOfSight(c.position, e.c.position);
    const ranged = c.profile?.ranged ?? ['magic', 'soldier', 'archer'].includes(c.profile?.id);
    const distance = ranged ? 7 : c.profile?.weapon ? 1.35 : 1.02;
    c.target = e.c;
    c.aimPoint = e.c.position.clone();
    if (visible && c.state === 'free' && c.moves?.skill2?.kind === 'mobility' && e.dist < 2.5 && e.c.state === 'attack' && !(c.cooldowns.skill2 > 0)) {
      c.tryAttack('skill2', e.angle + Math.PI); this.behavior = 'escape'; return;
    }
    if (visible && !ranged && c.state === 'free' && c.moves?.skill1 && e.dist > 1.8 && e.dist <= c.moves.skill1.range && !(c.cooldowns.skill1 > 0)) {
      c.tryAttack('skill1', e.angle); this.behavior = 'rush kick'; return;
    }

    if (this.thinkT <= 0) {
      this.thinkT = 0.22;
      if (visible && e.c.state === 'attack' && e.c.move?.kind === 'projectile' && e.dist < 10 && c.state === 'free' && c.dodgeCd <= 0) {
        if (this.random() < 0.4) c.tryDodge(e.angle + (this.random() < 0.5 ? -1 : 1) * 0.9);
      } else if (visible && e.c.state === 'attack' && e.dist < 1.8 && c.state === 'free') {
        const choice = this.random();
        if (choice < 0.18 && c.dodgeCd <= 0) c.tryDodge(e.angle + Math.PI + (this.random() - 0.5));
        else if (choice < 0.65) this.blockT = 0.45;
      }
    }
    if (this.blockT > 0) {
      this.blockT -= dt; c.wantBlock = true;
      c.mover.steer(_dir.set(0, 0, 0), 0); this.behavior = 'guard'; return;
    }

    if (e.dist > distance || !visible) {
      if (this.navigator) {
        if (this.repathT <= 0 || this.lastGoal.distanceToSquared(e.c.position) > 0.64) {
          this.path = this.navigator.findPath(c.position, e.c.position);
          this.lastGoal.copy(e.c.position); this.repathT = 0.45;
        }
        while (this.path.length && c.position.distanceToSquared(this.path[0]) < 0.0081) this.path.shift();
        if (!this.path.length) { c.mover.steer(_dir.set(0, 0, 0), 0); this.behavior = 'reposition'; return; }
        _dir.subVectors(this.path[0], c.position).normalize();
      } else _dir.set(Math.sin(e.angle), 0, Math.cos(e.angle));
      // Melee closes decisively instead of walking the final three metres.
      c.mover.steer(_dir, 1, false);
      this.behavior = visible ? 'approach' : 'route around cover';
    } else {
      c.mover.lockFacing = e.angle;
      if (ranged && e.dist < 2.4 && c.state === 'free') c.mover.steer(_dir.set(-Math.sin(e.angle), 0, -Math.cos(e.angle)), 1, true);
      else c.mover.steer(_dir.set(0, 0, 0), 0);
      this.behavior = 'engage';
      if (this.cool <= 0 && c.state === 'free') {
        const options = c.moves ? Object.entries(c.moves).filter(([id, move]) => move.kind !== 'mobility' && e.dist <= (move.castRange || move.range || 1.3) && !(c.cooldowns[id] > 0)).map(([id]) => id) : ['punch', 'kick'];
        if (options.length) c.tryAttack(options[Math.min(options.length - 1, Math.floor(this.random() * options.length))], e.angle);
        this.cool = 1.15 + this.random() * 0.85;
      }
    }
  }
}
