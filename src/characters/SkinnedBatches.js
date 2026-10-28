import * as THREE from 'three';

// Some FBX exports become hundreds of tiny glTF primitives sharing one vertex
// stream. Join their indices, not their vertex arrays. Keep rig, materials,
// transforms and triangle order. Animated mesh/morph targets are left alone.
export function batchSkinnedPrimitives(gltf){
 const animated=new Set();for(const clip of gltf.animations)for(const track of clip.tracks){try{animated.add(THREE.PropertyBinding.parseTrackName(track.name).nodeName);}catch{}}
 const ids=new WeakMap();let next=0;const id=o=>{if(!ids.has(o))ids.set(o,++next);return ids.get(o);};const groups=new Map();
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(mesh=>{
  const g=mesh.geometry;if(!mesh.isSkinnedMesh||Array.isArray(mesh.material)||!g.index||g.groups.length||Object.keys(g.morphAttributes).length||animated.has(mesh.name)||animated.has(mesh.uuid))return;
  if(g.drawRange.start!==0||g.drawRange.count!==Infinity)return;
  const attrs=Object.keys(g.attributes).sort().map(k=>k+':'+id(g.attributes[k])).join(',');
  const key=[id(mesh.parent),id(mesh.material),mesh.bindMode,mesh.bindMatrix.elements.join(','),mesh.matrix.elements.join(','),mesh.skeleton.bones.map(id).join(','),mesh.skeleton.boneInverses.map(m=>m.elements.join(',')).join(';'),attrs].join('|');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 });
 let removed=0;
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;const first=meshes[0],g=new THREE.BufferGeometry(),count=meshes.reduce((n,m)=>n+m.geometry.index.count,0);
  for(const[k,a]of Object.entries(first.geometry.attributes))g.setAttribute(k,a);
  const indices=g.attributes.position.count>65535?new Uint32Array(count):new Uint16Array(count);let offset=0;
  for(const mesh of meshes){indices.set(mesh.geometry.index.array,offset);offset+=mesh.geometry.index.count;}
  g.setIndex(new THREE.BufferAttribute(indices,1));g.computeBoundingBox();g.computeBoundingSphere();
  const merged=new THREE.SkinnedMesh(g,first.material);merged.name=first.name;merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);merged.bindMode=first.bindMode;merged.bind(first.skeleton,first.bindMatrix);merged.bindMatrixInverse.copy(first.bindMatrixInverse);merged.frustumCulled=first.frustumCulled;merged.userData={...first.userData,batchedPrimitives:meshes.length};
  first.parent.add(merged);for(const mesh of meshes)mesh.removeFromParent();removed+=meshes.length-1;
 }
 return removed;
}
