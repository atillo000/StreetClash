import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ArenaCollision } from '../physics/collision.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ART, paintedTexture } from './ArtDirection.js';

const MODEL_NAMES = ['box-large', 'box-long', 'box-small', 'machine', 'machine-fortified', 'machine-window',
  'hopper-round', 'conveyor-bars-stripe-fence', 'robot-arm-a', 'pipe-large-long', 'pipe-large-curve', 'pipe-large-valve',
  'screen-panel-wide', 'structure-yellow-tall', 'door-wide-closed', 'catwalk-straight', 'warning-orange', 'cone', 'crane'];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(title, subtitle, bg = '#648c94', fg = '#fff1c9') {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e7b76a'; g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#b2c9ba'; g.fillRect(0, 0, 22, h - 14);
    g.fillStyle = fg; g.textAlign = 'center'; g.font = '900 106px Arial'; g.fillText(title, w / 2, 130);
    g.fillStyle = '#d6e5d6'; g.font = 'bold 32px Arial'; g.fillText(subtitle, w / 2, 204);
  });
}

// Batch static meshes by material after placing props and measuring colliders.
function batchStatic(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const key = mesh.material.uuid + ':' + mesh.castShadow;
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
  const obstacles = [], cameraBlockers = [];
  let palette;
  models.values().next().value.traverse(o => { if (o.isMesh && o.material.map) palette = o.material.map; });
  const assetMaterial = new THREE.MeshStandardMaterial({ map: paintedTexture(palette, true), roughness: 0.88, metalness: 0.02 });
  for (const model of models.values()) model.traverse(o => { if (o.isMesh) o.material = assetMaterial; });
  const paintedProps=new Map();
  for (const [name, model] of imported) {
    model.traverse(o=>{if(!o.isMesh)return;const paint=original=>{
      if(!paintedProps.has(original))paintedProps.set(original,new THREE.MeshStandardMaterial({
        map:paintedTexture(original.map),color:original.map?0xffffff:ART.amber,roughness:.92,metalness:.02}));
      return paintedProps.get(original);};
      o.material=Array.isArray(o.material)?o.material.map(paint):paint(o.material);
    });models.set(name,model);
  }

  const metal = new THREE.MeshStandardMaterial({ color: ART.ink, metalness: 0.03, roughness: 0.8 });
  const concrete = new THREE.MeshStandardMaterial({ color: ART.concrete, roughness: 0.94 });
  const orange = new THREE.MeshStandardMaterial({ color: ART.amber, metalness: 0.02, roughness: 0.85 });
  const paint = new THREE.MeshBasicMaterial({ color: ART.paint });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe9ad });
  const glass = new THREE.MeshStandardMaterial({ color: 0xc4e3d7, emissive: 0x99cbbc, emissiveIntensity: 0.18, roughness: 0.75 });
  // Broad painted ribs instead of dense metallic corrugation and grime.
  const corrugation = canvasTexture(256,256,g=>{
    g.fillStyle='#eef0df';g.fillRect(0,0,256,256);
    for(let x=0;x<256;x+=64){g.fillStyle='#c9d8cd';g.fillRect(x,0,3,256);g.fillStyle='#f6f5e5';g.fillRect(x+3,0,3,256);}
  });
  corrugation.wrapS=corrugation.wrapT=THREE.RepeatWrapping;corrugation.repeat.set(2,1);
  const cladding=new THREE.MeshStandardMaterial({map:corrugation,color:ART.wall,roughness:.9,metalness:.02});
  const wallAccent=new THREE.MeshStandardMaterial({color:0x9ebbb7,roughness:.9});

  function box(x, y, z, w, h, d, material, { solid = false, camera = false, shadow = true } = {}) {
    const geometry=Math.min(w,d)>.25&&h>.4
      ?new RoundedBoxGeometry(w,h,d,1,Math.min(.12,w*.12,h*.12,d*.12)):new THREE.BoxGeometry(w,h,d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y + h / 2, z); mesh.castShadow = shadow; group.add(mesh);
    const bounds = new THREE.Box3(new THREE.Vector3(x - w / 2, y, z - d / 2), new THREE.Vector3(x + w / 2, y + h, z + d / 2));
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
  function stripe(x, z, w, d, material = paint) { return box(x, 0.012, z, w, 0.006, d, material, { shadow: false }); }

  // 18 m playable deck in a larger loading yard. The central 12 m court is
  // deliberately clear; storage and machinery form recognizable edge clusters.
  // Original low-frequency painted slab texture. No photographic albedo or normal map.
  const floorPaint=canvasTexture(384,384,g=>{
    g.fillStyle='#f0f1e7';g.fillRect(0,0,384,384);
    g.fillStyle='#e7ece4';g.fillRect(0,0,192,192);g.fillRect(192,192,192,192);
    g.strokeStyle='#dce4d9';g.lineWidth=2;
    for(const n of [0,192,384]){g.beginPath();g.moveTo(n,0);g.lineTo(n,384);g.stroke();g.beginPath();g.moveTo(0,n);g.lineTo(384,n);g.stroke();}
  });
  floorPaint.wrapS=floorPaint.wrapT=THREE.RepeatWrapping;floorPaint.repeat.set(3,3);floorPaint.anisotropy=4;
  const apronMaterial=new THREE.MeshStandardMaterial({color:ART.apron,roughness:.95});
  const floorMaterial=new THREE.MeshStandardMaterial({map:floorPaint,color:ART.floor,roughness:.92,metalness:0});
  const courtMaterial=floorMaterial.clone();courtMaterial.color.set(ART.court);
  box(0, -0.18, 0, 42, 0.14, 42, apronMaterial, { shadow: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18.1, 18.1).rotateX(-Math.PI / 2), floorMaterial);
  floor.receiveShadow = true; group.add(floor);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), courtMaterial);
  court.position.y = 0.004; court.receiveShadow = true; group.add(court);
  const courtPaint = new THREE.MeshBasicMaterial({ color: ART.paint });
  for (const x of [-6.08, 6.08]) stripe(x, 0, 0.12, 12.3, courtPaint);
  for (const z of [-6.08, 6.08]) stripe(0, z, 12.3, 0.12, courtPaint);
  // Corner registration marks read as an arena rather than a parking aisle.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    stripe(sx * 5.45, sz * 5.8, 0.85, 0.07, courtPaint);
    stripe(sx * 5.8, sz * 5.45, 0.07, 0.85, courtPaint);
  }
  const center = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.32, 48).rotateX(-Math.PI / 2), courtPaint);
  center.position.y = 0.013; group.add(center);
  const label = sign('09', 'IRONWORKS / COMBAT DECK', 0, 0.021, -5.0, 2.15); label.rotation.x = -Math.PI / 2;

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
    if (name === 'old-barrel' || name === 'wooden-crate') importedPlacements.push({ name, bounds: new THREE.Box3().setFromObject(model) });
    return model;
  }
  function storageCluster(name, placements) {
    const bounds = new THREE.Box3();
    for (const [asset, x, z, height, options] of placements) bounds.union(new THREE.Box3().setFromObject(prop(asset, x, z, height, options)));
    obstacles.push(bounds); cameraBlockers.push(bounds); clusters.push({ name, bounds });
  }
  storageCluster('Northwest freight stack', [
    ['box-large', -7.45, -7.3, 1.28], ['box-small', -7.45, -7.3, 0.72, { y: 1.28, yaw: 0.12 }],
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
    ['box-long', 7.25, 7.1, 1.0, { yaw: Math.PI / 2 }],
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
  box(0, 0, -18.3, 32, 7.1, 0.6, cladding, { camera: true });
  box(0, 6.9, -18.3, 32.4, 0.3, 0.9, metal);
  for (const x of [-11, 0, 11]) {
    prop('door-wide-closed', x, -17.91, 3.5, { yaw: Math.PI });
    for (const dx of [-2.15, 2.15]) box(x + dx, 0, -17.7, 0.22, 4.0, 0.3, orange);
    box(x, 3.8, -18.02, 8.6, 2.8, 0.08, wallAccent, { shadow: false });
    sign(x === 0 ? 'DOCK 09' : x < 0 ? 'BAY 08' : 'BAY 10', 'IRONWORKS / FREIGHT TERMINAL', x, 5.0, -17.92, 4.2);
    box(x, 6.0, -17.92, 4.5, 0.75, 0.08, glass, { shadow: false });
  }
  box(0, 0, 18.1, 31, 5.6, 0.5, cladding, { camera: true });
  sign('IRONWORKS', 'SHIFT ENDS. THE FIGHT BEGINS.', 0, 3.8, 17.78, 7.5, Math.PI);
  for (const side of [-1, 1]) {
    box(side * 18.2, 0, 0, 0.5, 5.6, 30, cladding, { camera: true });
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
  const fill = new THREE.PointLight(0xb6e6e2, 2, 18, 2); fill.position.set(-3, 4.5, 4); scene.add(fill);

  const batches = batchStatic(group);
  const arena = new ArenaCollision({ halfSize: 9, obstacles });
  arena.cameraBlockers = cameraBlockers; arena.name = 'Ironworks · Dock 09';
  arena.assetCount = models.size; arena.staticBatches = batches; arena.group = group;
  arena.importedPlacements = importedPlacements;
  arena.clusters = clusters; arena.combatHalfSize = 6;
  return arena;
}
