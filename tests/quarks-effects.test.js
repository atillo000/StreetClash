import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { QuarksEffects } from '../src/combat/QuarksEffects.js';

test('Quarks bursts respect a shared budget before and after their first frame', () => {
  const fx = new QuarksEffects(new THREE.Scene()); fx.setBudget(32);
  for (let i = 0; i < 100; i++) fx.burst(new THREE.Vector3(), 0xb494ff);
  assert.equal(fx.reserved, 32);
  fx.update(1 / 60);
  assert.equal(fx.particleCount, 32);
  fx.setBudget(8);
  assert.ok(fx.reserved <= 8); assert.ok(fx.particleCount <= 8);
  fx.setBudget(0); assert.equal(fx.burst(new THREE.Vector3(), 0xffffff), false);
});

test('Quarks effects fade, recycle emitters and clear on a match reset', () => {
  const scene = new THREE.Scene(), fx = new QuarksEffects(scene, 3);
  const children = scene.children.length;
  for (let cycle = 0; cycle < 40; cycle++) {
    fx.burst(new THREE.Vector3(cycle, 1, 0), 0xffbb66, 'heavy');
    fx.update(1 / 60);
    assert.ok(fx.particleCount > 0);
    assert.ok(fx.slots.some(slot => slot.system.particles.slice(0, slot.system.particleNum).every(p => p.color.w > 0 && Number.isFinite(p.position.x))));
    for (let i = 0; i < 35; i++) fx.update(1 / 60);
    assert.equal(fx.reserved, 0); assert.equal(fx.particleCount, 0);
    assert.equal(scene.children.length, children);
  }
  fx.burst(new THREE.Vector3(), 0xb494ff, 'pulse'); fx.update(0.016); fx.clear();
  assert.equal(fx.particleCount, 0); assert.equal(fx.reserved, 0);
  assert.ok(fx.slots.every(slot => slot.system.paused));
});
