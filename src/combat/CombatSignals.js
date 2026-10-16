import * as THREE from 'three';

// One reusable warning per fighter. Warnings disappear on release or interruption.
export class CombatSignals {
  constructor(scene, combatants) {
    const ring = new THREE.RingGeometry(0.9, 1, 48);
    const arrow = new THREE.ConeGeometry(0.18, 0.65, 3);
    this.entries = combatants.map(c => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
      const group = new THREE.Group(), circle = new THREE.Mesh(ring, material), direction = new THREE.Mesh(arrow, material);
      circle.rotation.x = -Math.PI / 2; direction.rotation.x = Math.PI / 2; direction.position.z = 1.1;
      group.add(circle, direction); scene.add(group); group.visible = false;
      return { c, group, circle, direction, material };
    });
  }
  update(enabled, player) {
    for (const { c, group, circle, direction, material } of this.entries) {
      const m = c.move, p = c.character.actionProgress();
      const release = m?.events?.length ? m.events.at(-1) : m?.windows?.[0]?.[0];
      group.visible = !!enabled && c.state === 'attack' && m.kind !== 'mobility' && p < release;
      if (!group.visible) continue;
      group.position.copy(m.targeted ? c.castPoint : c.position); group.position.y += 0.04;
      group.rotation.y = c.attackAngle;
      const area = m.kind === 'area', radius = area ? m.range : 0.65;
      circle.scale.setScalar(radius); direction.visible = !area;
      material.color.set(c === player ? m.color ?? c.profile?.color ?? 0x77e0ce : 0xff695e);
      material.opacity = 0.25 + 0.5 * Math.min(1, p / Math.max(0.01, release));
    }
  }
}
