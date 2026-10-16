// Numbered slots are consistent across the roster; J/K/L remain keyboard alternatives.
export const ATTACK_BINDINGS = [
  { move: 'punch', label: 'LMB', codes: ['Mouse0', 'KeyJ'] },
  { move: 'heavy', label: 'RMB', codes: ['Mouse2', 'KeyL'] },
  { move: 'kick', label: '1', codes: ['Digit1', 'KeyE', 'KeyK'] },
  { move: 'skill1', label: '2', codes: ['Digit2'] },
  { move: 'skill2', label: '3', codes: ['Digit3'] },
];

export function requestedAttacks(input) {
  return ATTACK_BINDINGS.filter(binding => binding.codes.some(code => input.pressed(code))).map(binding => binding.move);
}
