const weapon = ['weapon:tip', 'weapon:mid', 'weapon:base'];
const feet = ['mixamorigRightFoot', 'mixamorigLeftFoot'];
const hands = ['mixamorigRightHand', 'mixamorigLeftHand'];
const move = (label, clip, extra = {}) => ({ label, clip, speed: 2.4, fade: 0.07, endAt: 0.95,
  cancelAt: 0.86, dodgeCancelAt: 0.84, windows: [[0.22, 0.8]], strikers: weapon,
  minSpeed: 0.7, strikeRadius: 0.2, damage: 14, knock: 2, power: 'light', lunge: 4, range: 2, cooldown: 0, ...extra });
const arrow = { kind: 'projectile', projectileStyle: 'arrow', strikers: [], projectileSpeed: 22,
  projectileRadius: 0.09, range: 17, lunge: 0, color: 0xc8e59a };

export const IMPORTED_MOVES = {
  archer: {
    punch: move('Quick arrow', 'Light', { ...arrow, speed: 1.5, events: [0.16], windows: [[0.1, 0.3]], cancelAt: 0.56, dodgeCancelAt: 0.5, damage: 10, cooldown: 0.38 }),
    heavy: move('Piercing shot', 'Heavy', { ...arrow, speed: 1.1, events: [0.75], windows: [[0.68, 0.83]], damage: 23, knock: 4, projectileSpeed: 29, cooldown: 2.6 }),
    kick: move('Archer kick', 'Kick', { strikers: feet, damage: 15, range: 1.4, knock: 4, cooldown: 1.5, color: 0xb5da7c }),
    skill1: move('Triple volley', 'Volley', { ...arrow, skill: true, speed: 1.1, events: [0.52, 0.67, 0.82], windows: [[0.45, 0.85]], dodgeCancelAt: 0.86, damage: 8, cooldown: 6 }),
    skill2: move('Hunter dive', 'Roll', { skill: true, kind: 'mobility', strikers: [], events: [0.1], windows: [[0.1, 0.36]],
      invulnerable: [0.1, 0.36], damage: 0, range: 0, speed: 2.4, lunge: 14, lungeDecay: 5, cooldown: 5, color: 0xb5da7c }),
  },
  greatsword: {
    punch: move('Crosscut', 'Light', { speed: 2.5, damage: 15, color: 0x8fcfff }),
    heavy: move('Breaker', 'Heavy', { speed: 1.6, damage: 28, power: 'heavy', knock: 6, cooldown: 2.4, color: 0xb8e6ff }),
    kick: move('Sword kick', 'Kick', { strikers: feet, range: 1.35, damage: 14, knock: 4, cooldown: 1.5 }),
    skill1: move('Skywheel', 'Spin', { skill: true, speed: 2.4, windows: [[0.2, 0.82]], damage: 25, range: 2.5, knock: 5, power: 'heavy', cooldown: 7, color: 0x77c6ff }),
    skill2: move('Steel slide', 'Slide', { skill: true, speed: 2.5, damage: 20, lunge: 14, lungeDecay: 5, range: 4.5, knock: 4, cooldown: 5, color: 0xd1f0ff }),
  },
  axe: {
    punch: move('Hook cut', 'Light', { speed: 3.4, damage: 16, color: 0xffb273 }),
    heavy: move('Skull splitter', 'Heavy', { speed: 2.6, damage: 29, knock: 6, power: 'heavy', cooldown: 2.8, color: 0xff9659 }),
    kick: move('Axe kick', 'Kick', { strikers: feet, speed: 2.5, range: 1.4, damage: 15, knock: 4, cooldown: 1.5 }),
    skill1: move('Whirlwind', 'Spin', { skill: true, speed: 3.4, damage: 26, power: 'heavy', knock: 5, cooldown: 7, color: 0xffb067 }),
    skill2: move('Leaping cleave', 'Rush', { skill: true, speed: 3.4, damage: 24, lunge: 15, lungeDecay: 5, range: 4.5, cooldown: 6, color: 0xffd1a2 }),
  },
  mutant: {
    punch: move('Claw swipe', 'Light', { strikers: hands, speed: 3.6, range: 1.7, strikeRadius: 0.27, damage: 16, color: 0xd6ed76 }),
    heavy: move('Rending claw', 'Heavy', { strikers: hands, speed: 2.7, range: 1.8, strikeRadius: 0.3, damage: 27, knock: 6, power: 'heavy', cooldown: 3, color: 0xc9e65e }),
    kick: move('Stomp', 'Kick', { kind: 'area', strikers: [], events: [0.73], windows: [[0.67, 0.83]], speed: 3.7, damage: 17, range: 1.8, knock: 3, cooldown: 3, color: 0xb1c86b }),
    skill1: move('Crater slam', 'Slam', { skill: true, kind: 'area', strikers: [], events: [0.73], windows: [[0.67, 0.83]], speed: 3.2,
      damage: 28, range: 2.8, knock: 7, power: 'heavy', cooldown: 8, color: 0xc3db71 }),
    skill2: move('Primal roar', 'Roar', { skill: true, kind: 'area', strikers: [], events: [0.5], windows: [[0.44, 0.6]], speed: 3.8,
      damage: 12, range: 3.5, knock: 8, cooldown: 7, color: 0xe1ef9d }),
  },
};
