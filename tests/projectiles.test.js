import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Projectiles } from '../src/combat/Projectiles.js';

function setup(boxes = [], visible = true) {
  const hand = new T.Object3D(); hand.position.y = 1;
  let hits = 0;
  const target = { position: new T.Vector3(0,0,3), previousPosition: new T.Vector3(0,0,3), radius: .38, height: 1.8, alive: true, team: 1,
    takeHit() { hits++; return 'hit'; } };
  const owner = { position: new T.Vector3(), team: 0, mover: { facing: 0 }, character: { bone: () => hand }, _nearestEnemy: () => ({ c: target }) };
  const world = { combatants: [owner, target], arena: { cameraBlockers: boxes, hasLineOfSight: () => visible }, onHit() {} };
  const pool = new Projectiles(new T.Scene(), world, { spark() {}, pulse() {} }, 2);
  const move = { range: 10, projectileSpeed: 60, projectileRadius: .1, color: '#ff6600', damage: 10 };
  return { pool, owner, target, move, hits: () => hits };
}

test('fast ranged shots sweep targets, stop at walls, and recycle their pool', () => {
  const a = setup();
  a.pool.emit(a.owner, a.move); a.pool.update(.1);
  assert.equal(a.hits(), 1); assert.equal(a.pool.items.length, 0); assert.equal(a.pool.free.length, 2);
  const b = setup([new T.Box3(new T.Vector3(-1,0,1), new T.Vector3(1,2,1.5))]);
  b.pool.emit(b.owner, b.move); b.pool.update(.1);
  assert.equal(b.hits(), 0); assert.equal(b.pool.items.length, 0); assert.equal(b.pool.free.length, 2);
  a.pool.emit(a.owner, a.move); a.pool.emit(a.owner, a.move); a.pool.emit(a.owner, a.move);
  assert.equal(a.pool.items.length, 2);
  a.pool.clear(); a.pool.clear(); assert.equal(a.pool.free.length, 2);
});

test('area casts respect range, elevation, teams and cover', () => {
  const a = setup(); a.pool.area(a.owner, { ...a.move, range: 3 }); assert.equal(a.hits(), 1);
  a.target.team = 0; a.pool.area(a.owner, a.move); assert.equal(a.hits(), 1);
  a.target.team = 1; a.target.position.y = 2; a.pool.area(a.owner, a.move); assert.equal(a.hits(), 1);
  const b = setup([], false); b.pool.area(b.owner, b.move); assert.equal(b.hits(), 0);
  const c = setup(); c.pool.area(c.owner, { ...c.move, range: 1 }); assert.equal(c.hits(), 0);
});
