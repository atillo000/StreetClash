import * as THREE from 'three';

// Procedural baseball bat parented to the right-hand bone.
// Mixamo hand-bone axes vary by rig, so the grip orientation is a preset you can cycle in-game
// (B key). Once it looks right, set DEFAULT_GRIP below to that number.
export const DEFAULT_GRIP = 0;

const LEN = 0.86;
// Which hand-local axis the bat's long axis (its +Y) is mapped onto.
const GRIPS = [
  { label: '+X', axis: new THREE.Vector3(1, 0, 0) },
  { label: '-X', axis: new THREE.Vector3(-1, 0, 0) },
  { label: '+Z', axis: new THREE.Vector3(0, 0, 1) },
  { label: '-Z', axis: new THREE.Vector3(0, 0, -1) },
  { label: '+Y', axis: new THREE.Vector3(0, 1, 0) },
  { label: '-Y', axis: new THREE.Vector3(0, -1, 0) },
];

function buildBatMesh() {
  // Lathe profile: handle -> barrel, origin at the grip (0.12 m above the knob).
  const pts = [
    [0.000, 0.00], [0.030, 0.00], [0.020, 0.03], [0.018, 0.12], [0.022, 0.30],
    [0.034, 0.50], [0.043, 0.66], [0.047, 0.78], [0.040, 0.86], [0.0, 0.86],
  ].map(([r, y]) => new THREE.Vector2(r, y - 0.12));
  const geo = new THREE.LatheGeometry(pts, 14);
  const mat = new THREE.MeshStandardMaterial({ color: 0xc58a4a, roughness: 0.55, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function createBat(character, { handBone = 'mixamorigRightHand' } = {}) {
  const hand = character.bone(handBone);
  if (!hand) { console.warn('Bat: hand bone not found'); return null; }

  const holder = new THREE.Group();           // sits in the hand, scaled back to metres
  const mesh = buildBatMesh();
  holder.add(mesh);

  const tip = new THREE.Object3D(); tip.position.set(0, LEN - 0.12 - 0.05, 0); mesh.add(tip);
  const mid = new THREE.Object3D(); mid.position.set(0, 0.35, 0); mesh.add(mid);
  const base = new THREE.Object3D(); base.position.set(0, 0.05, 0); mesh.add(base);

  // Undo whatever scale the rig applies to bone space so the bat is real-world sized.
  character.root.updateMatrixWorld(true);
  const ws = new THREE.Vector3(); hand.getWorldScale(ws);
  holder.scale.setScalar(1 / (ws.x || 1));
  holder.position.set(0, 0.07 / (ws.x || 1), 0);
  hand.add(holder);

  const bat = {
    holder, mesh, tip, mid, base, grip: 0,
    setGrip(i) {
      this.grip = ((i % GRIPS.length) + GRIPS.length) % GRIPS.length;
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), GRIPS[this.grip].axis);
      try { localStorage.setItem('sc_bat_grip', String(this.grip)); } catch {}
    },
    gripLabel() { return GRIPS[this.grip].label; },
    setVisible(v) { holder.visible = v; },
  };
  let saved = DEFAULT_GRIP;
  try { const s = localStorage.getItem('sc_bat_grip'); if (s !== null) saved = parseInt(s, 10) || 0; } catch {}
  bat.setGrip(saved);
  return bat;
}
