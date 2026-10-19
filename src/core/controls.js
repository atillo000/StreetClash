// Numbered slots are consistent across the roster; J/K/L remain keyboard alternatives.
export const ATTACK_BINDINGS = [
  { move: 'punch', label: 'LMB', codes: ['Mouse0', 'KeyJ'] },
  { move: 'heavy', label: 'RMB', codes: ['Mouse2', 'KeyL'] },
  { move: 'kick', label: '1', codes: ['Digit1', 'KeyE', 'KeyK'] },
  { move: 'skill1', label: '2', codes: ['Digit2'] },
  { move: 'skill2', label: '3', codes: ['Digit3'] },
];

// Optional per-move bindings let a fighter add skills without changing other kits.
export function attackBindings(moves = {}) {
  const extra = Object.entries(moves)
    .filter(([, move]) => move.input && !move.sequenceOnly)
    .map(([id, move]) => ({ move: id, ...move.input }));
  return [...ATTACK_BINDINGS.filter(binding => !moves[binding.move]?.input), ...extra];
}

export function requestedAttacks(input, moves = {}) {
  return attackBindings(moves).filter(binding => binding.codes.some(code => input.pressed(code))).map(binding => binding.move);
}
