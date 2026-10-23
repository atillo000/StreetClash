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
    heavy: move('Crushing punch', 'Heavy', { strikers: hands, speed: 2.7, windows: [[0.2, 0.34]], range: 1.8, strikeRadius: 0.3, damage: 27, knock: 6, power: 'heavy', cooldown: 3, color: 0xc9e65e }),
    kick: move('Stomp', 'Kick', { kind: 'area', strikers: [], events: [0.73], windows: [[0.67, 0.83]], speed: 3.7, damage: 17, range: 1.8, knock: 3, cooldown: 3, color: 0xb1c86b }),
    skill1: move('Crater slam', 'Slam', { skill: true, kind: 'area', strikers: [], events: [0.44], windows: [[0.4, 0.52]], speed: 3.2,
      damage: 28, range: 2.8, knock: 7, power: 'heavy', cooldown: 8, color: 0xc3db71 }),
    skill2: move('Primal roar', 'Roar', { skill: true, kind: 'area', strikers: [], events: [0.5], windows: [[0.44, 0.6]], speed: 3.8,
      damage: 12, range: 3.5, knock: 8, cooldown: 7, color: 0xe1ef9d }),
  },
};

// ULTIMATES: internal stages use the same collision and projectile systems as
// ordinary attacks. Only the last damaging stage knocks down its victim.
const bow = IMPORTED_MOVES.archer, sword = IMPORTED_MOVES.greatsword;
const axe = IMPORTED_MOVES.axe, mutant = IMPORTED_MOVES.mutant;
bow.ultimateStart = move('Nock arrows', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 2.8, fade: 0.045,
  windows: [], strikers: [], damage: 0, knock: 0, lunge: 0,
  endAt: 0.7, cancelAt: 0.7, dodgeCancelAt: 0.7, color: 0xb5da7c,
});
bow.ultimateStrike = move('Quickshot', 'UltimateStrike', {
  ...arrow, sequenceOnly: true, skill: true, speed: 2.6, fade: 0.035,
  events: [0.12], windows: [[0.08, 0.28]], damage: 9, knock: 0.25,
  endAt: 0.78, cancelAt: 0.78, dodgeCancelAt: 0.78,
});
bow.ultimateCharge = move('Overdraw', 'UltimateCharge', {
  sequenceOnly: true, skill: true, speed: 1.5, fade: 0.035,
  windows: [], strikers: [], damage: 0, knock: 0, lunge: 0,
  endAt: 0.28, cancelAt: 0.28, dodgeCancelAt: 0.28, color: 0xb5da7c,
});
bow.ultimateFinisher = move('Heartseeker', 'UltimateFinisher', {
  ...arrow, sequenceOnly: true, skill: true, speed: 2.2, fade: 0.035,
  events: [0.12], windows: [[0.08, 0.3]], damage: 22, knock: 5, power: 'heavy',
  projectileSpeed: 30, projectileRadius: 0.13, color: 0xe1f5aa,
  endAt: 0.88, cancelAt: 0.88, dodgeCancelAt: 0.88,
});
bow.ultimate = {
  label: 'Heartseeker', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateStrike', 'ultimateCharge', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

sword.ultimateStart = move('Opening crosscut', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 3.6, fade: 0.045,
  windows: [[0.22, 0.64]], damage: 12, knock: 0.6, lunge: 3,
  endAt: 0.84, cancelAt: 0.84, dodgeCancelAt: 0.84, color: 0x79bded,
});
sword.ultimateStrike = move('Skywheel', 'UltimateStrike', {
  sequenceOnly: true, skill: true, speed: 3, fade: 0.045,
  windows: [[0.2, 0.42], [0.52, 0.76]], damage: 10, knock: 0.6, lunge: 2,
  endAt: 0.88, cancelAt: 0.88, dodgeCancelAt: 0.88, color: 0x79bded,
});
sword.ultimateFinisher = move('Skybreaker', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, speed: 2.8, fade: 0.045,
  windows: [[0.48, 0.8]], damage: 24, knock: 7, power: 'heavy', lunge: 4,
  endAt: 0.94, cancelAt: 0.94, dodgeCancelAt: 0.94, color: 0xb8e6ff,
});
sword.ultimate = {
  label: 'Skybreaker', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

axe.ultimateStart = move('Opening combination', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 4.5, fade: 0.045,
  windows: [[0.18, 0.34], [0.48, 0.66]], damage: 8, knock: 0.5, lunge: 3,
  endAt: 0.86, cancelAt: 0.86, dodgeCancelAt: 0.86, color: 0xed9664,
});
axe.ultimateStrike = move('Cyclone cleave', 'UltimateStrike', {
  sequenceOnly: true, skill: true, speed: 4, fade: 0.045,
  windows: [[0.22, 0.72]], damage: 14, knock: 0.8, lunge: 2,
  endAt: 0.86, cancelAt: 0.86, dodgeCancelAt: 0.86, color: 0xed9664,
});
axe.ultimateFinisher = move('Execution chop', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, speed: 3.6, fade: 0.045,
  windows: [[0.38, 0.72]], damage: 24, knock: 7, power: 'heavy', lunge: 3,
  endAt: 0.92, cancelAt: 0.92, dodgeCancelAt: 0.92, color: 0xffc28e,
});
axe.ultimate = {
  label: 'Cyclone execution', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

mutant.ultimateStart = move('Primal warning', 'UltimateStart', {
  sequenceOnly: true, skill: true, speed: 3.5, fade: 0.045,
  windows: [], strikers: [], damage: 0, knock: 0, lunge: 0,
  endAt: 0.25, cancelAt: 0.25, dodgeCancelAt: 0.25, color: 0xb5cb61,
});
mutant.ultimateStrike = move('Rending swipe', 'UltimateStrike', {
  sequenceOnly: true, skill: true, speed: 3.4, fade: 0.045, strikers: hands,
  windows: [[0.2, 0.72]], strikeRadius: 0.3, range: 1.8,
  damage: 18, knock: 0.7, lunge: 3, endAt: 0.86, cancelAt: 0.86, dodgeCancelAt: 0.86, color: 0xb5cb61,
});
mutant.ultimateFinisher = move('Cataclysm', 'UltimateFinisher', {
  sequenceOnly: true, skill: true, kind: 'area', strikers: [], speed: 3.2, fade: 0.045,
  // The Creature Pack jump attack lands around 44%, earlier than the NPC jump.
  events: [0.44], windows: [[0.4, 0.52]], damage: 26, knock: 8, power: 'heavy',
  range: 3.4, lunge: 0, endAt: 0.94, cancelAt: 0.94, dodgeCancelAt: 0.94, color: 0xd5e884,
});
mutant.ultimate = {
  label: 'Cataclysm', input: { label: '4', codes: ['Digit4'] },
  sequence: ['ultimateStart', 'ultimateStrike', 'ultimateFinisher'],
  cooldown: 2, skill: true, playerOnly: true,
};

// PALADIN: sword contacts use equipment markers; kick uses feet. The shield
// remains on the left arm and guard uses the dedicated sword/shield clips.
IMPORTED_MOVES.paladin = {
  punch: move('Sword cut', 'Light', { speed: 2.5, windows: [[0.22,0.68]], damage: 12, knock: 1.2, lunge: 3, color: 0xf3d17f }),
  heavy: move('Guard breaker', 'Heavy', { speed: 2.6, windows: [[0.28,0.72]], damage: 26, knock: 5, power: 'heavy', cooldown: 2.5, lunge: 3, color: 0xffdf9a }),
  kick: move('Armored kick', 'Kick', { strikers: feet, speed: 2.5, windows: [[0.25,0.65]], damage: 14, knock: 3.5, range: 1.4, cooldown: 1.4, color: 0xf3d17f }),
  skill1: move('Radiant advance', 'Rush', { skill: true, speed: 3, windows: [[0.24,0.72]], damage: 20, knock: 2.5, lunge: 13, lungeDecay: 5, range: 4.5, cooldown: 5, color: 0xffd97a }),
  skill2: move('Consecration', 'Radiant', { skill: true, kind: 'area', strikers: [], speed: 2.8, events: [0.5], windows: [[0.42,0.6]], damage: 20, knock: 4, range: 3, lunge: 0, cooldown: 7, color: 0xffdf9a }),
  ultimateStart: move('Radiant oath', 'UltimateStart', { sequenceOnly: true, skill: true, speed: 3, windows: [], strikers: [], damage: 0, knock: 0, lunge: 0, endAt: 0.25, cancelAt: 0.25, dodgeCancelAt: 0.25, color: 0xf3d17f }),
  ultimateStrike: move('Oathkeeper cut', 'UltimateStrike', { sequenceOnly: true, skill: true, speed: 2.4, windows: [[0.2,0.7]], damage: 16, knock: 0.6, lunge: 3, endAt: 0.86, color: 0xffd97a }),
  ultimateFinisher: move('Judgment', 'UltimateFinisher', { sequenceOnly: true, skill: true, kind: 'area', strikers: [], speed: 1.8, events: [0.55], windows: [[0.45,0.65]], damage: 28, knock: 7, power: 'heavy', range: 3.1, lunge: 0, endAt: 0.9, color: 0xffe8b1 }),
  ultimate: { label: 'Judgment', input: { label: '4', codes: ['Digit4'] }, sequence: ['ultimateStart','ultimateStrike','ultimateFinisher'], cooldown: 22, skill: true, playerOnly: true },
};

const teeth = ['mixamorigHead', ...hands];
IMPORTED_MOVES.zombie = {
  punch: move('Claw rake', 'Light', { strikers: hands, speed: 2.8, windows: [[0.22,0.72]], damage: 12, knock: 1.1, range: 1.6, lunge: 3, strikeRadius: 0.25, color: 0xc5d981 }),
  heavy: move('Neck bite', 'Heavy', { strikers: teeth, speed: 2.6, windows: [[0.28,0.7]], damage: 24, knock: 5, power: 'heavy', range: 1.5, lunge: 3, strikeRadius: 0.28, cooldown: 2.8, color: 0xd8e9a0 }),
  kick: move('Parasite shriek', 'Kick', { kind: 'area', strikers: [], speed: 3, events: [0.3], windows: [[0.24,0.4]], damage: 12, knock: 3, range: 2.4, lunge: 0, cooldown: 2.2, color: 0xc5d981 }),
  skill1: move('Frenzied bite', 'Frenzy', { skill: true, strikers: teeth, speed: 3, windows: [[0.2,0.74]], damage: 18, knock: 2.5, range: 4.5, lunge: 12, lungeDecay: 5, strikeRadius: 0.28, cooldown: 5, color: 0xd8e9a0 }),
  skill2: move('Grave crawl', 'Crawl', { skill: true, kind: 'mobility', strikers: [], speed: 2.8, windows: [[0.1,0.35]], events: [0.1], invulnerable: [0.1,0.32], damage: 0, knock: 0, range: 0, lunge: 13, lungeDecay: 5, endAt: 0.88, cooldown: 5, color: 0xc5d981 }),
  ultimateStart: move('Feeding scream', 'UltimateStart', { sequenceOnly: true, skill: true, speed: 3.5, windows: [], strikers: [], damage: 0, knock: 0, lunge: 0, endAt: 0.25, cancelAt: 0.25, dodgeCancelAt: 0.25, color: 0xc5d981 }),
  ultimateStrike: move('Frenzied rake', 'UltimateStrike', { sequenceOnly: true, skill: true, strikers: hands, speed: 3.2, windows: [[0.22,0.7]], damage: 10, knock: 0.5, range: 1.6, lunge: 3, strikeRadius: 0.25, endAt: 0.84, color: 0xc5d981 }),
  ultimateFinisher: move('Parasite feast', 'UltimateFinisher', { sequenceOnly: true, skill: true, strikers: teeth, speed: 3, windows: [[0.28,0.74]], damage: 26, knock: 7, power: 'heavy', range: 1.5, lunge: 3, strikeRadius: 0.28, endAt: 0.9, color: 0xe1efb0 }),
  ultimate: { label: 'Parasite feast', input: { label: '4', codes: ['Digit4'] }, sequence: ['ultimateStart','ultimateStrike','ultimateStrike','ultimateFinisher'], cooldown: 20, skill: true, playerOnly: true },
};
