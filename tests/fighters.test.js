import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { FIGHTER_LIST } from '../src/characters/FighterCatalog.js';

for (const fighter of FIGHTER_LIST) {
  test(`${fighter.id}: prepared rig has embedded assets and all mapped animations`, () => {
    // FBX sources stay out of GitHub; verify the self-contained runtime GLBs by
    // default, with an optional source check on the asset-preparation machine.
    if (process.env.CHECK_FBX_SOURCES === '1') {
      assert.ok(existsSync(fighter.source));
      for (const source of Object.values(fighter.clips)) assert.ok(existsSync(source), source);
    }
    const bytes = readFileSync(fighter.url);
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    for (const asset of [...json.buffers, ...json.images]) assert.equal(asset.uri, undefined);
    const names = new Set(json.animations.map(a => a.name));
    for (const name of Object.keys(fighter.clips)) assert.ok(names.has(name), name);
    assert.ok(names.has('Sprint'));
    const joints = new Set(json.skins.flatMap(s => s.joints));
    assert.ok(joints.size >= (fighter.id === 'mutant' ? 37 : 52));
    for (const bone of ['mixamorigHips', 'mixamorigRightHand', 'mixamorigLeftHand', 'mixamorigRightFoot', 'mixamorigLeftFoot'])
      assert.ok([...joints].some(i => json.nodes[i].name === bone), bone);
    assert.equal(new Set([...joints].map(i => json.nodes[i].name)).size, joints.size);
    assert.ok(bytes.length < (fighter.id === 'axe' ? 20_000_000 : 16_000_000));
  });
}
