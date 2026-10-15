// Windows are normalized animation timeline events, measured against the trimmed
// clips below. A window can damage each victim once, shared by all strike points.
export const CLIP_TRIMS = { Punch: [0.14, 0.78], Kick: [0.12, 0.75], Heavy: [0.34, 0.67] };

export function attackPhase(move, progress) {
  if (move.windows.some(([from, to]) => progress >= from && progress < to)) return 'active';
  return progress < move.windows[0][0] ? 'startup' : 'recovery';
}

export const MOVES = {
  punch: {
    label: 'Punch combo', clip: 'Punch', speed: 1.6, fade: 0.07,
    endAt: 0.98, cancelAt: 0.8, windows: [[0.12, 0.24], [0.28, 0.43], [0.48, 0.72]], strikeRadius: 0.14,
    strikers: ['mixamorigRightHand', 'mixamorigLeftHand'], minSpeed: 2.2,
    damage: 7, knock: 0.7, power: 'light', lunge: 4.5,
  },
  kick: {
    label: 'Kick', clip: 'Kick', speed: 1.3, fade: 0.08,
    endAt: 0.98, cancelAt: 0.86, windows: [[0.28, 0.76]], strikeRadius: 0.18,
    strikers: ['mixamorigRightFoot', 'mixamorigLeftFoot'], minSpeed: 2.8,
    damage: 11, knock: 3.5, power: 'light', lunge: 3.0,
  },
  heavy: {
    requiresBat: true,
    label: 'Bat swing', clip: 'Heavy', speed: 1.6, fade: 0.1,
    endAt: 0.98, cancelAt: 0.84, windows: [[0.24, 0.66]], strikeRadius: 0.15,
    strikers: ['bat:tip', 'bat:mid', 'bat:base'], minSpeed: 3.0,
    damage: 26, knock: 7.5, power: 'heavy', lunge: 3.0,
  },
};

export const DEFENSE = {
  block: { clip: 'Block', speed: 1.6, hold: 0.45, damageTaken: 0.15, pushback: 0.4, arc: 75 },
  dodge: { clip: 'Roll', speed: 1.5, impulse: 6.5, decay: 3.2, iframeUntil: 0.6, endAt: 0.88, cooldown: 0.7 },
  hit:   { clip: 'Hit', speed: 1.5, endAt: 0.85 },
  down:  { clip: 'Down', speed: 1.3, hold: 0.5 },
  getUp: { clip: 'GetUp', speed: 1.3, endAt: 0.95 },
};

export const HIT_MAX_ANGLE = 100 * Math.PI / 180; // attacker can't hit things behind them
