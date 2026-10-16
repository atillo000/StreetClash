import * as THREE from 'three';
const middle = new THREE.Vector3(), curl = new THREE.Vector3();
// Center of the curled grip between the thumb and fingers. A wrist/knuckle
// interpolation lies on the back of the palm and leaves a handle outside it.
export function palmWorld(character, side, out = new THREE.Vector3()) {
  const get = part => character.bone(`mixamorig${side}Hand${part}`);
  const hand = get(''), knuckle = get('Middle1') || get('Index1');
  const distal = get('Middle3'), thumb = get('Thumb2');
  if (knuckle && distal && thumb) {
    knuckle.getWorldPosition(middle); distal.getWorldPosition(curl);
    thumb.getWorldPosition(out).multiplyScalar(.5).addScaledVector(middle,.25).addScaledVector(curl,.25);
  } else {
    hand.getWorldPosition(out);
    if(knuckle)out.lerp(knuckle.getWorldPosition(middle),.8);
  }
  return out;
}
