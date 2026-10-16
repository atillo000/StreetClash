import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Aim } from '../src/combat/Aim.js';
import { Character } from '../src/characters/Character.js';
import { Mover } from '../src/characters/Mover.js';
import { Combatant } from '../src/combat/Combatant.js';
import { FIGHTERS } from '../src/characters/FighterCatalog.js';
import { FIGHTER_MOVES, fighterDefense } from '../src/combat/fighterMoves.js';
import { ArenaCollision } from '../src/physics/collision.js';
import { Projectiles } from '../src/combat/Projectiles.js';

function fighter(id = 'capoeira') {
  const model = new T.Group(), hand = new T.Bone(); hand.name = 'mixamorigRightHand'; model.add(hand);
  const animations = ['Idle','Walk','Run','Light','Kick','Heavy','Roll','Hit','Down','Block','GetUp','Defeat'].map(name => new T.AnimationClip(name,1,
    [new T.NumberKeyframeTrack('mixamorigRightHand.position[y]',[0,1],[1,1])]));
  const character = new Character({ scene: model, animations }, { modelYaw: 0 }); character.startLocomotion(FIGHTERS[id]);
  const mover = new Mover(character, FIGHTERS[id]);
  const world = { combatEnabled: true, combatants: [], arena: new ArenaCollision(), onCast() {} };
  const c = new Combatant({ name: id, team: 0, character, mover, world, spawn: new T.Vector3(), spawnFacing: 0,
    profile: FIGHTERS[id], moves: FIGHTER_MOVES[id], defense: fighterDefense(id) });
  world.combatants.push(c); c.iframes = 0; return c;
}
function step(c, dt = 1/60) { c.update(dt); c.world.arena.resolve([c]); c.character.update(dt); c.postAnimation(dt); }

test('buffered J chain advances clips, expires and clears when interrupted', () => {
  const c = fighter(); c.tryAttack('punch'); assert.equal(c.comboStage,1);
  c.tryAttack('punch'); c.character.action.time = .56; c.update(1/60);
  assert.equal(c.comboStage,2); assert.equal(c.character.actionName,'Kick');
  c.tryAttack('punch'); c.character.action.time = .72; c.update(1/60);
  assert.equal(c.comboStage,3); assert.equal(c.character.actionName,'Heavy');
  assert.equal(c.cooldowns.heavy,undefined,'chain finisher does not consume separate L attack');
  c._toFree(); for (let i=0;i<60;i++) step(c);
  c.tryAttack('punch'); assert.equal(c.comboStage,1);
  c.takeHit({ damage: 1, knock: 0, power: 'light', dir: new T.Vector3(0,0,1) });
  assert.equal(c.comboRemaining,0); assert.equal(c.comboStage,0); assert.equal(c.buffer,null);
});

test('escape skills are vulnerable before and after their bounded phase window', () => {
  for (const id of ['magic','soldier']) {
    const c = fighter(id), hit = { damage: 1, knock: 0, power: 'light', dir: new T.Vector3(0,0,1) };
    c.tryAttack('skill2',0); c.character.action.time = .02; assert.equal(c.takeHit(hit),'hit');
    c.reset(); c.iframes=0; c.tryAttack('skill2',0); c.character.action.time = .2; assert.equal(c.takeHit(hit),'miss');
    c.character.action.time = .5; assert.equal(c.takeHit(hit),'hit');
    c._toFree(); assert.equal(c.tryAttack('skill2'),false,'interruption still consumes cooldown');
  }
});

test('escape and rush displacement collide with cover instead of crossing it', () => {
  for (const [id, skill] of [['magic','skill2'],['soldier','skill2'],['capoeira','skill1']]) {
    const c = fighter(id);
    c.world.arena = new ArenaCollision({ obstacles: [new T.Box3(new T.Vector3(-2,0,.8),new T.Vector3(2,3,1.3))] });
    c.tryAttack(skill,0); for(let i=0;i<120;i++) step(c);
    assert.ok(c.position.z <= .42 + 1e-5, id);
    assert.ok(c.position.z > .3, id);
  }
});

test('manual aim preserves the selected point and suppresses nearby auto-aim', () => {
  const c = fighter('soldier');
  c.world.combatants.push({ team: 1, alive: true, position: new T.Vector3(2,0,2) });
  c.manualAim = true; c.aimPoint = new T.Vector3(0,1,10); c.tryAttack('skill1',0);
  assert.equal(c.attackAngle,0); assert.deepEqual(c.castTarget.toArray(),[0,1,10]);
  c.aimPoint.set(5,1,5); assert.equal(c.castTarget.x,0,'startup snapshots aim');
});

test('crosshair picks visible enemies and respects nearer cover', () => {
  const aim = new Aim(), camera = new T.PerspectiveCamera(45,1,.1,100);
  camera.position.set(0,2,6); camera.lookAt(0,1,0); camera.updateMatrixWorld(true);
  const owner = { team:0, position:new T.Vector3(0,0,4) };
  const enemy = { team:1, alive:true, position:new T.Vector3(), height:1.8, radius:.38 };
  const world = { combatants:[owner,enemy], arena:{ cameraBlockers:[] } };
  aim.update(camera,owner,world); assert.equal(aim.target,enemy);
  world.arena.cameraBlockers.push(new T.Box3(new T.Vector3(-2,0,2),new T.Vector3(2,3,3)));
  aim.update(camera,owner,world); assert.equal(aim.target,null); assert.ok(aim.point.z > 3);
});

test('targeted area commits a bounded point and cannot damage through cover', () => {
  const c = fighter('magic'); c.aimPoint = new T.Vector3(0,0,20); c.tryAttack('skill1',0);
  assert.equal(c.castPoint.z,9); c.aimPoint.z=1; assert.equal(c.castPoint.z,9);
  let damage=0; const target={ position:new T.Vector3(0,0,9), radius:.38, team:1, alive:true, takeHit(){damage++;return 'hit';} };
  c.world.combatants.push(target); c.world.onHit=()=>{};
  const pool = new Projectiles(new T.Scene(),c.world,{pulse(){},spark(){}},2);
  c.world.arena.obstacles.push(new T.Box3(new T.Vector3(-1,0,4),new T.Vector3(1,3,5)));
  pool.area(c,c.move); assert.equal(damage,0);
  c.world.arena.obstacles.length=0; pool.area(c,c.move); assert.equal(damage,1);
});
