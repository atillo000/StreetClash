export class TargetLock {
  constructor(player, world, { range = 12, releaseRange = 16 } = {}) {
    this.player = player;
    this.world = world;
    this.range = range;
    this.releaseRange = releaseRange;
    this.target = null;
  }

  toggle() {
    if (this.target) { this.clear(); return; }
    let distance = this.range;
    for (const enemy of this.world.combatants) {
      if (enemy === this.player || enemy.team === this.player.team || !enemy.alive) continue;
      const d = enemy.position.distanceTo(this.player.position);
      if (d < distance && (!this.world.arena || this.world.arena.hasLineOfSight(this.player.position, enemy.position))) {
        this.target = enemy; distance = d;
      }
    }
  }

  clear() { this.target = null; this.player.mover.lockFacing = null; this.player.target = null; }

  update() {
    const t = this.target;
    if (!this.player.alive || !t?.alive || t.position.distanceTo(this.player.position) > this.releaseRange
      || (this.world.arena && !this.world.arena.hasLineOfSight(this.player.position, t.position))) { this.clear(); return; }
    this.player.target = t;
    this.player.mover.lockFacing = Math.atan2(t.position.x - this.player.position.x, t.position.z - this.player.position.z);
  }
}
