import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ArenaCollision } from '../physics/collision.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ART, paintedTexture } from './ArtDirection.js';
import { DeformableGround } from './DeformableGround.js';

const MODEL_NAMES = ['box-large', 'box-long', 'box-small', 'machine', 'machine-fortified', 'machine-window',
  'hopper-round', 'conveyor-bars-stripe-fence', 'robot-arm-a', 'pipe-large-long', 'pipe-large-curve', 'pipe-large-valve',
  'screen-panel-wide', 'structure-yellow-tall', 'door-wide-closed', 'catwalk-straight', 'warning-orange', 'cone', 'crane'];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(title, subtitle, bg = '#353c3c', fg = '#e0d6ba') {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e7b76a'; g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#b2c9ba'; g.fillRect(0, 0, 22, h - 14);
    g.fillStyle = fg; g.textAlign = 'center'; g.font = '900 106px Arial'; g.fillText(title, w / 2, 130);
    g.fillStyle = '#d6e5d6'; g.font = 'bold 32px Arial'; g.fillText(subtitle, w / 2, 204);
  });
}

// Batch static meshes by material after placing props and measuring colliders.
export function batchStatic(group, { cellSize = 0 } = {}) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    let cell='';if(cellSize){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);cell=':'+Math.floor(center.x/cellSize)+':'+Math.floor(center.z/cellSize);}
    const key = mesh.material.uuid + ':' + mesh.castShadow + cell;
    if (!batches.has(key)) batches.set(key, { material: mesh.material, shadows: mesh.castShadow, geometries: [] });
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).toNonIndexed();
    // Imported GLBs can carry tangents/UV2/color; this shared material needs only these.
    for (const attr of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(attr)) geometry.deleteAttribute(attr);
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    batches.get(key).geometries.push(geometry);
  });
  group.clear();
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries);
    if (!geometry) throw new Error('Warehouse static mesh batching failed');
    for (const source of batch.geometries) source.dispose();
    const mesh = new THREE.Mesh(geometry, batch.material);
    mesh.castShadow = batch.shadows; mesh.receiveShadow = true; group.add(mesh);
  }
  return batches.size;
}


// Keep independent health/transforms while rendering repeated crate/barrel parts
// together. Hidden source meshes retain the original model transforms for bounds.
export function batchBreakables(props,group){
  const batches=new Map();
  for(const prop of props){prop.root.updateMatrixWorld(true);prop.root.traverse(mesh=>{
    if(!mesh.isMesh||Array.isArray(mesh.material))return;
    const key=mesh.geometry.uuid+':'+(mesh.material.userData.batchSource||mesh.material.uuid);
    if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,material:mesh.material.clone(),sources:[]});
    batches.get(key).sources.push({prop,mesh});mesh.visible=false;
  });}
  for(const batch of batches.values()){
    batch.mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.sources.length);
    batch.mesh.castShadow=true;batch.mesh.receiveShadow=true;batch.mesh.frustumCulled=false;batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(batch.mesh);
  }
  const zero=new THREE.Matrix4().makeScale(0,0,0),color=new THREE.Color(),states=new Map();
  return()=>{
    let changed=false;for(const p of props){const old=states.get(p);if(!old||old.alive!==p.alive||old.hp!==p.hp||!old.position.equals(p.root.position)||!old.rotation.equals(p.root.quaternion)||!old.scale.equals(p.root.scale)){changed=true;states.set(p,{alive:p.alive,hp:p.hp,position:p.root.position.clone(),rotation:p.root.quaternion.clone(),scale:p.root.scale.clone()});}}
    if(!changed)return;
    for(const prop of props)prop.root.updateMatrixWorld(true);
    for(const batch of batches.values()){
      batch.sources.forEach(({prop,mesh},i)=>{batch.mesh.setMatrixAt(i,prop.alive?mesh.matrixWorld:zero);color.setRGB(1,1,1).multiplyScalar(.7+.3*prop.hp/prop.maxHp);batch.mesh.setColorAt(i,color);});
      batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.instanceColor.needsUpdate=true;
    }
  };
}

