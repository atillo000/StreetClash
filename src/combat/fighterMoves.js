import { DEFENSE } from './moves.js';
import { applyCombatKits } from './CombatKits.js';
import { configureStatuses } from './StatusEffects.js';
import { paceMoves, paceDefense } from '../core/Pacing.js';
import { configureSoldierCombat } from '../characters/SoldierCombat.js';
import { configurePowers } from './PowerMoves.js';
import { configureCombatArt } from './CombatArt.js';
import { applyCombatBalance } from './CombatBalance.js';
import { configureEnemyMoves } from './EnemyMoves.js';
import { configureEnvironmentMoves } from './EnvironmentMoves.js';
import { IMPORTED_MOVES } from './ImportedMoves.js';

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
  ...IMPORTED_MOVES,
};

// Reuse the supplied class clips; damage still follows their measured gestures.
const cap = FIGHTER_MOVES.capoeira, mage = FIGHTER_MOVES.magic, rifle = FIGHTER_MOVES.soldier;
cap.punch.chain = [
  { ...cap.punch },
  { ...cap.kick, label: 'Ginga chain II', damage: 14, cooldown: 0, knock: 1.5, speed: 2.2 },
  { ...cap.heavy, label: 'Ginga finisher', damage: 20, cooldown: 0, knock: 4.5, speed: 2.4 },
];
cap.skill1 = move('Rush kick', 'Kick', { speed: 2.2, windows: [[0.32, 0.65]], cancelAt: 0.7, dodgeCancelAt: 0.67,
  damage: 18, knock: 3, range: 4.5, lunge: 20, lungeDecay: 5, cooldown: 4, color: 0xffbd58, skill: true });
cap.skill2 = move('Roda sweep', 'Heavy', { kind: 'area', strikers: [], events: [0.77], windows: [[0.65, 0.88]],
  speed: 2.15, cancelAt: 0.92, dodgeCancelAt: 0.9, endAt: 0.97, damage: 23, knock: 5, power: 'heavy',
  range: 2.4, lunge: 0, cooldown: 8, color: 0xffa84e, skill: true });
// All three stages now strike; the long non-damaging cartwheel is removed.
cap.ultimateStart = move('Opening armada', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 2.4, fade: 0.045,
  windows: [[0.32, 0.68]], damage: 12, knock: 0.7, power: 'light',
  lunge: 3, cooldown: 0, endAt: 0.88, cancelAt: 0.88, dodgeCancelAt: 0.88, color: 0xffbd58,
});
cap.ultimateStrike = move('Martelo follow-up', 'UltimateStrike', {
  sequenceOnly: true, skill: true, speed: 2.8, fade: 0.045,
  windows: [[0.38, 0.72]], damage: 12, knock: 0.8, power: 'light',
  lunge: 3, cooldown: 0, endAt: 0.88, cancelAt: 0.88, dodgeCancelAt: 0.88, color: 0xffbd58,
});
cap.ultimateFinisher = move('Compasso finisher', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, speed: 2.8, fade: 0.045,
  windows: [[0.3, 0.76]], damage: 22, knock: 7, power: 'heavy',
  lunge: 3, cooldown: 0, endAt: 0.92, cancelAt: 0.92, dodgeCancelAt: 0.92, color: 0xffa84e,
});
// CAPOEIRA ULTIMATE: edit the key and ordered stage list here.
// One press automatically plays every stage. Repeat or append stage IDs for more.
// Stage animations/timings are the three definitions above; aliases live in clips.
cap.ultimate = {
  label: 'Ginga ultimate',
  input: { label: '4', codes: ['Digit4'] }, // Example: label: 'U', codes: ['KeyU']
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, // Seconds; charged once when the complete sequence starts.
  skill: true,
  playerOnly: true, // Manual ultimate; bots keep their existing move choices.
};

mage.skill1 = move('Astral seal', 'Heavy', { kind: 'area', targeted: true, castRange: 9, strikers: [], events: [0.52],
  windows: [[0.46, 0.62]], speed: 1.9, dodgeCancelAt: 0.64, range: 2.3, damage: 23, knock: 3,
  lunge: 0, cooldown: 6, color: 0xb494ff, skill: true });
mage.skill2 = move('Phase step', 'Roll', { kind: 'mobility', strikers: [], events: [0.08], windows: [[0.08, 0.35]],
  speed: 2.4, cancelAt: 0.72, dodgeCancelAt: 0.65, endAt: 0.84, damage: 0, range: 0, lunge: 16, lungeDecay: 6,
  invulnerable: [0.08, 0.35], cooldown: 5, color: 0x9dbdff, skill: true });
rifle.skill1 = move('Focus round', 'Light', { kind: 'projectile', strikers: [], events: [0.48], windows: [[0.4, 0.56]],
  speed: 1.05, cancelAt: 0.68, dodgeCancelAt: 0.6, damage: 19, knock: 2, range: 15, projectileSpeed: 26,
  projectileRadius: 0.09, lunge: 0, cooldown: 5, color: 0xff9f65, skill: true });
