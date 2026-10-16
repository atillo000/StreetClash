import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FixedStep } from '../src/core/FixedStep.js';
import { ArenaCollision, segmentDistanceSq, sweepHurtCapsule } from '../src/physics/collision.js';
import { Character } from '../src/characters/Character.js';
import { Mover } from '../src/characters/Mover.js';
import { Combatant } from '../src/combat/Combatant.js';
import { TargetLock } from '../src/combat/TargetLock.js';
import { MOVES, attackPhase } from '../src/combat/moves.js';
import { Effects } from '../src/combat/Effects.js';

const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function body(from, to = from) { return { previousPosition: from.clone(), position: to.clone(), radius: 0.38, height: 1.7 }; }
const box = new THREE.Box3(v(-1, 0, -1), v(1, 2, 1));

test('fixed simulation agrees at 30, 60, 144 FPS and bounds a long stall', () => {
  const totals = [30, 60, 144].map(fps => {
    const loop = new FixedStep(); let position = 0;
    for (let i = 0; i < fps * 5; i++) loop.advance(1 / fps, dt => { position += 4.8 * dt; });
    assert.equal(loop.ticks, 300);
    return position;
  });
  assert.ok(totals.every(x => Math.abs(x - 24) < 1e-8));
  const loop = new FixedStep(); let steps = 0;
  const alpha = loop.advance(10, () => steps++);
  assert.equal(steps, 6); assert.ok(alpha >= 0 && alpha < 1);
});

test('a fast capsule cannot tunnel through a crate and can slide along it', () => {
  const arena = new ArenaCollision({ obstacles: [box] });
  const position = v(5, 0, 0.8);
  arena.constrain(v(-5, 0, -0.8), position, 0.38);
  assert.ok(position.x <= -1.38);
  assert.ok(position.z > 0.7, 'tangent motion survives');
  arena.constrain(position.clone(), position.set(-100, 0, 100), 0.38);
  assert.ok(Math.abs(position.x) <= 11.62 && Math.abs(position.z) <= 11.62);
});

test('opposing fast fighters and touching fighters cannot cross through one another', () => {
  const arena = new ArenaCollision();
  for (const gap of [4, 0.76]) {
    const a = body(v(-gap / 2), v(3)), b = body(v(gap / 2), v(-3));
    arena.resolve([a, b]);
    assert.ok(a.position.x < b.position.x);
    assert.ok(b.position.distanceTo(a.position) >= 0.76 - 1e-5);
  }
});

test('coincident fighters separate and a wall does not trap their overlap', () => {
  const arena = new ArenaCollision();
  const a = body(v(11.5)), b = body(v(11.5));
  arena.resolve([a, b]);
  assert.ok(a.position.distanceTo(b.position) > 0.75);
  assert.ok(b.position.x <= 11.62);
});

test('swept hits catch between-frame crossings, account for height and target movement', () => {
  const target = body(v());
  assert.equal(sweepHurtCapsule(v(-2, 1), v(2, 1), target, 0.14), true);
  assert.equal(sweepHurtCapsule(v(-2, 3), v(2, 3), target, 0.14), false);
  const moving = body(v(-2), v(2));
  assert.equal(sweepHurtCapsule(v(0, 1), v(0, 1), moving, 0.14), true);
  assert.equal(sweepHurtCapsule(v(0, 1), v(0, 1), moving, 0.14, v(), 0.8, 1), false, 'a crossing before the active window cannot hit');
  assert.equal(segmentDistanceSq(v(), v(), v(0, 1), v(0, 2)), 1);
});

test('solid obstacles block targeting and melee line of sight', () => {
  const arena = new ArenaCollision({ obstacles: [box] });
  assert.equal(arena.hasLineOfSight(v(-2), v(2)), false);
  assert.equal(arena.hasLineOfSight(v(-2, 0, 2), v(2, 0, 2)), true);
});

function fighter(world, team, x = 0) {
  const model = new THREE.Group();
  const hand = new THREE.Bone(); hand.name = 'mixamorigRightHand'; model.add(hand);
  const left = new THREE.Bone(); left.name = 'mixamorigLeftHand'; model.add(left);
  const clips = ['Idle','Walk','Run','Punch','Kick','Heavy','Roll','Block','Hit','Down','GetUp','Defeat'].map(name => new THREE.AnimationClip(name, 1,
    [new THREE.NumberKeyframeTrack('mixamorigRightHand.position[y]', [0, 1], [1, 1])]));
  const ch = new Character({ scene: model, animations: clips }, { modelYaw: 0 });
  ch.startLocomotion();
  const mover = new Mover(ch, { facing: 0 });
  const c = new Combatant({ name: team, team, character: ch, mover, world, spawn: v(x), spawnFacing: 0 });
  world.combatants.push(c); c.iframes = 0;
  return c;
}