export async function createWarehouseArena(scene, onProgress = () => {}) {
  const loader = new GLTFLoader();
  let done = 0;
  const [loaded, imported] = await Promise.all([
    Promise.all(MODEL_NAMES.map(async name => {
      const asset = await loader.loadAsync(`./assets/environment/factory/${name}.glb`).catch(() => { throw new Error(`Could not load warehouse model: ${name}.glb`); });
      onProgress(++done, MODEL_NAMES.length);
      return [name, asset.scene];
    })),
    Promise.all(['old-barrel', 'wooden-crate'].map(async name => [name, (await loader.loadAsync(`./assets/environment/${name}.glb`)).scene])),
  ]);
  const models = new Map(loaded), group = new THREE.Group(); group.name = 'Ironworks - Dock 09'; scene.add(group);
  const obstacles = [], cameraBlockers = [], breakables=[];
  const terrainGroup=new THREE.Group();terrainGroup.name='Deformable combat deck';scene.add(terrainGroup);
  const groundDecorations=[];
  const dynamicGroup=new THREE.Group();dynamicGroup.name='Breakable arena props';scene.add(dynamicGroup);
  function registerBreakable(root,bounds,name,material='wood'){
    dynamicGroup.add(root);const copies=new Map(),materials=[];
    root.traverse(o=>{if(!o.isMesh)return;const copy=m=>{if(!copies.has(m)){const cloned=m.clone();cloned.userData.batchSource=m.uuid;copies.set(m,cloned);materials.push({material:cloned,base:cloned.color.clone()});}return copies.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
    const maxHp=material==='metal'?64:name==='old-barrel'?44:36;
    breakables.push({id:breakables.length,name,material,root,bounds,initialBounds:bounds.clone(),initialPosition:root.position.clone(),materials,hp:maxHp,maxHp,alive:true,fallSpeed:0});
    root.userData.breakable=true;obstacles.push(bounds);cameraBlockers.push(bounds);
  }
  let palette;
  models.values().next().value.traverse(o => { if (o.isMesh && o.material.map) palette = o.material.map; });
  const assetMaterial = new THREE.MeshStandardMaterial({ map: paintedTexture(palette, true), roughness: 0.88, metalness: 0.02 });
  for (const model of models.values()) model.traverse(o => { if (o.isMesh) o.material = assetMaterial; });
  const paintedProps=new Map();
  for (const [name, model] of imported) {
    model.traverse(o=>{if(!o.isMesh)return;const paint=original=>{
      if(!paintedProps.has(original)){
        const material=original.clone();material.roughness=Math.max(.78,material.roughness||0);material.metalness=Math.min(.2,material.metalness||0);
        paintedProps.set(original,material);
      }
      return paintedProps.get(original);};
      o.material=Array.isArray(o.material)?o.material.map(paint):paint(o.material);
    });models.set(name,model);
  }

  const metal = new THREE.MeshStandardMaterial({ color: ART.ink, metalness: 0.03, roughness: 0.8 });
  const concrete = new THREE.MeshStandardMaterial({ color: ART.concrete, roughness: 0.94 });
  const orange = new THREE.MeshStandardMaterial({ color: ART.amber, metalness: 0.02, roughness: 0.85 });
  const paint = new THREE.MeshBasicMaterial({ color: ART.paint });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe9ad });
  const glass = new THREE.MeshStandardMaterial({ color: 0x717c7d, emissive: 0xb1b5a7, emissiveIntensity: 0.08, roughness: 0.75 });
  // Narrow folded steel ribs for shipping containers.
  const corrugation = canvasTexture(256,256,g=>{
    g.fillStyle='#b6b3a7';g.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=16){g.fillStyle='#7b7f78';g.fillRect(x,0,3,256);g.fillStyle='#c8c3b4';g.fillRect(x+3,0,3,256);}
  });
  corrugation.wrapS=corrugation.wrapT=THREE.RepeatWrapping;corrugation.repeat.set(2,1);
  const cladding=new THREE.MeshStandardMaterial({map:corrugation,color:ART.wall,roughness:.9,metalness:.02});
  const wallAccent=new THREE.MeshStandardMaterial({color:0x777c73,roughness:.9});

  function box(x, y, z, w, h, d, material, { solid = false, camera = false, shadow = true } = {}) {
    const geometry=Math.min(w,d)>.25&&h>.4
      ?new RoundedBoxGeometry(w,h,d,1,Math.min(.025,w*.04,h*.04,d*.04)):new THREE.BoxGeometry(w,h,d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y + h / 2, z); mesh.castShadow = shadow; group.add(mesh);
    const bounds = new THREE.Box3(new THREE.Vector3(x - w / 2, y, z - d / 2), new THREE.Vector3(x + w / 2, y + h, z + d / 2));
    bounds.surfaceMaterial=material===concrete||material===wallAccent?'stone':material.map===corrugation||material.metalness>0?'metal':'stone';
    if (solid) obstacles.push(bounds);
    if (solid || camera) cameraBlockers.push(bounds);
    return mesh;
  }
  function addModel(name, x, z, { y = 0, scale = 1, yaw = 0, solid = false } = {}) {
    const model = models.get(name).clone(true); model.scale.setScalar(scale); model.rotation.y = yaw;
    const b = new THREE.Box3().setFromObject(model);
    model.position.set(x - (b.min.x + b.max.x) / 2, y - b.min.y, z - (b.min.z + b.max.z) / 2);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(model);
    if (solid) { const bounds = new THREE.Box3().setFromObject(model); obstacles.push(bounds); cameraBlockers.push(bounds); }
    return model;
  }
  function sign(title, subtitle, x, y, z, width, yaw = 0) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: signTexture(title, subtitle) }));
    mesh.position.set(x, y, z); mesh.rotation.y = yaw; group.add(mesh);
    return mesh;
  }
  function stripe(x,z,w,d,material=paint){
    const geometry=new THREE.PlaneGeometry(w,d,Math.max(1,Math.ceil(w/.12)),Math.max(1,Math.ceil(d/.12))).rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,.018,z);terrainGroup.add(mesh);groundDecorations.push(mesh);return mesh;
  }

  // 18 m playable deck in a larger loading yard. The central 12 m court is
  // deliberately clear; storage and machinery form recognizable edge clusters.
  const textures=new THREE.TextureLoader();
  const [floorPaint,floorNormal,brickMap]=await Promise.all([
    textures.loadAsync('./assets/textures/concrete-floor-diffuse.jpg'),
    textures.loadAsync('./assets/textures/concrete-floor-normal.jpg'),
    textures.loadAsync('./assets/textures/brick-wall-diffuse.jpg'),
  ]);
  for(const map of [floorPaint,floorNormal]){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(5,5);map.anisotropy=4;}
  // Remove the source concrete's strong brown cast while preserving its detail.
  const neutralCanvas=document.createElement('canvas');neutralCanvas.width=neutralCanvas.height=1024;
  const neutralContext=neutralCanvas.getContext('2d');neutralContext.filter='saturate(12%)';neutralContext.drawImage(floorPaint.image,0,0,1024,1024);
  floorPaint.image=neutralCanvas;floorPaint.needsUpdate=true;
  floorPaint.colorSpace=brickMap.colorSpace=THREE.SRGBColorSpace;
  brickMap.wrapS=brickMap.wrapT=THREE.RepeatWrapping;brickMap.repeat.set(4,2);brickMap.anisotropy=4;
  const brick=new THREE.MeshStandardMaterial({map:brickMap,color:0xa99d8a,roughness:.92});
  const barrierMap=floorPaint.clone();barrierMap.repeat.set(6,1);barrierMap.needsUpdate=true;
  concrete.map=barrierMap;concrete.needsUpdate=true;
  const apronMaterial=new THREE.MeshStandardMaterial({map:floorPaint,color:ART.apron,roughness:.95});
  const floorMaterial=new THREE.MeshStandardMaterial({map:floorPaint,normalMap:floorNormal,normalScale:new THREE.Vector2(.38,.38),color:ART.floor,roughness:.91,metalness:0});
  const courtMaterial=floorMaterial.clone();courtMaterial.color.set(ART.court);
  // Four apron strips leave the entire combat deck open below its surface.
  // A solid apron underneath would fill every crater at y=-.04.
  for(const z of [-15.025,15.025])box(0,-.18,z,42,.14,11.95,apronMaterial,{shadow:false});
  for(const x of [-15.025,15.025])box(x,-.18,0,11.95,.14,18.1,apronMaterial,{shadow:false});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18.1,18.1,144,144).rotateX(-Math.PI/2),floorMaterial);
  floor.receiveShadow=true;terrainGroup.add(floor);
  // Court color is painted into the same heightfield, avoiding overlapping
  // surfaces that would flicker or disagree with foot/projectile collision.
  floor.userData.courtColor=courtMaterial.color.clone();courtMaterial.dispose();
  const courtPaint = new THREE.MeshBasicMaterial({ color: ART.paint });
  for (const x of [-6.08, 6.08]) stripe(x, 0, 0.12, 12.3, courtPaint);
  for (const z of [-6.08, 6.08]) stripe(0, z, 12.3, 0.12, courtPaint);
  // Corner registration marks read as an arena rather than a parking aisle.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    stripe(sx * 5.45, sz * 5.8, 0.85, 0.07, courtPaint);
    stripe(sx * 5.8, sz * 5.45, 0.07, 0.85, courtPaint);
  }
  const center = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.32, 48).rotateX(-Math.PI / 2), courtPaint);
  center.position.y = 0.013; terrainGroup.add(center);groundDecorations.push(center);
  const label = sign('09', 'IRONWORKS / COMBAT DECK', 0, 0.021, -5.0, 2.15); label.rotation.x = -Math.PI / 2;
  label.geometry.dispose();label.geometry=new THREE.PlaneGeometry(2.15,2.15/4,24,8);terrainGroup.add(label);groundDecorations.push(label);

  // Low continuous boundaries preserve an unobstructed view over the rim.
  // Character containment remains the existing ArenaCollision square clamp.
  for (const [x, z, w, d] of [[-9.2, 0, 0.4, 18.8], [9.2, 0, 0.4, 18.8], [0, -9.2, 18, 0.4], [0, 9.2, 18, 0.4]]) {
    box(x, -0.02, z, w, 0.82, d, concrete, { camera: true });
    box(x, 0.8, z, w + 0.04, 0.09, d + 0.04, orange, { shadow: false });
  }
  for (const side of [-1, 1]) for (const t of [-8.6, -4.3, 0, 4.3, 8.6]) {
    box(side * 9.2, 0.8, t, 0.16, 0.47, 0.16, metal);
    box(t, 0.8, side * 9.2, 0.16, 0.47, 0.16, metal);
  }
  for (const side of [-1, 1]) {
    box(side * 9.2, 1.2, 0, 0.09, 0.09, 18.6, metal);
    box(0, 1.2, side * 9.2, 18, 0.09, 0.09, metal);
    stripe(side * 8.62, 0, 0.11, 17.2);
    stripe(0, side * 8.62, 17.2, 0.11);
  }

  // Graphic safety chevrons stay on the rim; the fighting court stays quiet.
  for(const side of [-1,1])for(const z of [-3.8,3.8])for(let i=0;i<4;i++){
    const mark=stripe(side*7.6+(i-1.5)*.23,z,.12,.65);mark.rotation.y=-Math.PI/4;
  }

  // Fit supplied props by height so every cluster has deliberate proportions.
  const importedPlacements = [], clusters = [];
  function prop(name, x, z, height, options = {}) {
    const bounds = new THREE.Box3().setFromObject(models.get(name));
    const model = addModel(name, x, z, { ...options, scale: height / (bounds.max.y - bounds.min.y) });
    const placedBounds=new THREE.Box3().setFromObject(model);
    if(name==='old-barrel'||name==='wooden-crate')importedPlacements.push({name,bounds:placedBounds});
    if(['wooden-crate','old-barrel','box-small'].includes(name))registerBreakable(model,placedBounds,name);
    return model;
  }
  function storageCluster(name, placements) {
    const bounds = new THREE.Box3();
    for(const [asset,x,z,height,options]of placements){
      const model=prop(asset,x,z,height,options),placedBounds=new THREE.Box3().setFromObject(model);bounds.union(placedBounds);
      if(!model.userData.breakable){placedBounds.surfaceMaterial='metal';obstacles.push(placedBounds);cameraBlockers.push(placedBounds);}
    }
    clusters.push({name,bounds});
  }
  storageCluster('Northwest freight stack', [
    ['wooden-crate', -7.45, -7.3, 1.28], ['wooden-crate', -7.45, -7.3, 0.72, { y: 1.28, yaw: 0.12 }],
    ['wooden-crate', -6.3, -7.6, 0.9, { yaw: -0.1 }],
  ]);
  storageCluster('Northeast service station', [
    ['machine-fortified', 7.4, -6.95, 1.65, { yaw: -Math.PI / 2 }],
    ['old-barrel', 6.4, -7.75, 0.95],
  ]);
  storageCluster('Southwest cargo corner', [
    ['wooden-crate', -7.45, 6.75, 1.1], ['box-small', -7.45, 6.75, 0.65, { y: 1.1 }],
    ['old-barrel', -6.35, 7.6, 0.95, { yaw: 0.2 }],
  ]);
  storageCluster('Southeast dispatch stack', [
    ['wooden-crate', 7.25, 7.1, 1.0, { yaw: Math.PI / 2 }],
    ['wooden-crate', 7.55, 7.2, 0.8, { y: 1.0 }],
    ['old-barrel', 6.2, 7.85, 0.9],
  ]);
  // Side landmarks sit against the edge, outside the marked combat court.
  const teal = new THREE.MeshStandardMaterial({ map: corrugation, color: ART.teal, roughness: 0.9, metalness: 0.02 });
  const rust = new THREE.MeshStandardMaterial({ map: corrugation, color: ART.coral, roughness: 0.9, metalness: 0.02 });
  box(-8.15, 0, 0, 1.2, 2.15, 4.2, rust, { solid: true });
  box(-8.15, 2.15, 0, 1.3, 0.1, 4.3, metal);
  sign('FREIGHT', 'BAY A / STORAGE', -7.53, 1.55, 0, 2.4, Math.PI / 2);
  storageCluster('East machinery bay', [
    ['hopper-round', 8.0, 0.1, 1.7], ['screen-panel-wide', 7.6, -1.55, 1.05, { yaw: -Math.PI / 2 }],
  ]);
  for (const [x, z] of [[-6.3, -8.45], [6.3, 8.45]]) prop('cone', x, z, 0.5);

  // Original brick service facades outside the combat boundary.
  // Repeated windows and vertical services give the camera architectural scale.
  for(const x of [-12,12]){
    box(x,0,-12.4,6.4,7.8,2.2,brick,{camera:true});
    box(x,0,-11.23,6.5,.65,.16,concrete);
    box(x,7.8,-12.4,6.7,.2,2.5,metal);
    for(const dx of [-1.85,0,1.85])for(const y of [3.7,6]){
      box(x+dx,y,-11.22,1.22,1.4,.12,metal);
      box(x+dx,y+.1,-11.13,1.04,1.18,.04,glass);
      box(x+dx,y+.67,-11.08,1.12,.045,.04,metal);
    }
    prop('pipe-large-valve',x+2.7,-10.98,1.5,{y:1.2});
    sign('SERVICE', 'AUTHORIZED PERSONNEL ONLY',x,1.9,-11.1,2.7);
  }

  // Steel drums sit in the service clusters, outside the clear combat square.
  const drumMaterial=new THREE.MeshStandardMaterial({map:floorPaint,color:0x535f5b,roughness:.84,metalness:.34});
  const drumRim=new THREE.MeshStandardMaterial({color:0x434a48,roughness:.65,metalness:.55});
  const drumGeometry=new THREE.CylinderGeometry(.3,.3,.88,24),drumBandGeometry=new THREE.CylinderGeometry(.313,.313,.035,24);
  for(const [x,z] of [[-8.1,-4.5],[-8.1,4.3],[7.9,4.6]]){
    const drumRoot=new THREE.Group();
    const drum=new THREE.Mesh(drumGeometry,drumMaterial);drum.position.set(x,.44,z);drum.castShadow=true;drumRoot.add(drum);
    for(const y of [.05,.3,.62,.86]){const band=new THREE.Mesh(drumBandGeometry,drumRim);band.position.set(x,y,z);drumRoot.add(band);}
    const bounds=new THREE.Box3(new THREE.Vector3(x-.32,0,z-.32),new THREE.Vector3(x+.32,.9,z+.32));registerBreakable(drumRoot,bounds,'steel-drum','metal');
  }

  // Backdrop: stacked containers, loading bays and gantries continue beyond
  // the playable barriers. They create depth without adding combat obstacles.
  function container(x, z, width, depth, material, y = 0) {
    box(x, y, z, width, 2.65, depth, material, { camera: true });
    for (const dx of [-width / 2 + 0.12, width / 2 - 0.12]) box(x + dx, y, z, 0.15, 2.7, depth + 0.08, metal);
    box(x, y + 2.65, z, width + 0.28, 0.18, depth + 0.24, metal);
  }
  container(-6.4, -15.0, 6, 2.5, teal);
  container(-6.4, -15.0, 6, 2.5, rust, 2.78);
  container(6.2, 15.0, 6.4, 2.5, rust);
  container(-15.0, 3.0, 2.5, 7, rust);
  container(15.0, -2.7, 2.5, 7, teal);
  box(0, 0, -18.3, 32, 7.1, 0.6, brick, { camera: true });
  box(0, 6.9, -18.3, 32.4, 0.3, 0.9, metal);
  for (const x of [-11, 0, 11]) {
    prop('door-wide-closed', x, -17.91, 3.5, { yaw: Math.PI });
    for (const dx of [-2.15, 2.15]) box(x + dx, 0, -17.7, 0.22, 4.0, 0.3, orange);
    box(x, 3.8, -18.02, 8.6, 2.8, 0.08, wallAccent, { shadow: false });
    sign(x === 0 ? 'DOCK 09' : x < 0 ? 'BAY 08' : 'BAY 10', 'IRONWORKS / FREIGHT TERMINAL', x, 5.0, -17.92, 4.2);
    box(x, 6.0, -17.92, 4.5, 0.75, 0.08, glass, { shadow: false });
  }
  box(0, 0, 18.1, 31, 5.6, 0.5, brick, { camera: true });
  sign('IRONWORKS', 'SHIFT ENDS. THE FIGHT BEGINS.', 0, 3.8, 17.78, 7.5, Math.PI);
  for (const side of [-1, 1]) {
    box(side * 18.2, 0, 0, 0.5, 5.6, 30, brick, { camera: true });
    for (const z of [-11.8, 0, 11.8]) {
      box(side * 10.5, 0, z, 0.55, 5.4, 0.6, metal);
      box(side * 10.5, 0, z, 0.7, 1.1, 0.75, orange);
    }
    for (let z = -8; z <= 8; z += 4) prop('catwalk-straight', side * 16.8, z, 0.25, { y: 3.9, yaw: Math.PI / 2 });
  }
  for (const z of [-11.8, 11.8]) {
    box(0, 5.1, z, 21.4, 0.5, 0.6, orange);
    box(0, 5.55, z, 21.4, 0.1, 0.2, metal);
    for (const x of [-7, 0, 7]) {
      box(x, 4.94, z, 2.1, 0.12, 0.35, metal);
      box(x, 4.88, z, 1.9, 0.04, 0.3, lamp, { shadow: false });
    }
  }
  prop('crane', -11.3, -11.7, 5.7, { yaw: Math.PI / 2 });
  prop('robot-arm-a', 11.7, 9.7, 2.8, { y: 0.6, yaw: -Math.PI / 2 });
  for (const side of [-1, 1]) for (const z of [-5, 1]) prop('pipe-large-long', side * 17.5, z, 0.45, { y: 4.8 });
  const light = new THREE.PointLight(0xffd7a3, 3, 18, 2); light.position.set(0, 5.5, -2); scene.add(light);
  const fill = new THREE.PointLight(0xc1ccd5, 1.2, 18, 2); fill.position.set(-3, 4.5, 4); scene.add(fill);

  const batches = batchStatic(group);
  const arena = new ArenaCollision({ halfSize: 9, obstacles });
  terrainGroup.updateMatrixWorld(true);
  // Keep the painted lines/sign as a few mutable batches rather than one draw
  // per stripe. These vertices deform with the deck but never enter static bins.
  const paintBatches=new Map();
  for(const mesh of groundDecorations){
    if(!paintBatches.has(mesh.material.uuid))paintBatches.set(mesh.material.uuid,{material:mesh.material,parts:[]});
    paintBatches.get(mesh.material.uuid).parts.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    terrainGroup.remove(mesh);mesh.geometry.dispose();
  }
  groundDecorations.length=0;
  for(const batch of paintBatches.values()){
    const geometry=mergeGeometries(batch.parts);for(const part of batch.parts)part.dispose();
    const mesh=new THREE.Mesh(geometry,batch.material);terrainGroup.add(mesh);groundDecorations.push(mesh);
  }
  terrainGroup.updateMatrixWorld(true);
  arena.terrain=new DeformableGround(terrainGroup,floor,groundDecorations);
  arena.groundHeight=(x,z)=>arena.terrain.heightAt(x,z);
  arena.cameraBlockers = cameraBlockers; arena.name = 'Ironworks · Dock 09';
  arena.assetCount = models.size; arena.staticBatches = batches; arena.group = group;
  arena.importedPlacements = importedPlacements;
  arena.clusters = clusters; arena.combatHalfSize = 6;
  arena.breakables=breakables;arena.dynamicGroup=dynamicGroup;
  arena.syncBreakables=batchBreakables(breakables,dynamicGroup);arena.syncBreakables();
  return arena;
}
