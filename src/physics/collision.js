import * as THREE from 'three';

const EPS = 1e-6;

// Slab sweep against a box expanded by a grounded capsule's radius.
export function sweepBox(start, delta, box, radius = 0) {
  let near = -Infinity, far = Infinity, nx = 0, nz = 0;
  for (const axis of ['x', 'z']) {
    const min = box.min[axis] - radius, max = box.max[axis] + radius;
    if (Math.abs(delta[axis]) < EPS) {
      if (start[axis] < min || start[axis] > max) return null;
      continue;
    }
    let a = (min - start[axis]) / delta[axis], b = (max - start[axis]) / delta[axis];
    const normal = delta[axis] > 0 ? -1 : 1;
    if (a > b) [a, b] = [b, a];
    if (a > near) { near = a; nx = axis === 'x' ? normal : 0; nz = axis === 'z' ? normal : 0; }
    far = Math.min(far, b);
    if (near > far) return null;
  }
  if (near < -EPS || near > 1 || far < 0) return null;
  return { time: Math.max(0, near), nx, nz };
}

export function sweepCircles(a0, a1, b0, b1, radius) {
  const x = a0.x - b0.x, z = a0.z - b0.z;
  const vx = a1.x - a0.x - (b1.x - b0.x), vz = a1.z - a0.z - (b1.z - b0.z);
  const c = x * x + z * z - radius * radius;
  if (c <= EPS) return (x * x + z * z > EPS && x * vx + z * vz < 0) ? 0 : null;
  const a = vx * vx + vz * vz, b = 2 * (x * vx + z * vz);
  const disc = b * b - 4 * a * c;
  if (a < EPS || b >= 0 || disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

// Closest points on two finite segments, including parallel and zero-length ones.
export function segmentDistanceSq(a, b, c, d, point = new THREE.Vector3()) {
  const u = new THREE.Vector3().subVectors(b, a), v = new THREE.Vector3().subVectors(d, c);
  const w = new THREE.Vector3().subVectors(a, c);
  const aa = u.dot(u), bb = u.dot(v), cc = v.dot(v), dd = u.dot(w), ee = v.dot(w);
  let s = 0, t = 0;
  if (aa < EPS && cc < EPS) { point.copy(a); return a.distanceToSquared(c); }
  if (aa < EPS) t = THREE.MathUtils.clamp(ee / cc, 0, 1);
  else if (cc < EPS) s = THREE.MathUtils.clamp(-dd / aa, 0, 1);
  else {
    const denom = aa * cc - bb * bb;
    s = denom > EPS ? THREE.MathUtils.clamp((bb * ee - cc * dd) / denom, 0, 1) : 0;
    t = (bb * s + ee) / cc;
    if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-dd / aa, 0, 1); }
    else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((bb - dd) / aa, 0, 1); }
  }
  point.copy(a).addScaledVector(u, s);
  w.copy(c).addScaledVector(v, t);
  return point.distanceToSquared(w);
}

export function sweepHurtCapsule(from, to, target, strikeRadius, point = new THREE.Vector3(), startFraction = 0, endFraction = 1) {
  const radius = target.radius ?? 0.38, height = target.height ?? 1.7;
  const p = target.position;
  const bottom = new THREE.Vector3(p.x, p.y + radius, p.z);
  const top = new THREE.Vector3(p.x, p.y + height - radius, p.z);
  // Sweep relative to target translation too: a moving victim cannot tunnel.
  const old = target.previousPosition || p;
  const relativeFrom = from.clone().add(p).sub(old.clone().lerp(p, startFraction));
  const relativeTo = to.clone().add(p).sub(old.clone().lerp(p, endFraction));
  return segmentDistanceSq(relativeFrom, relativeTo, bottom, top, point) <= (radius + strikeRadius) ** 2;
}

export class ArenaCollision {
  constructor({ halfSize = 12, obstacles = [] } = {}) {
    this.halfSize = halfSize;
    this.obstacles = obstacles;
  }

