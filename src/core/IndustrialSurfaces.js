import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let pending;
export function loadIndustrialSurfaces(){return pending??=(async()=>{
 const loader=new THREE.TextureLoader(),sets={};
 for(const id of ['metal_plate_02','corrugated_iron_03']){
  const maps=await Promise.all(['diff','normal','rough'].map(type=>loader.loadAsync('./assets/presentation/'+id+'-'+type+'.jpg')));
  maps[0].colorSpace=THREE.SRGBColorSpace;for(const t of maps){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;}
  sets[id]=maps;
 }
 const material=(id,color,metalness=.65)=>{const [map,normalMap,roughnessMap]=sets[id];return new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,color,metalness,roughness:.8,normalScale:new THREE.Vector2(.5,.5),side:THREE.DoubleSide});};
 const steel=material('metal_plate_02',0x879b9e),roof=material('corrugated_iron_03',0x7b9197,.55),rivet=new THREE.MeshStandardMaterial({color:0xaab4af,roughness:.6,metalness:.65});
 function rivets(points){const cap=new THREE.CylinderGeometry(.027,.033,.018,6),parts=points.map(([x,y,z])=>cap.clone().translate(x,y,z)),geometry=mergeGeometries(parts);cap.dispose();parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,rivet);mesh.receiveShadow=true;mesh.castShadow=false;return mesh;}
 function corrugatedRoof(width,depth){
  const root=new THREE.Group(),geom=new THREE.PlaneGeometry(width,depth,Math.max(12,Math.ceil(width/.09)),Math.max(2,Math.ceil(depth/.3))).rotateX(-Math.PI/2),p=geom.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),edge=Math.pow(Math.abs(x)/(width*.5),4);p.setY(i,.045*Math.cos(x*Math.PI*2/.36)+edge*.07*Math.sin(z*1.4+width)-.035*Math.cos(x/width*Math.PI)*Math.cos(z/depth*Math.PI));}geom.computeVertexNormals();
  const m=roof.clone();m.map=m.map.clone();m.normalMap=m.normalMap.clone();m.roughnessMap=m.roughnessMap.clone();for(const t of [m.map,m.normalMap,m.roughnessMap])t.repeat.set(width/3,depth/3);
  const sheet=new THREE.Mesh(geom,m);sheet.castShadow=true;sheet.receiveShadow=true;root.add(sheet);
  const points=[];for(const x of [-width/2+.12,0,width/2-.12])for(const z of [-depth/2+.12,depth/2-.12])points.push([x,.075,z]);root.add(rivets(points));return root;
 }
 function deck(parent,decorations){
  const boltPoints=[],materials=[steel,steel.clone(),steel.clone()];materials[1].color.multiplyScalar(.88);materials[2].color.multiplyScalar(1.05);let panels=0;
  for(const x of [-3,-1,1,3])for(const z of [-2,0,2,4]){
   const m=materials[panels++%3];const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.975,1.975,16,16).rotateX(-Math.PI/2),m);mesh.position.set(x,.008,z);mesh.receiveShadow=true;mesh.name='Deforming riveted steel plate';parent.add(mesh);decorations.push(mesh);
   for(const dx of [-.84,.84])for(const dz of [-.84,.84])boltPoints.push([x+dx,.02,z+dz]);
  }
  const bolts=rivets(boltPoints);parent.add(bolts);decorations.push(bolts);return panels;
 }
 return{steel,roof,rivets,corrugatedRoof,deck};
})();}
