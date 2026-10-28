import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const output=path.resolve(process.argv[2]||'assets/environment/polyhaven');
const PICKS={
 modular_factory_facade:['window_centered_small_01','window_centered_large_01','wall_window_centered_small_01','wall_door_garage_centered_01','door_garage_centered_01','wall_door_centered_small_01','door_centered_small_01','cornice02_standard_standard_01','dado_standard_standard_01'],
 modular_urban_apartments_facade:['door_centered_small_01','wall_door_centered_small_01','window_centered_small_01','wall_window_centered_small_01','wall_standard_standard_01','cornice_standard_standard_01','crown_standard_standard_01','dado_standard_standard_01'],
 painted_wooden_bench:null,
 steel_frame_shelves_02:null,
 metal_tool_chest:null,
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const multiply=(a,b)=>{const m=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;};
function localMatrix(n){if(n.matrix)return n.matrix;const[x,y,z,w]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1],[tx,ty,tz]=n.translation||[0,0,0];return[(1-2*y*y-2*z*z)*sx,(2*x*y+2*z*w)*sx,(2*x*z-2*y*w)*sx,0,(2*x*y-2*z*w)*sy,(1-2*x*x-2*z*z)*sy,(2*y*z+2*x*w)*sy,0,(2*x*z+2*y*w)*sz,(2*y*z-2*x*w)*sz,(1-2*x*x-2*y*y)*sz,0,tx,ty,tz,1];}
async function get(url){if(!/^https:\/\/(api\.polyhaven\.com|dl\.polyhaven\.org)\//.test(url))throw Error('Unexpected asset host');const r=await fetch(url,{headers:{'User-Agent':'StreetClash-local-asset-preparation'}});if(!r.ok)throw Error(url+' '+r.status);return Buffer.from(await r.arrayBuffer());}
await fs.mkdir(output,{recursive:true});const records=[],previous=JSON.parse(await fs.readFile(path.join(output,'SOURCES.json'),'utf8').catch(()=>'{}')).assets||[];
for(const[id,names]of Object.entries(PICKS)){
 const cached=previous.find(a=>a.id===id),existing=await fs.readFile(path.join(output,id+'.glb')).catch(()=>null);if(process.env.SC_REPREP!==id&&cached&&existing&&hash(existing)===cached.sha256){records.push(cached);console.log(id+': reused verified local asset');continue;}
 const files=JSON.parse(await get('https://api.polyhaven.com/files/'+id)),info=JSON.parse(await get('https://api.polyhaven.com/info/'+id)),entry=files.gltf?.['1k']?.gltf;if(!entry)throw Error('No 1k glTF: '+id);
 const raw=await get(entry.url),g=JSON.parse(raw);const source=new Map(),downloads=[{url:entry.url,sha256:hash(raw),bytes:raw.length}];
 await Promise.all(Object.entries(entry.include).map(async([key,f])=>{const b=await get(f.url);source.set(key,b);downloads.push({url:f.url,sha256:hash(b),bytes:b.length});}));
 const out={asset:{version:'2.0',generator:'StreetClash selected CC0 Poly Haven modules'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[],materials:g.materials,textures:g.textures,samplers:g.samplers,images:[],extensionsUsed:g.extensionsUsed,extensionsRequired:g.extensionsRequired};
 const chunks=[];let offset=0;const viewMap=new Map(),accessorMap=new Map();
 const append=(bytes,extra={})=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}const index=out.bufferViews.length;out.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,...extra});chunks.push(bytes);offset+=bytes.length;return index;};
 const view=index=>{if(viewMap.has(index))return viewMap.get(index);const v=g.bufferViews[index],b=source.get(g.buffers[v.buffer].uri);if(!b)throw Error('Missing buffer');const mapped=append(b.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),v.byteStride?{byteStride:v.byteStride}:{});viewMap.set(index,mapped);return mapped;};
 const acc=index=>{if(accessorMap.has(index))return accessorMap.get(index);const a=structuredClone(g.accessors[index]);if(a.sparse)throw Error('Sparse accessor needs conversion');a.bufferView=view(a.bufferView);const mapped=out.accessors.push(a)-1;accessorMap.set(index,mapped);return mapped;};
 const selected=names?names.map(n=>{const node=g.nodes.find(x=>x.name===n);if(!node)throw Error('Missing module '+id+'/'+n);return node;}):g.nodes.filter(n=>n.mesh!==undefined);
 const parents=new Map(),worldMatrices=new Map();g.nodes.forEach((n,i)=>n.children?.forEach(child=>parents.set(child,i)));
 const worldMatrix=i=>{if(!worldMatrices.has(i))worldMatrices.set(i,multiply(parents.has(i)?worldMatrix(parents.get(i)):identity(),localMatrix(g.nodes[i])));return worldMatrices.get(i);};
 for(const n of selected){const mesh=structuredClone(g.meshes[n.mesh]);for(const p of mesh.primitives){for(const a of Object.keys(p.attributes))p.attributes[a]=acc(p.attributes[a]);if(p.indices!==undefined)p.indices=acc(p.indices);if(p.targets)throw Error('Unexpected morph target');}
  const meshIndex=out.meshes.push(mesh)-1,node={name:n.name,mesh:meshIndex};if(!names)node.matrix=worldMatrix(g.nodes.indexOf(n));out.scenes[0].nodes.push(out.nodes.push(node)-1);
 }
 for(const image of g.images||[]){const b=source.get(image.uri);if(!b)throw Error('Missing image '+image.uri);out.images.push({name:image.name||path.basename(image.uri),bufferView:append(b),mimeType:/\.png$/i.test(image.uri)?'image/png':'image/jpeg'});}
 const bin=Buffer.concat(chunks),binPad=Buffer.alloc((4-bin.length%4)%4);out.buffers=[{byteLength:bin.length}];let json=Buffer.from(JSON.stringify(out));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length+binPad.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length+binPad.length);bh.writeUInt32LE(0x004e4942,4);
 const glb=Buffer.concat([header,jh,json,bh,bin,binPad]);await fs.writeFile(path.join(output,id+'.glb'),glb);
 const triangles=out.meshes.reduce((sum,m)=>sum+m.primitives.reduce((s,p)=>s+out.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
 records.push({id,title:info.name,authors:info.authors,source:'https://polyhaven.com/a/'+id,license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',resolution:'1k',modules:names||selected.map(n=>n.name),sha256:hash(glb),bytes:glb.length,triangles,sourceFiles:downloads});
 console.log(JSON.stringify({id,bytes:glb.length,triangles,modules:out.nodes.map((n,i)=>({name:n.name,bounds:out.accessors[out.meshes[n.mesh].primitives[0].attributes.POSITION].min,max:out.accessors[out.meshes[n.mesh].primitives[0].attributes.POSITION].max}))}));
}
await fs.writeFile(path.join(output,'SOURCES.json'),JSON.stringify({prepared:'2026-10-28',api:'Powered by Poly Haven — https://polyhaven.com',modifications:'Selected modules only; source layout translations removed for modular placement; original 1k PBR maps retained and embedded. No skeleton required for static architecture.',assets:records},null,2));
await fs.writeFile(path.join(output,'LICENSE.txt'),'Poly Haven assets: CC0 1.0 Universal\nhttps://creativecommons.org/publicdomain/zero/1.0/\nhttps://polyhaven.com/license\nAuthors, source pages, file hashes and modifications are recorded in SOURCES.json.\nPowered by Poly Haven — https://polyhaven.com\n');