  hasLineOfSight(a, b) {
    const delta = new THREE.Vector3().subVectors(b, a);
    return !this.obstacles.some(box => sweepBox(a, delta, box));
  }

  constrain(start, desired, radius) {
    const height = desired.y;
    const pos = start.clone(), delta = new THREE.Vector3().subVectors(desired, start);
    // Resolve a spawn/reset inside a box before sweeping.
    for (const box of this.obstacles) {
      const minX = box.min.x - radius, maxX = box.max.x + radius;
      const minZ = box.min.z - radius, maxZ = box.max.z + radius;
      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        const faces = [{ d: pos.x - minX, axis: 'x', value: minX - EPS }, { d: maxX - pos.x, axis: 'x', value: maxX + EPS },
          { d: pos.z - minZ, axis: 'z', value: minZ - EPS }, { d: maxZ - pos.z, axis: 'z', value: maxZ + EPS }];
        faces.sort((a, b) => a.d - b.d); pos[faces[0].axis] = faces[0].value;
      }
    }
    for (let pass = 0; pass < 3 && delta.lengthSq() > EPS * EPS; pass++) {
      let hit = null;
      for (const box of this.obstacles) {
        const candidate = sweepBox(pos, delta, box, radius);
        if (candidate && (!hit || candidate.time < hit.time)) hit = candidate;
      }
      if (!hit) { pos.add(delta); break; }
      pos.addScaledVector(delta, Math.max(0, hit.time - EPS));
      delta.multiplyScalar(1 - hit.time);
      const inward = delta.x * hit.nx + delta.z * hit.nz;
      if (inward < 0) { delta.x -= inward * hit.nx; delta.z -= inward * hit.nz; }
    }
    const edge = this.halfSize - radius;
    pos.x = THREE.MathUtils.clamp(pos.x, -edge, edge);
    pos.z = THREE.MathUtils.clamp(pos.z, -edge, edge);
    pos.y = height;
    return desired.copy(pos);
  }

  resolve(fighters) {
    for (const c of fighters) this.constrain(c.previousPosition, c.position, c.radius);
    // Walking follows the rendered heightfield; jumping retains vertical motion.
    const followGround=c=>{const floor=this.groundHeight?.(c.position.x,c.position.z)??0;if(!c.jumpVelocity||c.position.y<floor)c.position.y=floor;};
    // Prevent fast opposing rolls/knockbacks crossing between fixed steps.
    for (let i = 0; i < fighters.length; i++) for (let j = i + 1; j < fighters.length; j++) {
      const a = fighters[i], b = fighters[j], radius = a.radius + b.radius;
      const time = sweepCircles(a.previousPosition, a.position, b.previousPosition, b.position, radius);
      if (time !== null) {
        const da = a.position.clone().sub(a.previousPosition), db = b.position.clone().sub(b.previousPosition);
        const ac = a.previousPosition.clone().addScaledVector(da, time);
        const bc = b.previousPosition.clone().addScaledVector(db, time);
        const n = ac.clone().sub(bc).normalize();
        const closing = da.clone().sub(db).dot(n) * (1 - time);
        if (closing < 0) { a.position.addScaledVector(n, -closing / 2); b.position.addScaledVector(n, closing / 2); }
      }
    }
    // Iteration handles exact overlap and fighters pressed against a wall.
    for (let pass = 0; pass < 6; pass++) {
      for (let i = 0; i < fighters.length; i++) for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i], b = fighters[j];
        let dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
        let d = Math.hypot(dx, dz);
        const min = a.radius + b.radius;
        if (d >= min) continue;
        if (d < EPS) { dx = 1; dz = 0; d = 1; }
        const overlap = min - Math.hypot(b.position.x - a.position.x, b.position.z - a.position.z);
        const push = (overlap + EPS) / 2;
        a.position.x -= dx / d * push; a.position.z -= dz / d * push;
        b.position.x += dx / d * push; b.position.z += dz / d * push;
      }
      for (const c of fighters) this.constrain(c.previousPosition, c.position, c.radius);
    }
    for(const c of fighters)followGround(c);
  }
}
