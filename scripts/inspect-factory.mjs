import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

for (const name of await readdir('assets/environment/factory')) {
  if (!name.endsWith('.glb')) continue;
  const buffer = await readFile(path.join('assets/environment/factory', name));
  const size = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + size).toString());
  const accessors = gltf.meshes.flatMap(m => m.primitives.map(p => gltf.accessors[p.attributes.POSITION]));
  const min = [0, 1, 2].map(i => Math.min(...accessors.map(a => a.min[i])));
  const max = [0, 1, 2].map(i => Math.max(...accessors.map(a => a.max[i])));
  console.log(name, JSON.stringify({ min, max, meshes: gltf.meshes.length, triangles: gltf.meshes.flatMap(m => m.primitives).reduce((n, p) => n + (p.indices === undefined ? gltf.accessors[p.attributes.POSITION].count : gltf.accessors[p.indices].count) / 3, 0), images: gltf.images?.map(i => ({ uri: i.uri, embedded: i.bufferView !== undefined })) }));
}
