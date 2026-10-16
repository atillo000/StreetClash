import fs from 'node:fs';
const folder = 'assets/Weapons/kenney/';
const bytes = fs.readFileSync(folder+'blaster-n.glb'), length = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.toString('utf8',20,20+length)), source = bytes.subarray(28+length);
const chunks=[source]; let offset=source.length;
for (const image of json.images || []) if (image.uri) {
  if (image.uri !== 'Textures/colormap.png') throw new Error('Unexpected texture path');
  const padding = (4-offset%4)%4; if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  const png=fs.readFileSync(folder+image.uri);
  image.bufferView=json.bufferViews.length; image.mimeType='image/png'; delete image.uri;
  json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:png.length});chunks.push(png);offset+=png.length;
}
json.buffers=[{byteLength:offset}];
const text=Buffer.from(JSON.stringify(json)), jsonPadding=Buffer.alloc((4-text.length%4)%4,32);
const binary=Buffer.concat(chunks), binPadding=Buffer.alloc((4-binary.length%4)%4);
const header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+jsonPadding.length+binary.length+binPadding.length,8);
header.writeUInt32LE(text.length+jsonPadding.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length+binPadding.length);binHeader.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(folder+'blaster-n-runtime.glb',Buffer.concat([header,text,jsonPadding,binHeader,binary,binPadding]));
console.log('Prepared embedded Kenney blaster.');
