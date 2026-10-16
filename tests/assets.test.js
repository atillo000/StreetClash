import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

test('warehouse GLBs are complete and all external image dependencies are bundled', async () => {
  const folder = path.resolve('assets/environment/factory');
  const names = (await readdir(folder)).filter(n => n.endsWith('.glb'));
  assert.ok(names.length >= 19);
  for (const name of names) {
    const buffer = await readFile(path.join(folder, name));
    assert.equal(buffer.toString('ascii', 0, 4), 'glTF', name);
    assert.equal(buffer.readUInt32LE(8), buffer.length, name + ' length');
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    for (const image of gltf.images || []) if (image.uri && !image.uri.startsWith('data:')) {
      const imagePath = path.resolve(folder, decodeURIComponent(image.uri));
      assert.ok(imagePath.startsWith(folder + path.sep));
      assert.ok((await stat(imagePath)).size > 0, name + ' image');
    }
  }
  assert.match(await readFile(path.join(folder, 'LICENSE.txt'), 'utf8'), /CC0/);
});

test('warehouse floor textures match the original CC0 source checksums', async () => {
  for (const [file, expected] of [['diffuse', '99b94da291a4f038fa6af93c3993cbec'], ['normal', 'd77c5c5de3f58adcb00f93caeb4c5a73']]) {
    const bytes = await readFile(`assets/textures/concrete-floor-${file}.jpg`);
    assert.equal(createHash('md5').update(bytes).digest('hex'), expected);
  }
  const credits = await readFile('assets/ASSET-LICENSES.md', 'utf8');
  assert.match(credits, /polyhaven.com\/a\/concrete_floor/); assert.match(credits, /kenney.nl\/assets\/factory-kit/);
});
