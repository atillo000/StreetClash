import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Mover } from '../src/characters/Mover.js';
import { Character } from '../src/characters/Character.js';
import { fitClips } from '../src/animation/AnimBank.js';

function character() {
  const scene = new THREE.Group();
  const tracks = [new THREE.NumberKeyframeTrack('.position[y]', [0, 1], [0, 0])];
  return new Character({ scene, animations: ['Idle', 'Walk', 'Run'].map(name => new THREE.AnimationClip(name, name === 'Run' ? 0.7 : 1, tracks)) }, { modelYaw: 0 });
}

test('a reversal travels along input while the visible fighter turns', () => {
  const ch = character();
  const mover = new Mover(ch, { facing: Math.PI });
  mover.steer(new THREE.Vector3(0, 0, -1), 1);
  for (let i = 0; i < 60; i++) mover.update(1 / 60);
  const before = ch.root.position.clone();
  mover.steer(new THREE.Vector3(0, 0, 1), 1);
  mover.update(1 / 60);
  assert.ok(ch.root.position.z > before.z);
  assert.ok(Math.abs(ch.root.position.x - before.x) < 1e-6);
  assert.ok(mover.facing > 1, 'facing still turns smoothly');
});

test('stopping keeps animation speed equal to travel speed', () => {
  const ch = character();
  const mover = new Mover(ch);
  mover.steer(new THREE.Vector3(1, 0, 0), 1);
  for (let i = 0; i < 60; i++) mover.update(1 / 60);
  mover.steer(new THREE.Vector3(), 0);
  for (let i = 0; i < 30; i++) {
    mover.update(1 / 60);
    assert.ok(Math.abs(mover.velocity.length() - mover.speed) < 1e-6);
  }
  assert.equal(mover.speed, 0);
});

test('walk and run retain a continuous shared phase across transitions', () => {
  const ch = character();
  ch.startLocomotion();
  for (let i = 0; i < 300; i++) {
    ch.locomote(i < 150 ? 4.8 : 1.7, 1 / 60);
    ch.update(1 / 60);
    const a = ch.loco.a;
    const walkPhase = a.walk.time / a.walk.getClip().duration;
    const runPhase = a.run.time / a.run.getClip().duration;
    assert.ok(Math.abs(walkPhase - runPhase) < 1e-5, 'gaits stay synchronized without time resets');
  }
});

function rig(rotated = false, flippedLeg = false) {
  const model = new THREE.Group(), armature = new THREE.Group();
  if (rotated) armature.rotation.x = -Math.PI / 2;
  model.add(armature);
  const hips = new THREE.Bone(); hips.name = 'mixamorigHips';
  hips.position.set(0, rotated ? 0 : 100, rotated ? 100 : 0);
  if (rotated) hips.rotation.x = Math.PI / 2;
  armature.add(hips);
  const leg = new THREE.Bone(); leg.name = 'mixamorigLeftUpLeg';
  if (flippedLeg) leg.rotation.z = Math.PI;
  hips.add(leg);
  return { model, hips, leg, armature };
}

test('root travel is removed in upright space on a rotated hips parent', () => {
  const source = rig(), target = rig(true);
  const clip = new THREE.AnimationClip('Run', 1, [
    new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 0.5, 1], [0, 100, 0, 5, 105, 150, 0, 100, 300]),
  ]);
  const bank = new Map([['Run', clip]]); bank.roots = new Map([['Run', source.model]]);
  const [fitted] = fitClips(bank, { animations: [] }, target.model);
  const values = fitted.tracks[0].values;
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Vector3().fromArray(values, i * 3).applyQuaternion(target.armature.quaternion);
    assert.ok(Math.hypot(p.x, p.z) < 1e-5, 'no ground travel remains');
    assert.ok(Math.abs(p.y - [100, 105, 100][i]) < 1e-5, 'vertical bounce survives');
  }
  assert.equal(clip.tracks[0].values[8], 300, 'raw clips remain reusable');
});

test('retargeting converts different bone bind axes instead of flipping legs upward', () => {
  const source = rig(false, true), target = rig();
  const clip = new THREE.AnimationClip('Walk', 1, [
    new THREE.QuaternionKeyframeTrack('mixamorigLeftUpLeg.quaternion', [0, 1], [...source.leg.quaternion.toArray(), ...source.leg.quaternion.toArray()]),
  ]);
  const bank = new Map([['Walk', clip]]); bank.roots = new Map([['Walk', source.model]]);
  const [fitted] = fitClips(bank, { animations: [] }, target.model);
  const q = new THREE.Quaternion().fromArray(fitted.tracks[0].values);
  assert.ok(q.angleTo(target.leg.quaternion) < 1e-5);
});

test('an unreadable idle uses the model native idle without mutating it', () => {
  const source = rig(), target = rig(true);
  const native = new THREE.AnimationClip('idle', 2, [
    new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 2], [10, 20, 100, 12, 25, 102]),
  ]);
  const bank = new Map([['Idle', native]]);
  bank.roots = new Map([['Idle', source.model]]); bank.useNativeIdle = true;
  const [clip] = fitClips(bank, { animations: [native] }, target.model);
  assert.equal(clip.name, 'Idle');
  assert.equal(clip.duration, 2);
  assert.equal(native.tracks[0].values[0], 10);
  const p = new THREE.Vector3().fromArray(clip.tracks[0].values).applyQuaternion(target.armature.quaternion);
  assert.ok(Math.hypot(p.x, p.z) < 1e-5);
  assert.ok(Math.abs(p.y - 100) < 1e-5);
});