test('lock selects a living enemy, preserves facing during strafe, and releases out of range', () => {
  const world = { combatants: [] }, player = fighter(world, 'p'), enemy = fighter(world, 'e', 3);
  const lock = new TargetLock(player, world);
  lock.toggle(); lock.update();
  assert.equal(lock.target, enemy);
  for (let i = 0; i < 60; i++) { player.mover.steer(v(0, 0, -1), 1); player.mover.update(1 / 60); }
  assert.ok(Math.abs(player.mover.facing - Math.PI / 2) < 1e-5);
  assert.ok(player.position.z < -1);
  enemy.position.x = 20; lock.update();
  assert.equal(lock.target, null); assert.equal(player.mover.lockFacing, null);
});

test('startup and recovery cannot damage; shared markers hit a victim once per strike window', () => {
  const hits = [], world = { combatants: [], onHit: (...args) => hits.push(args) };
  const a = fighter(world, 'p'), b = fighter(world, 'e'); b.position.z = 0.8; b.previousPosition.copy(b.position);
  a.tryAttack('punch'); a.mover.impulse.set(0, 0, 0);
  function sweep(previous, progress) {
    a.strikeProgress = previous;
    a.character.action.time = progress;
    for (const s of a.strikers) { s.prev.set(-1, 1, 0.8); s.obj.position.set(1, 1, 0.8); }
    a.postAnimation(1 / 60);
  }
  sweep(0.01, 0.05); assert.equal(hits.length, 0);
  sweep(0.13, 0.15); assert.equal(hits.length, 1);
  sweep(0.15, 0.18); assert.equal(hits.length, 1);
  sweep(0.8, 0.85); assert.equal(hits.length, 1);
  sweep(0.3, 0.33); assert.equal(hits.length, 2, 'next strike window can hit again');
  assert.equal(attackPhase(MOVES.punch, 0.01), 'startup');
  assert.equal(attackPhase(MOVES.punch, 0.15), 'active');
  assert.equal(attackPhase(MOVES.punch, 0.85), 'recovery');
});

test('guard reduces a frontal light hit, heavy breaks it, dodge has early invulnerability', () => {
  const world = { combatants: [] }, a = fighter(world, 'p'), b = fighter(world, 'e');
  const hit = { damage: 20, knock: 1, power: 'light', dir: v(0, 0, -1), attacker: a };
  b.wantBlock = true; b.update(1 / 60);
  assert.equal(b.takeHit(hit), 'blocked'); assert.equal(b.hp, 97);
  assert.equal(b.takeHit({ ...hit, power: 'heavy' }), 'down'); assert.equal(b.hp, 85);
  b.reset(); b.iframes = 0; b.wantBlock = true; b.update(1 / 60); b.hp = 0.5;
  assert.equal(b.takeHit(hit), 'blocked'); assert.equal(b.hp, 0.5); assert.equal(b.lastDamage, 0, 'chip damage cannot heal fractional health or make match stats negative');
  b.reset(); b.iframes = 0; b.tryDodge();
  assert.equal(b.takeHit(hit), 'miss');
  b.character.action.time = 0.7;
  assert.equal(b.takeHit(hit), 'hit');
});

test('recovery accepts a buffered follow-up and reset clears guard, cooldown and knockback', () => {
  const world = { combatants: [] }, a = fighter(world, 'p');
  a.tryAttack('punch'); a.character.action.time = 0.81; a.tryAttack('kick'); a.update(1 / 60);
  assert.equal(a.moveId, 'kick'); assert.equal(a.phase, 'startup');
  a.wantBlock = true; a.dodgeCd = 10; a.mover.impulse.set(10, 0, 0); a.reset();
  assert.equal(a.state, 'free'); assert.equal(a.wantBlock, false); assert.equal(a.dodgeCd, 0);
  assert.equal(a.mover.impulse.length(), 0); assert.equal(a.buffer, null);
});

test('particle bursts recycle a bounded pool and respect quality budgets', () => {
  const scene = new THREE.Scene(), effects = new Effects(scene, 64);
  effects.setBudget(16); effects.spark(v(), 0xffffff, 100); effects.update(0.01);
  assert.equal(effects.items.length, 16);
  assert.equal(effects.mesh.parent, scene); assert.equal(effects.quarks.batch.parent, scene);
  effects.update(1); assert.equal(effects.items.length, 0); assert.equal(effects.free.length, 64);
  effects.setBudget(8); effects.trail(v(), v(1)); effects.slam(v()); effects.update(0.01);
  assert.equal(effects.mesh.count, 8);
});
