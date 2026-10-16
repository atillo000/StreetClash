import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { FootContact } from '../src/animation/FootContact.js';
import { Character } from '../src/characters/Character.js';

test('attached skin grounding stays stable after world translation and preserves airborne pose', () => {
  const root = new T.Group(), model = new T.Group(); root.add(model);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([0,0,0, .1,0,0, 0,0,.1],3));
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(12).fill(0),4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
  const mesh = new T.SkinnedMesh(geometry,new T.MeshBasicMaterial());
  const bone = new T.Bone(); bone.name='mixamorigLeftFoot'; mesh.add(bone); model.add(mesh);
  mesh.bind(new T.Skeleton([bone]));
  const feet = new FootContact(model); bone.position.y=.15;
  for(let i=0;i<120;i++) {
    root.position.set(i/10,2,-i/10); feet.update(root,1/60,true,false);
    root.updateMatrixWorld(true);
    assert.ok(Math.abs(feet.minimum()-2-.012)<1e-6);
  }
  feet.update(root,1/60,false,false);
  assert.equal(feet.offset,0);
  assert.ok(Math.abs(feet.minimum()-2-.15)<1e-6);
});

test('native anatomical left strafe is selected for positive local X travel', () => {
  const names=['Idle','Walk','Run','BackWalk','BackRun','StrafeLeftWalk','StrafeRightWalk','StrafeLeftRun','StrafeRightRun'];
  const ch=new Character({scene:new T.Group(),animations:names.map(n=>new T.AnimationClip(n,1,[]))},{modelYaw:0});
  ch.startLocomotion();
  for(let i=0;i<60;i++)ch.locomote(2.8,1/60,{locked:true,side:1,forward:0});
  assert.ok(ch.loco.w.StrafeLeftRun>.99);
  assert.ok(ch.loco.w.StrafeRightRun<.001);
});

test('gait cadence follows travelled distance including reversed native cycles', () => {
  const ch=new Character({scene:new T.Group(),animations:['Idle','Walk','Run'].map(n=>new T.AnimationClip(n,1,[]))},
    {modelYaw:0,gaitCalibration:{Walk:{stride:1,phase:0},Run:{stride:2,phase:.3,direction:-1}}});
  ch.startLocomotion({walkSpeed:2,runSpeed:6});
  for(let i=0;i<120;i++)ch.locomote(6,1/60);
  assert.ok(Math.abs(ch.loco.a.run.timeScale+3)<1e-6);
  const phase=ch.gaitPhase;
  ch.locomote(6,1/60);
  assert.ok(Math.abs(ch.gaitPhase-(phase+.05)%1)<1e-6);
});
