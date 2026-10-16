import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Character } from '../src/characters/Character.js';
import { Mover } from '../src/characters/Mover.js';
import { Combatant } from '../src/combat/Combatant.js';
import { FIGHTERS } from '../src/characters/FighterCatalog.js';
import { FIGHTER_MOVES, fighterDefense } from '../src/combat/fighterMoves.js';

function fighter(id = 'capoeira') {
  const model = new T.Group(), hand = new T.Bone(); hand.name = 'mixamorigRightHand'; model.add(hand);
  const clips = ['Idle','Walk','Run','Light','Kick','Heavy','Roll','Hit','Block'].map(name => new T.AnimationClip(name, 1,
    [new T.NumberKeyframeTrack('mixamorigRightHand.position[y]', [0,1], [1,1])]));
  const character = new Character({ scene: model, animations: clips }, { modelYaw: 0 });
  character.startLocomotion(FIGHTERS[id]);
  const mover = new Mover(character, FIGHTERS[id]); mover.lockSpeed = FIGHTERS[id].lockSpeed;
  const world = { combatEnabled: true, combatants: [] };
  const c = new Combatant({ name: id, team: 0, character, mover, world, spawn: new T.Vector3(), spawnFacing: 0,
    profile: FIGHTERS[id], moves: FIGHTER_MOVES[id], defense: fighterDefense(id) });
  world.combatants.push(c); return c;
}

test('recovery dodges buffer near the opening, preserve strike commitment and clear on impact/reset', () => {
  const c = fighter(); c.tryAttack('punch');
  c.character.action.time = .02; assert.equal(c.tryDodge(1), false); assert.equal(c.dodgeBuffer, null);
  c.character.action.time = .48; assert.equal(c.tryDodge(1), false); assert.ok(c.dodgeBuffer);
  c.character.action.time = .52; c.update(1/60);
  assert.equal(c.state, 'dodge'); assert.equal(c.mover.facing, 1); assert.equal(c.dodgeBuffer, null);
  assert.equal(c.tryDodge(), false, 'dodge cooldown prevents repeated invulnerability');
  c.reset(); c.tryAttack('punch'); c.character.action.time = .48; c.tryDodge(); c.iframes = 0;
  c.takeHit({ damage: 5, knock: 0, power: 'light', dir: new T.Vector3(0,0,1) });
  assert.equal(c.dodgeBuffer, null); assert.equal(c.state, 'hit');
  c.reset(); assert.equal(c.dodgeBuffer, null);
});

test('each attack keeps its strikes before combo, dodge and recovery cutoffs', () => {
  for (const moves of Object.values(FIGHTER_MOVES)) for (const m of Object.values(moves)) {
    const lastStrike = Math.max(...m.windows.map(w => w[1]), ...(m.events || []));
    assert.ok(m.cancelAt >= lastStrike, m.label);
    assert.ok((m.dodgeCancelAt ?? m.cancelAt) >= lastStrike, m.label);
    assert.ok(m.endAt > m.cancelAt, m.label);
  }
});

test('locked movement accelerates quickly and reversal follows input immediately', () => {
  for (const id of Object.keys(FIGHTERS)) {
    const c = fighter(id), m = c.mover; m.lockFacing = 0; m.steer(new T.Vector3(1,0,0), 1);
    for (let i = 0; i < 12; i++) m.update(1/60);
    assert.ok(Math.abs(m.speed - FIGHTERS[id].lockSpeed) < .01);
    m.steer(new T.Vector3(-1,0,0), 1); m.update(1/60); assert.ok(m.velocity.x < 0);
  }
});

test('ranged startup snapshots aim instead of tracking a moving victim', () => {
  const c = fighter('soldier');
  const target = { team: 1, alive: true, position: new T.Vector3(0,0,5) };
  c.world.combatants.push(target); c.tryAttack('punch', 0);
  target.position.x = 3;
  assert.equal(c.castTarget.x, 0); assert.equal(c.castTarget.z, 5);
});
