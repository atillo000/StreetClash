import * as THREE from 'three';

// Select boot/toe sole samples once per shared geometry, in the exported bind pose.
// Only the visible model is adjusted; the gameplay capsule and jump arc stay authoritative.
const cache = new WeakMap();
const component = (a, i, k) => a.isInterleavedBufferAttribute
  ? a.data.array[i * a.data.stride + a.offset + k] : a.array[i * a.itemSize + k];
export class FootContact {
  constructor(model) {
    this.model = model; this.baseY = model.position.y; this.offset = 0;
    this.point = new THREE.Vector3(); this.samples = [];
    model.updateMatrixWorld(true);
    const candidates = [];
    model.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return;
      let indices = cache.get(mesh.geometry);
      if (!indices) {
        const skin = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
        if (!skin || !weights) return;
        const feet = new Set(mesh.skeleton.bones.map((b,i) => /(?:Left|Right)(?:Foot|Toe)/.test(b.name) ? i : -1));
        indices = [];
        for (let i=0; i<skin.count; i++) {
          let influence = 0;
          for (let k=0; k<4; k++) if (feet.has(component(skin,i,k))) influence += component(weights,i,k);
          if (influence > 0.5) indices.push(i);
        }
        cache.set(mesh.geometry, indices);
      }
      for (const index of indices) {
        mesh.getVertexPosition(index, this.point).applyMatrix4(mesh.matrixWorld);
        candidates.push({ mesh, index, y: this.point.y, x: this.point.x, z: this.point.z });
      }
    });
    const min = candidates.reduce((min,p)=>Math.min(min,p.y), Infinity);
    const low = candidates.filter(p=>p.y<min+0.045);
    // Cover both feet and the heel/toe edges, not just the first triangles of a boot.
    for (const axis of ['x','z']) {
      const sorted = [...low].sort((a,b)=>a[axis]-b[axis]);
      for (let i=0;i<12 && sorted.length;i++) this.samples.push(sorted[Math.min(sorted.length-1,Math.floor(i*(sorted.length-1)/11))]);
    }
    this.samples = [...new Set(this.samples)];
  }
  minimum() {
    let min = Infinity;
    for (const { mesh, index } of this.samples) min = Math.min(min, mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld).y);
    return min;
  }
  update(root, dt, enabled, movingFast) {
    if (!this.samples.length) return;
    this.model.position.y = this.baseY;
    root.updateMatrixWorld(true);
    const min = this.minimum(), floor = root.getWorldPosition(this.point).y;
    const gap = min - floor, allowance = movingFast ? 0.055 : 0.012;
    const target = !enabled ? 0 : gap < 0.008 ? 0.008-gap : gap > allowance ? allowance-gap : 0;
    const bounded = THREE.MathUtils.clamp(target, -0.25, 0.3);
    this.offset = enabled ? THREE.MathUtils.lerp(this.offset, bounded, 1-Math.exp(-35*Math.max(dt,1/60))) : 0;
    // Raising immediately prevents a one-frame sole penetration when a foot lands.
    if (enabled && gap < 0.008) this.offset = Math.max(this.offset, bounded);
    // Bound smoothing lag so lifted soles cannot hover or penetrate at fast cadence.
    if (enabled) this.offset = THREE.MathUtils.clamp(this.offset, Math.max(-0.25, 0.008-gap), Math.min(0.3, allowance-gap));
    this.model.position.y = this.baseY + this.offset;
    root.updateMatrixWorld(true);
  }
}
