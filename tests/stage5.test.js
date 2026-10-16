import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Match } from '../src/game/Match.js';
import { Navigator } from '../src/physics/Navigator.js';
import { ArenaCollision } from '../src/physics/collision.js';
import { SparringAI } from '../src/combat/SparringAI.js';
import { Mover } from '../src/characters/Mover.js';

const v = (x, z) => new THREE.Vector3(x, 0, z);
function fixture(options = {}) {
  const player = { hp: 100, maxHp: 100 }, opponent = { hp: 100, maxHp: 100 };
  let finishes = 0, resets = 0;
  const match = new Match({ player, opponent, onReset() { resets++; player.hp = opponent.hp = 100; }, onFinish() { finishes++; }, ...options });
  return { player, opponent, match, get finishes() { return finishes; }, get resets() { return resets; } };
}

test('lobby and countdown gate combat, then a match starts with the full timer', () => {
  const { match } = fixture();
  assert.equal(match.canFight, false); match.start();
  for (let i = 0; i < 179; i++) match.update(1 / 60);
  assert.equal(match.state, 'countdown'); assert.equal(match.canFight, false);
  match.update(1 / 60);
  assert.equal(match.state, 'active'); assert.equal(match.remaining, 120);
  match.update(1 / 60); assert.ok(match.remaining < 120);
});

test('a KO ends once, records stats, then shows results without resetting fighters', () => {
  const f = fixture(); f.match.start(); f.match.update(3);
  f.match.recordHit(f.player, f.opponent, 'hit', 12);
  f.opponent.hp = 0; f.match.resolveOutcome();
  assert.equal(f.match.result.outcome, 'victory'); assert.equal(f.match.result.damageDealt, 12); assert.equal(f.match.result.hits, 1);
  assert.equal(f.match.canFight, false); f.match.resolveOutcome();
  f.match.update(2); assert.equal(f.match.state, 'results');
  assert.equal(f.finishes, 1); assert.equal(f.resets, 1); assert.equal(f.opponent.hp, 0);
  f.match.recordHit(f.player, f.opponent, 'hit', 99); assert.equal(f.match.result.damageDealt, 12);
});

test('player KO and simultaneous KO produce defeat and draw', () => {
  for (const both of [false, true]) {
    const f = fixture(); f.match.start(); f.match.update(3); f.player.hp = 0;
    if (both) f.opponent.hp = 0;
    f.match.resolveOutcome(); assert.equal(f.match.result.outcome, both ? 'draw' : 'defeat');
  }
});

test('timeouts compare health fractions and tied health is a draw', () => {
  for (const [p, e, result] of [[80, 30, 'victory'], [20, 60, 'defeat'], [40, 40, 'draw']]) {
    const f = fixture({ duration: 1 }); f.match.start(); f.match.update(3);
    f.player.hp = p; f.opponent.hp = e; f.match.update(2);
    assert.equal(f.match.result.outcome, result); assert.equal(f.match.result.elapsed, 1); assert.equal(f.match.remaining, 0);
  }
});

test('rematch clears damage, timers and outcome; practice and return-to-menu remain separate', () => {
  const f = fixture(); f.match.start(); f.match.update(3); f.player.hp = 0; f.match.resolveOutcome();
  f.match.start(); assert.equal(f.player.hp, 100); assert.equal(f.match.state, 'countdown'); assert.equal(f.match.result, null); assert.equal(f.match.elapsed, 0);
  f.match.practice(); f.match.recordHit(f.player, f.opponent, 'hit', 20); f.match.update(1000);
  assert.equal(f.match.state, 'practice'); assert.equal(f.match.stats.damageDealt, 0);
  f.match.toLobby(); assert.equal(f.match.state, 'lobby'); assert.equal(f.match.canPause, false);
});

test('navigation routes around cover with capsule clearance and projects wall-adjacent endpoints', () => {
  const arena = new ArenaCollision({ obstacles: [new THREE.Box3(v(-1, -1), new THREE.Vector3(1, 2, 1))] });
  const nav = new Navigator(arena), start = v(0, -4), goal = v(0, 4);
  const path = nav.findPath(start, goal);
  assert.ok(path.length >= 3); assert.ok(path.some(p => Math.abs(p.x) > 1.4));
  let previous = start;
  for (const point of path) { assert.equal(nav.clear(previous, point), true); previous = point; }
  const nearBox = v(-1.39, 0), projected = nav.project(nearBox);
  assert.equal(nav.walkable(projected), true);
  assert.equal(nav.walkable(nav.project(v(12, 0))), true);
});

test('navigation returns no route for disconnected lanes instead of steering through walls', () => {
  const arena = new ArenaCollision({ halfSize: 5, obstacles: [new THREE.Box3(new THREE.Vector3(-5, 0, -0.5), new THREE.Vector3(5, 2, 0.5))] });
  const nav = new Navigator(arena);
  assert.deepEqual(nav.findPath(v(0, -3), v(0, 3)), []);
});

test('AI follows a route around a blocker and reaches fighting distance', () => {
  const arena = new ArenaCollision({ obstacles: [new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1))] });
  const root = new THREE.Group(); root.position.copy(v(0, -4));
  const character = { root, locomote() {} };
  const mover = new Mover(character, { facing: 0 });
  const target = { position: v(0, 4), alive: true, state: 'free' };
  const c = { position: root.position, previousPosition: root.position.clone(), alive: true, state: 'free', radius: 0.38, mover, world: { arena },
    _nearestEnemy() { return { c: target, dist: this.position.distanceTo(target.position), angle: Math.atan2(target.position.x - this.position.x, target.position.z - this.position.z) }; },
    tryAttack() { this.attacked = true; return true; } };
  const ai = new SparringAI(c, { random: () => 0.5 }); ai.enabled = true;
  let routed = false;
  for (let i = 0; i < 600; i++) {
    c.previousPosition.copy(c.position); ai.update(1 / 60); mover.update(1 / 60); arena.resolve([c]);
    routed ||= Math.abs(c.position.x) > 1.4;
  }
  assert.ok(routed); assert.ok(c.position.distanceTo(target.position) < 1.05); assert.ok(c.attacked);
});
