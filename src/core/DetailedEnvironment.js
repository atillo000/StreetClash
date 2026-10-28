import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let pending;
export function loadDetailedEnvironment(){
 return pending??=Promise.all(['modular_factory_facade','modular_urban_apartments_facade','painted_wooden_bench','steel_frame_shelves_02','metal_tool_chest'].map(async id=>[id,(await new GLTFLoader().loadAsync('./assets/environment/polyhaven/'+id+'.glb')).scene])).then(entries=>new DetailedEnvironment(new Map(entries)));
}

// Authored CC0 geometry and original PBR maps. Keep native modules aligned to
// their shared 3m wall frame; do not centre a window independently of its wall.
export class DetailedEnvironment {
 constructor(models){this.models=models;this.partCache=new Map();
  for(const root of models.values())root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;for(const m of [].concat(o.material)){if(m.isMeshStandardMaterial){m.roughness=Math.max(.55,m.roughness);if(m.transparent){m.opacity=Math.max(.32,m.opacity);m.depthWrite=false;}for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key])m[key].anisotropy=4;}}});
 }
 part(style,name){const id=style==='urban'?'modular_urban_apartments_facade':'modular_factory_facade',template=this.models.get(id).getObjectByName(name);if(!template)throw Error('Detailed environment module missing: '+name);return template.clone(true);}
 facade(width,height,style='urban',{door=true,windows=true}={}){
  const root=new THREE.Group(),columns=Math.max(1,Math.round(width/3)),rows=Math.max(1,Math.round(height/3));root.scale.set(width/(columns*3),height/(rows*3),1);
  const add=(name,x,y)=>{const part=this.part(style,name);part.position.set(x,y,0);root.add(part);};
  for(let col=0;col<columns;col++)for(let row=0;row<rows;row++){
   const x=(col-columns/2)*3+3,y=row*3,entrance=door&&row===0&&col===Math.floor(columns/2);
   if(entrance){add('wall_door_centered_small_01',x,y);add('door_centered_small_01',x,y);}
   else {add('wall_window_centered_small_01',x,y);if(windows)add('window_centered_small_01',x,y+(style==='urban'?.35:0));}
   add(style==='urban'?'cornice_standard_standard_01':'cornice02_standard_standard_01',x,y+2.85);
   if(row===0)add('dado_standard_standard_01',x,0);
   if(row===rows-1&&style==='urban')add('crown_standard_standard_01',x,height/root.scale.y);
  }
  return root;
 }
 building(width,height,depth,style='urban'){
  const root=new THREE.Group();
  for(const[w,x,z,yaw]of [[width,0,depth/2,0],[width,0,-depth/2,Math.PI],[depth,-width/2,0,-Math.PI/2],[depth,width/2,0,Math.PI/2]]){
   const face=this.facade(w,height,style);face.position.set(x,0,z);face.rotation.y=yaw;root.add(face);
  }
  // Concrete roof slab uses the kit's textured plaster/brick rather than a flat
  // toy-like cap; authored cornices and window recesses provide the silhouette.
  let roofMaterial;this.models.get(style==='urban'?'modular_urban_apartments_facade':'modular_factory_facade').traverse(o=>{if(o.isMesh&&!roofMaterial)roofMaterial=[].concat(o.material).find(m=>m.map&&!m.transparent);});
  const roof=this.surfaces?this.surfaces.corrugatedRoof(width,depth):new THREE.Mesh(new THREE.BoxGeometry(width,.12,depth),roofMaterial);roof.position.y=height;roof.castShadow=true;root.add(roof);return root;
 }
 prop(id){const root=this.models.get(id).clone(true);root.position.set(0,0,0);return root;}
 workshop(floorMaterial){
  const room=new THREE.Group();room.name='Hero workshop / textured preview backdrop';
  const floorMat=floorMaterial.clone();floorMat.vertexColors=false;floorMat.color.set(0xc5bda8);if(floorMat.map){floorMat.map=floorMat.map.clone();floorMat.map.repeat.set(4,4);}if(floorMat.normalMap){floorMat.normalMap=floorMat.normalMap.clone();floorMat.normalMap.repeat.set(4,4);}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,18).rotateX(-Math.PI/2),floorMat);floor.position.y=-.14;room.add(floor);
  for(const[w,x,z,yaw]of [[15,0,-6.5,0],[15,-7,0,Math.PI/2],[15,7,0,-Math.PI/2],[15,0,7.5,Math.PI]]){const face=this.facade(w,4.5,'factory');face.position.set(x,-.14,z);face.rotation.y=yaw;room.add(face);}
  const chest=this.prop('metal_tool_chest');chest.position.set(1.7,.1,-2.8);room.add(chest);
  const bench=this.prop('painted_wooden_bench');bench.position.set(-1.25,-.14,-2.5);bench.rotation.y=.3;room.add(bench);
  for(const x of [-1.8,3.1]){const shelf=this.prop('steel_frame_shelves_02');shelf.position.set(x,-.14,-4.8);shelf.scale.setScalar(1.1);room.add(shelf);}
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');g.fillStyle='#355d59';g.fillRect(0,0,1024,512);g.strokeStyle='#bccfc180';g.lineWidth=3;
  g.strokeRect(25,25,974,462);g.fillStyle='#e5e5cc';g.font='bold 48px Arial';g.fillText('THE CIRCUIT / CONTENDER BRIEFING',55,95);g.font='22px monospace';g.fillText('FOOTWORK  /  TIMING  /  COMMITMENT',55,145);
  for(let i=0;i<3;i++){const x=75+i*310;g.beginPath();g.arc(x+80,270,55,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x+80,325);g.lineTo(x+80,385);g.moveTo(x+40,350);g.lineTo(x+120,350);g.stroke();g.fillText(['READ','REACT','COUNTER'][i],x+35,445);}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const board=new THREE.Mesh(new THREE.BoxGeometry(4.6,2.3,.09),new THREE.MeshStandardMaterial({map:texture,roughness:.95}));board.position.set(.5,2,-6.1);room.add(board);
  return room;
 }
}
