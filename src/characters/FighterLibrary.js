import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Character } from './Character.js';
import { Mover } from './Mover.js';
import { FIGHTERS, FIGHTER_LIST } from './FighterCatalog.js';
import { FIGHTER_MOVES, fighterDefense } from '../combat/fighterMoves.js';
import { createRifle } from '../combat/Rifle.js';

export class FighterLibrary {
  constructor() { this.models = new Map(); }
  async load(progress = () => {}) {
    const loader = new GLTFLoader(); let done = 0;
    await Promise.all(FIGHTER_LIST.map(async config => {
      const gltf = await loader.loadAsync(config.url).catch(() => { throw new Error(`Could not load prepared fighter ${config.name}. Check assets/characters/generated.`); });
      this.models.set(config.id, gltf); progress(++done, FIGHTER_LIST.length);
    }));
    return this;
  }
  create(id, facing) {
    const profile = FIGHTERS[id], template = this.models.get(id);
    if (!profile || !template) throw new Error('Unknown or unloaded fighter: ' + id);
    const gltf = { scene: clone(template.scene), animations: template.animations };
    const character = new Character(gltf, { modelYaw: 0 }); character.startLocomotion(profile);
    const mover = new Mover(character, { walkSpeed: profile.walkSpeed, runSpeed: profile.runSpeed, accel: profile.accel, turnRate: profile.turnRate, facing });
    Object.assign(mover, { lockSpeed: profile.lockSpeed, sprintSpeed: profile.sprintSpeed, crouchSpeed: profile.crouchSpeed || 1 });
    const equipment = profile.weapon === 'rifle' ? createRifle(character) : null;
    return { profile, character, mover, equipment, moves: FIGHTER_MOVES[id], defense: fighterDefense(id) };
  }
}
