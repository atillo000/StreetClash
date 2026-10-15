import { DEFENSE } from './moves.js';

const feet = ['mixamorigRightFoot', 'mixamorigLeftFoot'];
const move = (label, clip, extra) => ({ label, clip, speed: 1.4, fade: 0.06, endAt: 0.88, cancelAt: 0.7,
  windows: [[0.3, 0.65]], strikers: feet, minSpeed: 1.5, strikeRadius: 0.18,
  damage: 12, knock: 2.2, power: 'light', lunge: 3, range: 1.3, cooldown: 0, ...extra });

export const FIGHTER_MOVES = {
  capoeira: {
    punch: move('Meia lua', 'Light', { speed: 2.6, windows: [[0.3, 0.49]], cancelAt: 0.54, dodgeCancelAt: 0.51, endAt: 0.82, damage: 12, knock: 1.1, lunge: 6 }),
    kick: move('Bencao', 'Kick', { speed: 1.85, windows: [[0.32, 0.65]], cancelAt: 0.69, dodgeCancelAt: 0.67, damage: 16, knock: 3.8, lunge: 5 }),
    heavy: move('Armada', 'Heavy', { speed: 2.05, windows: [[0.65, 0.88]], cancelAt: 0.92, dodgeCancelAt: 0.9, endAt: 0.97, damage: 25, power: 'heavy', knock: 6, cooldown: 1.8, lunge: 5 }),
  },
  magic: {
    punch: move('Arc bolt', 'Light', { kind: 'projectile', strikers: [], events: [0.34], windows: [[0.28, 0.45]], speed: 2, cancelAt: 0.55, dodgeCancelAt: 0.47,
      damage: 10, knock: 1.2, range: 12, projectileSpeed: 12, projectileRadius: 0.16, color: 0xab8bff, lunge: 0, cooldown: 0.5 }),
    kick: move('Twin-hand blast', 'Kick', { kind: 'projectile', strikers: [], events: [0.48], windows: [[0.4, 0.58]], speed: 1.9, cancelAt: 0.65, dodgeCancelAt: 0.6,
      damage: 19, knock: 3.5, range: 10, projectileSpeed: 9, projectileRadius: 0.25, color: 0x66d8f2, lunge: 0, cooldown: 2.2 }),
    heavy: move('Arcane pulse', 'Heavy', { kind: 'area', strikers: [], events: [0.52], windows: [[0.46, 0.62]], speed: 1.9, dodgeCancelAt: 0.64,
      damage: 27, power: 'heavy', knock: 6, range: 2.8, color: 0xc7a3ff, lunge: 0, cooldown: 6 }),
  },
  soldier: {
    punch: move('Rifle shot', 'Light', { kind: 'projectile', strikers: [], events: [0.25], windows: [[0.18, 0.4]], speed: 1.25, cancelAt: 0.55, dodgeCancelAt: 0.42,
      damage: 8, knock: 0.45, range: 15, projectileSpeed: 24, projectileRadius: 0.065, color: 0xffd98a, lunge: 0, cooldown: 0.6 }),
    kick: move('Close kick', 'Kick', { speed: 1.65, windows: [[0.28, 0.76]], cancelAt: 0.8, dodgeCancelAt: 0.78, damage: 15, knock: 4, cooldown: 1.3 }),
    heavy: move('Rifle burst', 'Heavy', { kind: 'projectile', strikers: [], events: [0.18, 0.45, 0.72], windows: [[0.12, 0.8]], speed: 0.9, cancelAt: 0.84, dodgeCancelAt: 0.82, endAt: 0.92,
      damage: 7, knock: 0.6, range: 15, projectileSpeed: 24, projectileRadius: 0.065, color: 0xffc574, lunge: 0, cooldown: 3 }),
  },
};

export function fighterDefense(id) {
  const defense = Object.fromEntries(Object.entries(DEFENSE).map(([key, value]) => [key, { ...value }]));
  defense.dodge = { ...defense.dodge, speed: 2, impulse: 10, decay: 4.5, iframeUntil: 0.48, endAt: 0.82, cooldown: 0.55 };
  defense.hit = { ...defense.hit, speed: 2.3, endAt: 0.75 };
  defense.down = { ...defense.down, speed: 1.7, hold: 0.25 };
  defense.getUp = { ...defense.getUp, speed: 1.8, endAt: 0.9 };
  if (id === 'capoeira') defense.dodge = { ...defense.dodge, speed: 3, impulse: 12, decay: 4.5, endAt: 0.88, cooldown: 0.45 };
  if (id === 'magic') defense.block = { ...defense.block, speed: 1, loop: true };
  return defense;
}
