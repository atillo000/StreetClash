import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ArenaCollision } from '../physics/collision.js';

const MODEL_NAMES = ['box-large', 'box-long', 'box-small', 'machine', 'machine-fortified', 'machine-window',
  'hopper-round', 'conveyor-bars-stripe-fence', 'robot-arm-a', 'pipe-large-long', 'pipe-large-curve', 'pipe-large-valve',
  'screen-panel-wide', 'structure-yellow-tall', 'door-wide-closed', 'catwalk-straight', 'warning-orange', 'cone', 'crane'];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function signTexture(title, subtitle, bg = '#172b32', fg = '#f5bc59') {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.font = '900 106px Arial'; g.fillText(title, w / 2, 130);
    g.fillStyle = '#c4d2ce'; g.font = 'bold 32px Arial'; g.fillText(subtitle, w / 2, 204);
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
  const loader = new GLTFLoader(), textures = new THREE.TextureLoader();
  let done = 0;
  const [loaded, diffuse, normal, imported] = await Promise.all([
    Promise.all(MODEL_NAMES.map(async name => {
      const asset = await loader.loadAsync(`./assets/environment/factory/${name}.glb`).catch(() => { throw new Error(`Could not load warehouse model: ${name}.glb`); });
      onProgress(++done, MODEL_NAMES.length);
      return [name, asset.scene];
    })),
    textures.loadAsync('./assets/textures/concrete-floor-diffuse.jpg').catch(() => { throw new Error('Could not load concrete-floor-diffuse.jpg'); }),
    textures.loadAsync('./assets/textures/concrete-floor-normal.jpg').catch(() => { throw new Error('Could not load concrete-floor-normal.jpg'); }),
    Promise.all(['old-barrel', 'wooden-crate'].map(async name => [name, (await loader.loadAsync(`./assets/environment/${name}.glb`)).scene])),
  ]);
  const models = new Map(loaded), group = new THREE.Group(); group.name = 'Ironworks - Dock 09'; scene.add(group);
  const obstacles = [], cameraBlockers = [];
  let palette;
  models.values().next().value.traverse(o => { if (o.isMesh && o.material.map) palette = o.material.map; });
  const assetMaterial = new THREE.MeshStandardMaterial({ map: palette, roughness: 0.78, metalness: 0.12 });
  for (const model of models.values()) model.traverse(o => { if (o.isMesh) o.material = assetMaterial; });
  for (const [name, model] of imported) models.set(name, model);

  const metal = new THREE.MeshStandardMaterial({ color: 0x263c46, metalness: 0.55, roughness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x667475, roughness: 0.95 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xd58b36, metalness: 0.2, roughness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x88704b, roughness: 0.95 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xddad54 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xffe9ad });
  const glass = new THREE.MeshStandardMaterial({ color: 0x7aadb9, emissive: 0x598fa5, emissiveIntensity: 0.45, roughness: 0.4 });
  const corrugation = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#73888c'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = '#4a6268'; g.fillRect(x, 0, 3, h);
      g.fillStyle = '#819296'; g.fillRect(x + 3, 0, 2, h);
      for (const y of [12, 244]) { g.fillStyle = '#354b52'; g.fillRect(x + 7, y, 3, 3); }
    }
    g.fillStyle = '#253f4822'; g.fillRect(0, h * 0.65, w, h * 0.35);
  });
  corrugation.wrapS = corrugation.wrapT = THREE.RepeatWrapping; corrugation.repeat.set(3, 1);
  const cladding = new THREE.MeshStandardMaterial({ map: corrugation, color: 0x91a9ad, roughness: 0.8, metalness: 0.25 });

  function box(x, y, z, w, h, d, material, { solid = false, camera = false, shadow = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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

  for (const texture of [diffuse, normal]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(6, 6); texture.anisotropy = 4; }
  diffuse.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: diffuse, normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35), color: 0xa6b0aa, roughness: 0.92 }));
  floor.receiveShadow = true; group.add(floor);
  for (const [x, z, w, d] of [[-12.2, 0, 0.4, 24.8], [12.2, 0, 0.4, 24.8], [0, -12.2, 24, 0.4], [0, 12.2, 24, 0.4]]) {
    box(x, 0, z, w, 1.1, d, concrete, { camera: true });
    box(x, 1.1, z, w, 5.4, d, cladding, { camera: true });
  }
  // Structural columns, high windows, roof trusses and fluorescent housings.
  for (const z of [-11.5, -5.5, 1, 7, 11.5]) {
    for (const x of [-11.6, 11.6]) {
      box(x, 0, z, 0.32, 6.6, 0.38, metal);
      box(x, 0, z, 0.45, 1.25, 0.5, orange);
    }
    box(0, 6.25, z, 23.5, 0.3, 0.25, metal);
    box(0, 6.7, z, 23.5, 0.12, 0.2, metal);
    for (let x = -10; x <= 10; x += 2) {
      const brace = box(x, 6.4, z, 2, 0.055, 0.08, metal); brace.rotation.z = x % 4 === 0 ? 0.2 : -0.2;
    }
    for (const x of [-5, 5]) { box(x, 5.95, z, 2.4, 0.14, 0.45, metal); box(x, 5.9, z, 2.2, 0.035, 0.36, lamp, { shadow: false }); }
  }
  for (const x of [-9, -5, 5, 9]) {
    box(x, 4.5, -11.96, 2.8, 1.1, 0.05, glass, { shadow: false });
    for (const dx of [-1.4, 0, 1.4]) box(x + dx, 4.5, -11.9, 0.06, 1.1, 0.07, metal);
  }
  addModel('door-wide-closed', 0, -11.94, { scale: 2.6, yaw: Math.PI });
  for (const x of [-2.55, 2.55]) box(x, 0, -11.5, 0.24, 4.5, 0.25, orange);
  sign('DOCK 09', 'IRONWORKS / FREIGHT TERMINAL', 0, 5.25, -11.86, 5);
  sign('KEEP CLEAR', 'AUTHORIZED PERSONNEL ONLY', 0, 2.2, 11.94, 3.4, Math.PI);
  sign('IRONWORKS', 'SHIFT ENDS. THE FIGHT BEGINS.', -11.94, 3.3, 0, 5, Math.PI / 2);
  sign('CAUTION', 'AUTOMATED MACHINERY', 11.94, 3.3, 0, 4, -Math.PI / 2);

  // Open central fighting lane with cover and routes on both sides.
  for (const [x, z] of [[-5, -2], [5, -2], [-5, 5], [5, 5]]) {
    box(x, 0, z, 1.8, 0.16, 1.8, wood, { solid: true });
    for (let i = -2; i <= 2; i++) box(x + i * 0.33, 0.16, z, 0.25, 0.06, 1.8, wood);
    const cargo = addModel('box-large', x, z, { scale: 1.6, y: 0.22 });
    const cover = new THREE.Box3().setFromObject(cargo); obstacles.push(cover); cameraBlockers.push(cover);
    addModel('box-small', x + 0.25, z + 0.1, { scale: 1.1, y: 1.1, yaw: 0.15 });
    // One full-height cover collider avoids stepping into the pallet/box seam.
    obstacles.splice(obstacles.length - 2, 2, new THREE.Box3(new THREE.Vector3(x - 0.9, 0, z - 0.9), new THREE.Vector3(x + 0.9, 1.72, z + 0.9)));
    cameraBlockers.splice(cameraBlockers.length - 2, 2, obstacles[obstacles.length - 1]);
  }
  for (const [x, z, name] of [[-9.2, -7.5, 'machine-fortified'], [9.1, -7.5, 'machine-window']]) {
    addModel(name, x, z, { scale: 1.7, solid: true });
    addModel('screen-panel-wide', x, z + 1.55, { scale: 1.1, solid: true });
    for (let i = 0; i < 3; i++) addModel('pipe-large-long', x > 0 ? 10.8 : -10.8, -7 + i * 2, { y: 3.7, scale: 0.7, yaw: Math.PI / 2 });
  }
  for (const x of [-9.6, 9.6]) {
    for (const z of [3, 4.6, 6.2]) addModel('conveyor-bars-stripe-fence', x, z, { scale: 1.25, yaw: Math.PI / 2, solid: true });
    addModel('robot-arm-a', x, 5, { y: 1, scale: 1.3 });
    addModel('hopper-round', x, 8.8, { scale: 1.35, solid: true });
    addModel('warning-orange', x > 0 ? 8.4 : -8.4, 2, { scale: 0.9 });
    addModel('cone', x > 0 ? 8.2 : -8.2, 7.8, { scale: 1.3 });
  }
  addModel('crane', -8, -10.1, { scale: 1.4, yaw: Math.PI / 2 });
  // Supplied textured wood props: measured bounds feed both combat and camera collision.
  const importedPlacements = [];
  for (const [name, x, z, height, yaw] of [
    ['old-barrel', -7.2, -4.7, 0.95, 0.3], ['old-barrel', 7.2, -4.7, 0.95, -0.3],
    ['wooden-crate', -7, 1, 0.85, 0.15], ['wooden-crate', 7, 1, 0.85, -0.15],
    ['wooden-crate', -6.5, 8, 0.85, -0.2], ['wooden-crate', 6.5, 8, 0.85, 0.2],
  ]) {
    const bounds = new THREE.Box3().setFromObject(models.get(name));
    const model = addModel(name, x, z, { scale: height / (bounds.max.y - bounds.min.y), yaw, solid: true });
    importedPlacements.push({ name, bounds: new THREE.Box3().setFromObject(model) });
  }
  for (let x = -10; x <= 10; x += 2) addModel('catwalk-straight', x, -10.8, { scale: 1.6, y: 3.8 });

  for (const x of [-3.6, 3.6]) stripe(x, 0, 0.07, 18);
  for (const z of [-8.8, 8.8]) stripe(0, z, 7.2, 0.07);
  for (let z = -8; z <= 8; z += 2) stripe(0, z, 0.08, 0.7);
  for (const x of [-5, 5]) for (const z of [-2, 5]) {
    for (let i = -3; i <= 3; i++) { const s = stripe(x + i * 0.32, z + 1.22, 0.17, 0.5); s.rotation.y = -0.5; }
  }
  const label = sign('09', 'LOADING / NO PARKING', 0, 0.026, -6.8, 3.5); label.rotation.x = -Math.PI / 2;
  const light = new THREE.PointLight(0xffbc70, 8, 16, 2); light.position.set(0, 5.5, -7); scene.add(light);
  const fill = new THREE.PointLight(0x79bad6, 7, 16, 2); fill.position.set(4, 5, 5); scene.add(fill);

  const batches = batchStatic(group);
  const arena = new ArenaCollision({ halfSize: 12, obstacles });
  arena.cameraBlockers = cameraBlockers; arena.name = 'Ironworks · Dock 09';
  arena.assetCount = models.size; arena.staticBatches = batches; arena.group = group;
  arena.importedPlacements = importedPlacements;
  return arena;
}
