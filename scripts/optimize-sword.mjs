// Development-only tool. Set MESHOPT_MODULE to meshoptimizer's index.js.
// The game loads the resulting GLB and never imports meshoptimizer at runtime.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { MeshoptSimplifier } = await import(pathToFileURL(process.env.MESHOPT_MODULE).href);
await MeshoptSimplifier.ready;
const input = fs.readFileSync('assets/Weapons/great-sword.glb');
const jsonLength = input.readUInt32LE(12), json = JSON.parse(input.toString('utf8', 20, 20 + jsonLength));
const binary = input.subarray(28 + jsonLength);
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const types = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const data = accessorIndex => {
  const a = json.accessors[accessorIndex], view = json.bufferViews[a.bufferView], Type = types[a.componentType];
  const width = components[a.type], result = new Type(a.count * width), stride = view.byteStride || width * Type.BYTES_PER_ELEMENT;
  for (let i = 0; i < a.count; i++) {
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0) + i * stride;
    result.set(new Type(binary.buffer, binary.byteOffset + offset, width), i * width);
  }
  return result;
};
let originalTriangles = 0, triangles = 0;
const newData = new Map();
for (const primitive of json.meshes.flatMap(mesh => mesh.primitives)) {
  const positions = data(primitive.attributes.POSITION), indices = new Uint32Array(data(primitive.indices));
  const [simplified] = MeshoptSimplifier.simplify(indices, positions, 3, Math.min(indices.length, 60_000), 0.025, ['Permissive']);
  originalTriangles += indices.length / 3; triangles += simplified.length / 3;
  const remap = new Map(), used = [], compactIndices = new Uint32Array(simplified.length);
  simplified.forEach((index, i) => { if (!remap.has(index)) { remap.set(index, used.length); used.push(index); } compactIndices[i] = remap.get(index); });
  for (const id of Object.values(primitive.attributes)) {
    const source = data(id), width = components[json.accessors[id].type], compact = new source.constructor(used.length * width);
    used.forEach((index, i) => compact.set(source.subarray(index * width, (index + 1) * width), i * width));
    newData.set(id, compact); json.accessors[id].count = used.length;
  }
  newData.set(primitive.indices, compactIndices);
  Object.assign(json.accessors[primitive.indices], { componentType: 5125, count: compactIndices.length, min: [0], max: [used.length - 1] });
}
// Repack only the referenced attribute/image bytes; omit the original dense mesh.
const chunks = [], views = []; let offset = 0;
function append(bytes) {
  const padding = (4 - offset % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
  const index = views.length; views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
  chunks.push(bytes); offset += bytes.length; return index;
}
for (let id = 0; id < json.accessors.length; id++) {
  const array = newData.get(id) || data(id), a = json.accessors[id];
  a.bufferView = append(Buffer.from(array.buffer, array.byteOffset, array.byteLength)); a.byteOffset = 0;
}
for (const image of json.images || []) if (image.bufferView !== undefined) {
  const view = json.bufferViews[image.bufferView]; image.bufferView = append(binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength));
}
json.bufferViews = views; json.buffers = [{ byteLength: offset }];
const encoded = Buffer.from(JSON.stringify(json)), jsonPad = Buffer.alloc((4 - encoded.length % 4) % 4, 32);
const bin = Buffer.concat(chunks), binPad = Buffer.alloc((4 - bin.length % 4) % 4);
const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + encoded.length + jsonPad.length + bin.length + binPad.length, 8);
header.writeUInt32LE(encoded.length + jsonPad.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length + binPad.length); binHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync('assets/Weapons/generated', { recursive: true });
fs.writeFileSync(path.resolve('assets/Weapons/generated/great-sword.glb'), Buffer.concat([header, encoded, jsonPad, binHeader, bin, binPad]));
console.log(JSON.stringify({ originalTriangles, triangles }));
