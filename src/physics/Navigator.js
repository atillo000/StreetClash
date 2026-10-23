import * as THREE from 'three';
import { sweepBox } from './collision.js';

// Small visibility graph around inflated cover corners. No grid, navmesh assets,
// worker, or physics package needed for a static two-fighter warehouse.
export class Navigator {
  constructor(arena, radius = 0.38) {
    this.arena = arena;
    this.radius = radius;
    this.margin = radius + 0.06;
    this.edge = arena.halfSize - this.margin;
    this.rebuild();
  }

  rebuild(){
    this.revision=this.arena.revision||0;
    this.nodes = [];
    for (const b of this.arena.obstacles) {
      for (const x of [b.min.x - this.margin - 0.05, b.max.x + this.margin + 0.05]) {
        for (const z of [b.min.z - this.margin - 0.05, b.max.z + this.margin + 0.05]) {
          const p = new THREE.Vector3(x, 0, z);
          if (this.walkable(p)) this.nodes.push(p);
        }
      }
    }
    this.edges = this.nodes.map(() => []);
    for (let i = 0; i < this.nodes.length; i++) for (let j = i + 1; j < this.nodes.length; j++) {
      if (this.clear(this.nodes[i], this.nodes[j])) {
        const cost = this.nodes[i].distanceTo(this.nodes[j]);
        this.edges[i].push([j, cost]); this.edges[j].push([i, cost]);
      }
    }
  }

  inside(p, b) {
    return p.x > b.min.x - this.margin && p.x < b.max.x + this.margin
      && p.z > b.min.z - this.margin && p.z < b.max.z + this.margin;
  }

  walkable(p) { return Math.abs(p.x) <= this.edge && Math.abs(p.z) <= this.edge && !this.arena.obstacles.some(b => this.inside(p, b)); }

  project(point) {
    const p = point.clone(); p.y = 0;
    p.x = THREE.MathUtils.clamp(p.x, -this.edge, this.edge); p.z = THREE.MathUtils.clamp(p.z, -this.edge, this.edge);
    for (let pass = 0; pass < 4; pass++) for (const b of this.arena.obstacles) {
      if (!this.inside(p, b)) continue;
      const options = [
        { axis: 'x', value: b.min.x - this.margin - 0.01 }, { axis: 'x', value: b.max.x + this.margin + 0.01 },
        { axis: 'z', value: b.min.z - this.margin - 0.01 }, { axis: 'z', value: b.max.z + this.margin + 0.01 },
      ].filter(o => Math.abs(o.value) <= this.edge);
      options.sort((a, c) => Math.abs(p[a.axis] - a.value) - Math.abs(p[c.axis] - c.value));
      if (options[0]) p[options[0].axis] = options[0].value;
    }
    return p;
  }

  clear(a, b) {
    if (!this.walkable(a) || !this.walkable(b)) return false;
    const delta = new THREE.Vector3().subVectors(b, a);
    return !this.arena.obstacles.some(box => sweepBox(a, delta, box, this.margin));
  }

  findPath(from, to) {
    if(this.revision!==(this.arena.revision||0))this.rebuild();
    const start = this.project(from), goal = this.project(to);
    const prefix = start.distanceTo(from) > 0.025 ? [start] : [];
    if (this.clear(start, goal)) return [...prefix, goal];
    const nodes = [...this.nodes, start, goal], first = nodes.length - 2, last = nodes.length - 1;
    const edges = this.edges.map(e => e.slice()); edges.push([], []);
    for (const index of [first, last]) for (let i = 0; i < first; i++) {
      if (!this.clear(nodes[index], nodes[i])) continue;
      const cost = nodes[index].distanceTo(nodes[i]); edges[index].push([i, cost]); edges[i].push([index, cost]);
    }
    const distance = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set(); distance[first] = 0;
    while (visited.size < nodes.length) {
      let best = -1;
      for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (best < 0 || distance[i] < distance[best])) best = i;
      if (best < 0 || !Number.isFinite(distance[best])) return [];
      if (best === last) break;
      visited.add(best);
      for (const [next, cost] of edges[best]) if (distance[best] + cost < distance[next]) { distance[next] = distance[best] + cost; previous[next] = best; }
    }
    const path = [];
    for (let at = last; at !== first && at >= 0; at = previous[at]) path.unshift(nodes[at].clone());
    return [...prefix, ...path];
  }
}
