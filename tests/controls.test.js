import test from 'node:test';
import assert from 'node:assert/strict';
import { requestedAttacks } from '../src/core/controls.js';
test('mouse and numbered combat controls select separate actions', () => {
  const expected = { Mouse0: 'punch', Mouse2: 'heavy', Digit1: 'kick', Digit2: 'skill1', Digit3: 'skill2' };
  for (const [code, move] of Object.entries(expected)) assert.deepEqual(requestedAttacks({ pressed: c => c === code }), [move]);
  assert.deepEqual(requestedAttacks({ pressed: c => ['Mouse0', 'KeyJ'].includes(c) }), ['punch']);
});