rifle.skill2 = move('Tactical roll', 'Roll', { kind: 'mobility', strikers: [], events: [0.08], windows: [[0.08, 0.35]],
  speed: 2.4, cancelAt: 0.72, dodgeCancelAt: 0.65, endAt: 0.84, damage: 0, range: 0, lunge: 14, lungeDecay: 5,
  invulnerable: [0.08, 0.35], cooldown: 5, color: 0x8be0c5, skill: true });

// ULTIMATE SKILLS: change input for the key, sequence for order/repeats, and
// each stage's clip for its animation alias. All release times are normalized.
mage.ultimateStart = move('Astral charge', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 2.5, fade: 0.045,
  windows: [], strikers: [], damage: 0, knock: 0, lunge: 0,
  endAt: 0.4, cancelAt: 0.4, dodgeCancelAt: 0.4, color: 0xbd9bff,
});
mage.ultimateStrike = move('Astral lance', 'UltimateStrike', {
  sequenceOnly: true, skill: true, kind: 'projectile', strikers: [], speed: 4,
  events: [0.46], windows: [[0.38, 0.58]], damage: 22, knock: 0.8, power: 'light',
  range: 15, projectileSpeed: 18, projectileRadius: 0.28, lunge: 0,
  endAt: 0.86, cancelAt: 0.86, dodgeCancelAt: 0.86, color: 0xbd9bff,
});
mage.ultimateFinisher = move('Astral rupture', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, kind: 'area', strikers: [], speed: 3.8,
  events: [0.52], windows: [[0.46, 0.64]], damage: 24, knock: 6, power: 'heavy',
  range: 3.6, lunge: 0, endAt: 0.88, cancelAt: 0.88, dodgeCancelAt: 0.88, color: 0xd5b6ff,
});
mage.ultimate = {
  label: 'Astral rupture', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

rifle.ultimateStart = move('Acquire target', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 1, fade: 0.045,
  windows: [], strikers: [], damage: 0, knock: 0, lunge: 0,
  endAt: 0.1, cancelAt: 0.1, dodgeCancelAt: 0.1, color: 0xffd98a,
});
rifle.ultimateStrike = move('Focused burst', 'UltimateStrike', {
  sequenceOnly: true, skill: true, kind: 'projectile', strikers: [], speed: 1.5,
  events: [0.18, 0.4, 0.62], windows: [[0.12, 0.7]], damage: 7, knock: 0.25,
  range: 17, projectileSpeed: 28, projectileRadius: 0.075, lunge: 0,
  endAt: 0.78, cancelAt: 0.78, dodgeCancelAt: 0.78, color: 0xffd98a,
});
rifle.ultimateFinisher = move('Armor breaker', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, kind: 'projectile', strikers: [], speed: 1.8,
  events: [0.25], windows: [[0.18, 0.36]], damage: 18, knock: 5, power: 'heavy',
  range: 18, projectileSpeed: 30, projectileRadius: 0.11, lunge: 0,
  endAt: 0.8, cancelAt: 0.8, dodgeCancelAt: 0.8, color: 0xffa568,
});
rifle.ultimate = {
  label: 'Focused barrage', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

// Combat skill slots and click chains; uses existing embedded attack clips.
applyCombatKits(FIGHTER_MOVES);
configureEnemyMoves(FIGHTER_MOVES);
configureSoldierCombat(FIGHTER_MOVES.soldier);
configurePowers(FIGHTER_MOVES);
applyCombatBalance(FIGHTER_MOVES);
configureStatuses(FIGHTER_MOVES);
paceMoves(FIGHTER_MOVES);
configureEnvironmentMoves(FIGHTER_MOVES);
configureCombatArt(FIGHTER_MOVES);

export function fighterDefense(id) {
  const defense = Object.fromEntries(Object.entries(DEFENSE).map(([key, value]) => [key, { ...value }]));
  defense.dodge = { ...defense.dodge, speed: 2, impulse: 10, decay: 4.5, iframeUntil: 0.48, endAt: 0.82, cooldown: 0.55 };
  defense.hit = { ...defense.hit, speed: 2.3, endAt: 0.75 };
  defense.down = { ...defense.down, speed: 1.7, hold: 0.25 };
  defense.getUp = { ...defense.getUp, speed: 1.8, endAt: 0.9 };
  if (id === 'capoeira') defense.dodge = { ...defense.dodge, speed: 3, impulse: 12, decay: 4.5, endAt: 0.88, cooldown: 0.45 };
  if (id === 'paladin') defense.block = { ...defense.block, speed: 1, loop: true, damageTaken: 0.08, arc: 110 };
  if (id === 'magic') defense.block = { ...defense.block, speed: 1, loop: true };
  return paceDefense(defense);
}
