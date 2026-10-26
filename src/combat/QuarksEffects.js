import * as THREE from 'three';
import { BatchedRenderer, ParticleSystem, ConstantValue, ConstantColor, SphereEmitter,
  RenderMode, ColorOverLife, Gradient, SizeOverLife, PiecewiseBezier, Bezier } from 'three.quarks';

// Original roster effects. Tune these without changing combat logic.
export const COMBAT_VFX = {
  cast:   { count: 8,  life: 0.16, size: 0.23, speed: 1.4, radius: 0.025 },
  impact: { count: 14, life: 0.32, size: 0.18, speed: 3.8, radius: 0.05 },
  heavy:  { count: 22, life: 0.42, size: 0.26, speed: 4.8, radius: 0.09 },
  arcane: { count: 3,  life: 0.22, size: 0.19, speed: 0.25, radius: 0.04 },
  wind:   { count: 2,  life: 0.14, size: 0.08, speed: 0.12, radius: 0.015 },
  pulse:  { count: 24, life: 0.48, size: 0.24, speed: 4, radius: 0.12 },
  muzzle: { count: 1, life: 0.07, size: 0.38, speed: 0, radius: 0 },
  smoke:  { count: 2, life: 0.45, size: 0.16, speed: 0.35, radius: 0.02 },
};

function glowTexture() {
  const size = 32, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5) / size * 2 - 1, dy = (y + 0.5) / size * 2 - 1;
    const glow = Math.max(0, 1 - Math.hypot(dx, dy));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(255 * glow * glow);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Reuse a fixed number of emitters. Burst reservations also bound particles queued
// between render frames; repeated impacts cannot create unlimited systems.
export class QuarksEffects {
  constructor(scene, capacity = 12) {
    this.budget = 96;
    this.batch = new BatchedRenderer(); scene.add(this.batch);
    this.texture = glowTexture();
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.slots = Array.from({ length: capacity }, () => {
      const system = new ParticleSystem({
        duration: 0.02, looping: false, autoDestroy: false, worldSpace: true,
        shape: new SphereEmitter({ radius: 0.05, thickness: 1 }),
        startLife: new ConstantValue(0.3), startSpeed: new ConstantValue(3),
        startSize: new ConstantValue(0.2), startColor: new ConstantColor(new THREE.Vector4(1, 1, 1, 1)),
        emissionOverTime: new ConstantValue(0),
        emissionBursts: [{ time: 0, count: new ConstantValue(0), cycle: 1, interval: 0, probability: 1 }],
        behaviors: [new ColorOverLife(new Gradient([[new THREE.Vector3(1, 1, 1), 0], [new THREE.Vector3(1, 1, 1), 1]], [[1, 0], [0, 1]])),
          new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.85, 0.35, 0), 0]]))],
        material: this.material, renderMode: RenderMode.BillBoard,
        uTileCount: 2, vTileCount: 2, startTileIndex: new ConstantValue(0),
      });
      system.stop(); scene.add(system.emitter); this.batch.addSystem(system);
      return { system, remaining: 0, reserved: 0 };
    });
  }

  get reserved() { return this.slots.reduce((sum, slot) => sum + slot.reserved, 0); }
  get particleCount() { return this.slots.reduce((sum, slot) => sum + slot.system.particleNum, 0); }

  async loadAtlas() {
    const names = ['spark_01', 'magic_01', 'muzzle_01', 'smoke_01'];
    const images = await Promise.all(names.map(name => new THREE.TextureLoader().loadAsync(`./assets/textures/kenney/${name}.png`)));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    images.forEach((texture,i) => { context.drawImage(texture.image, (i%2)*128+6, Math.floor(i/2)*128+6, 116, 116); texture.dispose(); });
    const source = context.getImageData(0,0,256,256).data, pixels = new Uint8Array(source.length);
    for (let y=0;y<256;y++) pixels.set(source.subarray(y*1024,(y+1)*1024), (255-y)*1024);
    this.texture.image = { data: pixels, width: 256, height: 256 }; this.texture.needsUpdate = true;
    this.atlasLoaded = true;
  }

  setBudget(count) {
    this.budget = Math.max(0, Math.floor(count));
    for (const slot of this.slots) {
      if (this.reserved <= this.budget) break;
      slot.system.stop(); slot.reserved = slot.remaining = 0;
    }
  }

  burst(position, color, kind = 'impact', scale = 1) {
    const preset = COMBAT_VFX[kind] || COMBAT_VFX.impact;
    const count = Math.min(preset.count, this.budget - this.reserved);
    const slot = this.slots.find(s => s.remaining <= 0);
    if (!slot || count <= 0) return false;
    const s = slot.system, tint = new THREE.Color(color);
    s.startTileIndex.value = kind === 'muzzle' ? 2 : kind === 'smoke' ? 3 : ['cast','arcane','pulse'].includes(kind) ? 1 : 0;
    s.startColor.color.set(tint.r, tint.g, tint.b, 1);
    s.startLife.value = preset.life; s.startSize.value = preset.size * scale;
    s.startSpeed.value = preset.speed * scale; s.emissionBursts[0].count.value = count;
    s.emitterShape.radius = preset.radius * scale;
    s.emitter.position.copy(position); s.emitter.updateMatrixWorld(true);
    slot.remaining = preset.life + 0.05; slot.reserved = count;
    s.restart(); return true;
  }

  update(dt) {
    for (const slot of this.slots) if (slot.remaining > 0) {
      slot.remaining -= dt;
      if (slot.remaining <= 0) { slot.system.stop(); slot.reserved = 0; }
    }
    const running=this.slots.some(s=>s.remaining>0);if(running||this.wasRunning)this.batch.update(Math.min(dt, 0.1));this.wasRunning=running;
  }

  clear() {
    for (const slot of this.slots) { slot.system.stop(); slot.remaining = slot.reserved = 0; }
    this.batch.update(0);
  }
}
