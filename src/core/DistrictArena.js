import { loadIndustrialSurfaces } from './IndustrialSurfaces.js';
import { ArenaAmbience } from './ArenaAmbience.js';
import { loadDetailedEnvironment } from './DetailedEnvironment.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaCollision } from '../physics/collision.js';
import { DeformableGround } from './DeformableGround.js';
import { paintedTexture } from './ArtDirection.js';
import { batchStatic, batchBreakables } from './WarehouseArena.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const THEMES={
 street:{name:'Freight Quarter',subtitle:'STREET / DEPOT PLAZA',wall:0xc2b9a0,trim:0x5b8585,accent:0xcfaa67,sky:0xc3dbe6,fog:0xc3dbe6,floor:0xbab9ac,court:0x959b90},
 factory:{name:'Ironworks',subtitle:'FACTORY / ASSEMBLY YARD',wall:0xb6bdac,trim:0x5d8380,accent:0xc8a35f,sky:0xc4d9dd,fog:0xc4d9dd,floor:0xb2bbb0,court:0x8f9b94},
 foundry:{name:'Cinder Works',subtitle:'FOUNDRY / COOLING DECK',wall:0xc1b098,trim:0x8a7562,accent:0xd2a15c,sky:0xd8cfb9,fog:0xd8cfb9,floor:0xb3b2a2,court:0x9f9380},
};

