// Graphics presets tuned for integrated / low-end GPUs (e.g. MX130).
export const QUALITY = {
  low:    { pixelRatio: 0.75, shadows: false, shadowMap: 512, particles: 48 },
  medium: { pixelRatio: 1.0,  shadows: true,  shadowMap: 1024, particles: 96 },
  high:   { pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5), shadows: true, shadowMap: 2048, particles: 192 },
};

export function applyQuality(name, renderer, keyLight) {
  const q = QUALITY[name] || QUALITY.medium;
  renderer.setPixelRatio(q.pixelRatio);
  renderer.shadowMap.enabled = q.shadows;
  keyLight.castShadow = q.shadows;
  if (keyLight.shadow.mapSize.x !== q.shadowMap) {
    keyLight.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
  }
}
