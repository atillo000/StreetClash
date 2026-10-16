import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIGHTER_LIST } from '../src/characters/FighterCatalog.js';
import { FIGHTER_MOVES } from '../src/combat/fighterMoves.js';
import { WEAPONS } from '../src/characters/FighterWeapons.js';
const glb = file => { const b = readFileSync(file); return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))); };
test('every fighter attack uses an embedded clip with real bone channels', () => {
  for (const fighter of FIGHTER_LIST) {
    const json = glb(fighter.url);
    for (const move of Object.values(FIGHTER_MOVES[fighter.id])) {
      const clip = json.animations.find(a => a.name === move.clip);
      assert.ok(clip?.channels.length > 20, fighter.id + ' / ' + move.clip);
      if (move.strikers.some(s => s.startsWith('weapon:'))) assert.ok(WEAPONS[fighter.weapon]);
    }
    if (fighter.id === 'axe') assert.ok(!json.nodes.some(n => n.name === 'BattleAxe_GEO'), 'source axe removed to avoid duplicate weapons');
  }
});
test('imported runtime props and weapons are embedded; sword stays under 25k triangles', () => {
  for (const file of [...Object.values(WEAPONS).map(w => w.url), './assets/environment/old-barrel.glb', './assets/environment/wooden-crate.glb']) {
    const json = glb(file);
    for (const item of [...json.buffers, ...(json.images || [])]) assert.equal(item.uri, undefined, file);
    if (file.includes('generated/great-sword')) {
      const triangles = json.meshes.flatMap(m => m.primitives).reduce((n, p) => n + json.accessors[p.indices].count / 3, 0);
      assert.ok(triangles <= 25_000);
    }
  }
});