export async function createWarehouseArena(scene,onProgress=()=>{}){
 const names=['box-large','box-small','machine-fortified','hopper-round','screen-panel-wide','pipe-large-long','pipe-large-valve','structure-yellow-tall','catwalk-straight','cone','crane'];
 const loader=new GLTFLoader(),models=new Map();let loaded=0;const [details,surfaces]=await Promise.all([loadDetailedEnvironment(),loadIndustrialSurfaces()]);details.surfaces=surfaces;
 await Promise.all([...names.map(async n=>{models.set(n,(await loader.loadAsync('./assets/environment/factory/'+n+'.glb')).scene);onProgress(++loaded,names.length+2);}),...['old-barrel','wooden-crate'].map(async n=>{models.set(n,(await loader.loadAsync('./assets/environment/'+n+'.glb')).scene);onProgress(++loaded,names.length+2);})]);
 const group=new THREE.Group(),terrainGroup=new THREE.Group(),dynamicGroup=new THREE.Group();group.name='Freight Quarter / static district';terrainGroup.name='District ground';dynamicGroup.name='District breakables';scene.add(group,terrainGroup,dynamicGroup);
 const obstacles=[],cameraBlockers=[],breakables=[],clusters=[],importedPlacements=[],decorations=[],themeGroups={};
 const ambience=new ArenaAmbience(scene);
 const tex=new THREE.TextureLoader(),[diffuse,normal,brickMap]=await Promise.all(['concrete-floor-diffuse.jpg','concrete-floor-normal.jpg','brick-wall-diffuse.jpg'].map(n=>tex.loadAsync('./assets/textures/'+n)));
 const neutral=document.createElement('canvas');neutral.width=neutral.height=1024;const ctx=neutral.getContext('2d');ctx.filter='saturate(12%) brightness(100%)';ctx.drawImage(diffuse.image,0,0,1024,1024);diffuse.image=neutral;diffuse.needsUpdate=true;
 for(const t of [diffuse,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(12,12);t.anisotropy=4;}diffuse.colorSpace=brickMap.colorSpace=THREE.SRGBColorSpace;
 brickMap.wrapS=brickMap.wrapT=THREE.RepeatWrapping;brickMap.repeat.set(2,1);brickMap.anisotropy=4;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.04,...extra});
 const brick=mat(0xa29883,{map:brickMap}),wall=mat(0x9a9b8e),trim=mat(0x496566),accent=mat(0xb79958),steel=mat(0x424e50,{metalness:.35,roughness:.65}),concrete=mat(0xa9a99b),glass=mat(0x54696c,{emissive:0x9eb9bf,emissiveIntensity:.09}),lamp=new THREE.MeshBasicMaterial({color:0xffe9b4});
 let palette;models.get(names[0]).traverse(o=>{if(o.isMesh&&o.material.map)palette=o.material.map;});const kit=mat(0xffffff,{map:paintedTexture(palette,true)});
 for(const name of names)models.get(name).traverse(o=>{if(o.isMesh)o.material=kit;});
 const box=(x,y,z,w,h,d,material,solid=false,parent=group)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);
  if(solid){const b=new THREE.Box3(new THREE.Vector3(x-w/2,y,z-d/2),new THREE.Vector3(x+w/2,y+h,z+d/2));b.surfaceMaterial=material===steel?'metal':'stone';obstacles.push(b);cameraBlockers.push(b);}return m;
 };
 const sign=(title,sub,x,y,z,width,yaw=0,parent=group)=>{
  const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d');g.fillStyle='#263c3c';g.fillRect(0,0,512,192);g.fillStyle='#c4af79';g.fillRect(0,175,512,8);g.textAlign='center';g.fillStyle='#f0e8d3';g.font='900 54px Arial';g.fillText(title,256,82,490);g.fillStyle='#bdc9bf';g.font='bold 18px Arial';g.fillText(sub,256,135,490);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.375),new THREE.MeshBasicMaterial({map:t}));mesh.position.set(x,y,z);mesh.rotation.y=yaw;parent.add(mesh);return mesh;
 };
 const prop=(name,x,z,height,{y=0,yaw=0,solid=true,parent=group}={})=>{
  const model=models.get(name).clone(true),size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());model.scale.setScalar(height/size.y);model.rotation.y=yaw;
  const b=new THREE.Box3().setFromObject(model);model.position.set(x-(b.min.x+b.max.x)/2,y-b.min.y,z-(b.min.z+b.max.z)/2);parent.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const bounds=new THREE.Box3().setFromObject(model);
  if(['old-barrel','wooden-crate'].includes(name)){
   dynamicGroup.add(model);const materials=[],copies=new Map();model.traverse(o=>{if(!o.isMesh)return;const copy=m=>{if(!copies.has(m)){const n=m.clone();n.userData.batchSource=m.uuid;copies.set(m,n);materials.push({material:n,base:n.color.clone()});}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
   const maxHp=name==='old-barrel'?44:36;breakables.push({id:breakables.length,name,material:'wood',root:model,bounds,initialBounds:bounds.clone(),initialPosition:model.position.clone(),materials,hp:maxHp,maxHp,alive:true,fallSpeed:0});importedPlacements.push({name,bounds});
  }
  if(solid){bounds.surfaceMaterial=name==='old-barrel'||name==='wooden-crate'?'wood':'metal';obstacles.push(bounds);cameraBlockers.push(bounds);}return model;
 };
 // One district, three connected fighting pockets; no uniform scale-up of props.
 const floorMaterial=mat(0x999992,{map:diffuse,normalMap:normal,normalScale:new THREE.Vector2(.3,.3),metalness:0,roughness:.94});
 concrete.map=diffuse;concrete.normalMap=normal;concrete.normalScale=new THREE.Vector2(.22,.22);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(40.2,40.2,160,160).rotateX(-Math.PI/2),floorMaterial);floor.receiveShadow=true;floor.userData.courtColor=new THREE.Color(0xa4a393);terrainGroup.add(floor);
 let currentTheme=THEMES.street;
 floor.userData.colorAt=(x,z,out)=>{
  const plaza=Math.abs(x)<6.5&&z> -6.5&&z<8,walkway=Math.abs(x)>12||z>12,stage=Math.abs(x)<5.2&&z< -7&&z> -16.2;
  const repair=x>4.5&&x<7&&z>3&&z<7||x< -5&&x> -8&&z> -3&&z<0;
  out.set(repair?0x797f77:stage?0x9d9987:plaza?currentTheme.court:walkway?0x929d94:0x5c777c);out.multiplyScalar(.94+.04*Math.sin(x*.47+z*.38)+.025*Math.sin(x*1.23-z*.91));
 };
 // Actual raised stage and six shallow steps are part of the shared heightfield.
 // Side/back retaining walls prevent walking straight up its vertical sides.
 const baseHeight=(x,z)=>{
  if(Math.abs(x)<=5&&z>=-16&&z<=-10)return 1.2;
  if(Math.abs(x)<=3&&z> -10&&z< -7)return Math.min(1.2,Math.floor((-7-z)/.5+1)*.2);
  if(Math.abs(x)<4&&z> -3&&z<5)return .028;
  return 0;
 };
 const attr=floor.geometry.attributes.position;for(let i=0;i<attr.count;i++)attr.setY(i,baseHeight(attr.getX(i),attr.getZ(i)));floor.geometry.computeVertexNormals();
 const lineMaterial=new THREE.MeshBasicMaterial({color:0xc8bf9e});
 const line=(x,z,w,d,material=lineMaterial)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d,Math.max(1,Math.ceil(w/.3)),Math.max(1,Math.ceil(d/.3))).rotateX(-Math.PI/2),material);m.position.set(x,.018,z);terrainGroup.add(m);decorations.push(m);};
 // Steel deck panels define the combat pocket without a painted sports court.
 for(const x of [-11,11]){line(x,1,.1,24);for(const z of [-5,1,7])line(x,z,.75,.18);}
 const seamMaterial=new THREE.MeshBasicMaterial({color:0x59625c,transparent:true,opacity:.3,depthWrite:false});
 const steelPanels=surfaces.deck(terrainGroup,decorations);
 for(let i=0;i<6;i++)line(0,-7.25-i*.5,5.8,.035);
 // Boundary is structural: low parapets/fences backed by recognisable facades.
 for(const s of [-1,1]){
  box(s*20.2,0,0,.4,.65,40.8,concrete);box(0,0,s*20.2,40,.65,.4,concrete);
  for(let t=-19;t<=19;t+=2){box(s*20.2,.65,t,.09,1.05,.09,steel);box(t,.65,s*20.2,.09,1.05,.09,steel);}
  box(s*20.2,1.55,0,.07,.07,40,steel);box(0,1.55,s*20.2,40,.07,.07,steel);
 }
 const facade=(x,z,w,h,d,yaw=0)=>{
  const building=details.building(w,h,d,x>0?'urban':'factory');building.position.set(x,0,z);group.add(building);
  const bounds=new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),new THREE.Vector3(x+w/2,h+.75,z+d/2));bounds.surfaceMaterial='stone';obstacles.push(bounds);cameraBlockers.push(bounds);return building;
 };
 for(const[x,w,h]of [[-15,8,6.6],[-5.8,7,8.2],[5.2,9,5.8],[15.5,7,7.3]]){const building=facade(x,-23,w,h,4);if(x===15.5)ambience.add(building,{amplitude:.012,speed:.65,phase:1.8});}
 for(const x of [-25,25])for(const z of [-12,1,14])facade(x,z,6,5+(z+12)/13,8);
 for(const x of [-12,0,12])facade(x,24,11,6,4);sign('STREET CLASH','FREIGHT QUARTER / LOCAL CIRCUIT',0,4.4,21.9,10,Math.PI);
 // Stage: front stairs have six 20 cm risers and a clear 6 m approach.
 for(const s of [-1,1]){box(s*5.14,0,-13,.28,1.5,6.4,concrete,true);box(s*4,0,-9.95,2,1.35,.18,concrete,true);}box(0,0,-16.14,10.5,1.6,.28,concrete,true);
 for(const x of [-4.6,4.6]){box(x,1.2,-15,.23,3,.23,steel);box(x,1.2,-11,.23,3,.23,steel);}const canopy=surfaces.corrugatedRoof(10.5,5);canopy.position.set(0,4.35,-13);group.add(canopy);
 sign('THE PLATFORM','OPEN MIC / OPEN CHALLENGE',0,2.9,-15.9,5.2);
 for(const x of [-3.7,3.7]){const chest=details.prop('metal_tool_chest'),bounds=new THREE.Box3().setFromObject(chest),size=bounds.getSize(new THREE.Vector3()),scale=.65/size.y;chest.scale.setScalar(scale);chest.position.set(x-(bounds.min.x+bounds.max.x)*scale/2,1.2-bounds.min.y*scale,-14.5-(bounds.min.z+bounds.max.z)*scale/2);group.add(chest);const cover=new THREE.Box3().setFromObject(chest);cover.surfaceMaterial='metal';obstacles.push(cover);cameraBlockers.push(cover);}
 // Side-route landmarks frame the plaza without blocking its middle.
 const freight=(x,z,color)=>{
  box(x,0,z,3.4,2.4,6,color,true);box(x,2.4,z,3.5,.12,6.1,steel);for(let zz=z-2.8;zz<=z+2.8;zz+=.4)for(const side of [-1,1])box(x+side*1.72,.1,zz,.06,2.2,.045,steel);
  for(const side of [-1,1]){const panel=details.part('factory','door_garage_centered_01'),b=new THREE.Box3().setFromObject(panel),size=b.getSize(new THREE.Vector3()),mount=new THREE.Group();panel.scale.set(3.1/size.x,2.2/size.y,1);panel.position.set(-(b.min.x+b.max.x)*panel.scale.x/2,.05-b.min.y*panel.scale.y,-(b.min.z+b.max.z)/2);mount.add(panel);mount.position.set(x,0,z+side*3.04);mount.rotation.y=side<0?Math.PI:0;group.add(mount);}
 };

 freight(-15,-3,trim);freight(15,8,wall);sign('BAY 03','KEEP ROUTE CLEAR',-13.25,1.55,-3,2.7,Math.PI/2);
 // Two small service islands divide the broad side routes into legible pockets.
 for(const[x,z,title]of [[-9,6,'TRANSIT'],[9,-5,'REPAIR']]){
  facade(x,z,2.8,2.6,3.5);
  sign(title,'FREIGHT QUARTER',x,2.08,z+1.83,2.35);
 }
 const cluster=(name,placements)=>{const bounds=new THREE.Box3();for(const[n,x,z,h]of placements)bounds.union(new THREE.Box3().setFromObject(prop(n,x,z,h,{yaw:Math.sin(x*8.3+z*4.1)*.48})));clusters.push({name,bounds});};
 cluster('West freight', [['wooden-crate',-17,-8,1.2],['wooden-crate',-15.4,-8,1],['old-barrel',-17,2,1]]);
 cluster('East repair', [['wooden-crate',16,-7,1.15],['old-barrel',17,-5,1],['machine-fortified',15,-3,1.7]]);
 cluster('South dispatch', [['wooden-crate',-8,16,1.2],['old-barrel',-10,16,1],['wooden-crate',9,16,1.15]]);
 prop('crane',-18,-18,7,{solid:true});prop('structure-yellow-tall',17,-17,6.8);prop('hopper-round',17,16,2);prop('pipe-large-valve',-18,11,1.4);
 // Signal tower is a tall landmark, not an obstacle in the middle of a lane.
 for(const x of [12.5,14])for(const z of [-18.5,-17])box(x,0,z,.12,8,.12,steel);
 for(const y of [1,3,5,7]){box(13.25,y,-17.75,1.8,.12,1.8,steel);const beam=box(13.25,y,-18.5,.1,2,.1,steel);beam.rotation.z=.63;}
 box(13.25,8,-17.75,.12,2,.12,steel);box(13.25,9.4,-17.75,.35,.2,.35,lamp);
 const bench=(x,z,yaw=0,parent=group)=>{const model=details.prop('painted_wooden_bench');model.position.set(x,0,z);model.rotation.y=yaw;model.scale.setScalar(1.35);parent.add(model);};
 // Themed set dressing is outside the combat court; all three share navigation.
 for(const id of Object.keys(THEMES)){themeGroups[id]=new THREE.Group();themeGroups[id].name=id+' landmarks';scene.add(themeGroups[id]);}
 const street=themeGroups.street;bench(-8,11,Math.PI/2,street);bench(8,11,-Math.PI/2,street);
 const booth=(x,z,parent)=>{
  const location=new THREE.Vector3(x,0,z),unit=new THREE.Group();parent.add(unit);parent=unit;x=0;z=0;
  const frame=new THREE.MeshStandardMaterial({color:0x6b8a87,roughness:.5,metalness:.5}),pane=new THREE.MeshPhysicalMaterial({color:0xd9e9df,roughness:.2,metalness:0,transparent:true,opacity:.18,depthWrite:false}),rubber=mat(0x282e2d,{roughness:.72});
  box(x,0,z,1.25,.12,1.25,concrete,false,parent);
  for(const sx of [-1,1])for(const sz of [-1,1])box(x+sx*.55,.12,z+sz*.55,.065,2.25,.065,frame,false,parent);
  for(const sx of [-1,1]){box(x+sx*.55,.14,z,.025,2.15,1.03,pane,false,parent);box(x+sx*.55,.75,z,.065,.045,1.12,frame,false,parent);}
  box(x,.14,z-.55,1.03,2.15,.025,pane,false,parent);box(x,2.36,z,1.24,.12,1.24,frame,false,parent);
  box(x,1,z-.44,.38,.62,.18,steel,false,parent);box(x,1.33,z-.34,.22,.12,.025,glass,false,parent);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++)box(x-.075+col*.075,1.08+row*.052,z-.34,.04,.029,.022,concrete,false,parent);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x-.24,1.34,z-.29),new THREE.Vector3(x-.3,.95,z-.2),new THREE.Vector3(x-.15,.82,z-.22),new THREE.Vector3(x-.08,1.05,z-.31)]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.012,5,false),rubber));box(x-.23,1.3,z-.29,.075,.3,.07,rubber,false,parent);
  sign('CALL','PUBLIC PHONE',x,2.13,z+.59,.85,0,parent);
  unit.position.copy(location);ambience.add(unit,{theme:'street',amplitude:.018,speed:1.05,phase:location.x*.4});
 };booth(-8,-13,street);
 sign('NORTHLINE','COURIERS / PARCELS / REPAIRS',-14,2.1,-20.7,5,0,street);
 const factory=themeGroups.factory;for(const x of [-8,8]){prop('machine-fortified',x,-13,1.4,{solid:false,parent:factory});prop('screen-panel-wide',x,-11,1,{solid:false,parent:factory});}sign('ASSEMBLY','IRONWORKS / SHIFT 09',-14,2.1,-20.7,5,0,factory);
 const foundry=themeGroups.foundry;
 const lava=new THREE.MeshStandardMaterial({color:0x9a3815,emissive:0xf27021,emissiveIntensity:.75,roughness:.8});
 // Molten channels are outside the fenced boundary, never an invisible floor hazard.
 for(const x of [-22,22]){box(x,-.25,0,2,.15,33,lava,false,foundry);box(x,0,0,.3,.2,33,steel,false,foundry);}
 for(const x of [-8,8]){box(x,0,-13,2,2,2,steel,false,foundry);box(x,1.6,-13,2.1,.15,2.1,accent,false,foundry);}sign('CINDER WORKS','COOLING DECK / RESTRICTED',-14,2.1,-20.7,5,0,foundry);
 // The varying set pieces above occupy identical, permanently blocked footprints.
 booth(8,-13,street);
 for(const x of [-8,8]){box(x,0,-13,2.4,.12,4,concrete);const b=new THREE.Box3(new THREE.Vector3(x-1.2,0,-15),new THREE.Vector3(x+1.2,2.5,-11));obstacles.push(b);cameraBlockers.push(b);}
 // Small asymmetric work piles use existing assets and keep lanes/spawns open.
 prop('cone',-12.8,9.4,.5);prop('cone',-13.3,10.2,.5);prop('old-barrel',6.5,16,.9);prop('wooden-crate',-17,11,1.1);
 // Seeded, irregular clutter: the same dressing on every client, away from
 // spawn pads and the clear stage approach. Breakables keep real colliders.
 for(const[n,x,z,h,yaw]of [['wooden-crate',-6.9,2.3,.8,.43],['old-barrel',6.6,10.1,.85,-.2],['wooden-crate',-11.8,-2.5,.7,-.31],['old-barrel',13.3,-9.4,1,.24]])prop(n,x,z,h,{yaw});
 for(const[x,z,yaw]of [[-12.4,-8.4,.35],[18.1,3.8,-.55]]){
  const bounds=new THREE.Box3();for(let i=0;i<2;i++){const sheet=surfaces.corrugatedRoof(1.4-i*.12,1.9-i*.17);sheet.position.set(x+i*.22,.1+i*.075,z-i*.18);sheet.rotation.set(-.04+i*.035,yaw+i*.29,.08-i*.1);group.add(sheet);bounds.union(new THREE.Box3().setFromObject(sheet));}
  bounds.min.y=0;bounds.surfaceMaterial='metal';obstacles.push(bounds);cameraBlockers.push(bounds);
 }
 for(const x of [-8,8]){const light=new THREE.SpotLight(0xffd499,24,11,.65,.7,2);light.position.set(x,4.1,-12.5);light.target.position.set(x,0,-10);scene.add(light,light.target);}
 const batches=batchStatic(group,{cellSize:12});for(const g of Object.values(themeGroups))batchStatic(g,{cellSize:12});
 terrainGroup.updateMatrixWorld(true);
 const lineBatches=new Map();for(const m of decorations){if(!lineBatches.has(m.material))lineBatches.set(m.material,[]);lineBatches.get(m.material).push(m.geometry.clone().applyMatrix4(m.matrixWorld));terrainGroup.remove(m);m.geometry.dispose();}decorations.length=0;
 for(const[material,parts]of lineBatches){const lineGeometry=mergeGeometries(parts);for(const part of parts)part.dispose();const markings=new THREE.Mesh(lineGeometry,material);terrainGroup.add(markings);decorations.push(markings);}terrainGroup.updateMatrixWorld(true);
 const arena=new ArenaCollision({halfSize:20,obstacles});
 arena.ambience=ambience;
 arena.terrain=new DeformableGround(terrainGroup,floor,decorations);arena.groundHeight=(x,z)=>arena.terrain.heightAt(x,z);
 arena.cameraBlockers=cameraBlockers;arena.group=group;arena.dynamicGroup=dynamicGroup;arena.breakables=breakables;arena.clusters=clusters;arena.importedPlacements=importedPlacements;arena.surfaceAt=(x,z)=>Math.abs(x)<4&&z> -3&&z<5?'metal':'stone';arena.surfaceStats={steelPanels,rivets:64};arena.details=details;arena.floorMaterial=floorMaterial;arena.assetCount=models.size+5;arena.staticBatches=batches;arena.combatHalfSize=6.5;
 arena.spawnPoints=[[-12,-11],[12,-11],[-11,11],[11,3],[-4,14],[4,-4],[0,-13],[0,6]];
 arena.syncBreakables=batchBreakables(breakables,dynamicGroup);arena.syncBreakables();
 // Prevent grounded movement climbing a stage's retaining edge in one frame.
 const constrain=arena.constrain.bind(arena);arena.constrain=(start,end,radius)=>{const oldY=arena.groundHeight(start.x,start.z);constrain(start,end,radius);if(end.y<=oldY+.08&&arena.groundHeight(end.x,end.z)>oldY+.28){end.x=start.x;end.z=start.z;}return end;};
 arena.setTheme=id=>{
  const theme=THEMES[id]||THEMES.street;currentTheme=theme;arena.theme=THEMES[id]?id:'street';arena.name=theme.name;
  brick.color.set(theme.wall);wall.color.set(theme.wall);trim.color.set(theme.trim);accent.color.set(theme.accent);
  arena.terrain.floorTint.set(theme.floor);arena.terrain.courtTint.set(theme.court);arena.terrain.refresh(true);
  for(const[key,g]of Object.entries(themeGroups))g.visible=key===arena.theme;
  ambience.setTheme(arena.theme);
  scene.background.set(theme.sky);scene.fog.color.set(theme.fog);scene.fog.near=35;scene.fog.far=80;
  const card=document.querySelector('.arena-card');if(card){card.querySelector('strong').textContent=theme.name.toUpperCase();card.querySelector('small').textContent=theme.subtitle+' / 40 × 40 M';}
  const location=document.querySelector('#matchHud>small');if(location)location.textContent=theme.name.toUpperCase()+' · P PAUSE';
 };arena.setTheme('street');return arena;
}
