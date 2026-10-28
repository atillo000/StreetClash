import * as THREE from 'three';
import { soldierLoadout } from './SoldierLoadout.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Character } from './Character.js';
import { batchSkinnedPrimitives } from './SkinnedBatches.js';
import { Mover } from './Mover.js';
import { FIGHTERS, FIGHTER_LIST } from './FighterCatalog.js';
import { FIGHTER_MOVES, fighterDefense } from '../combat/fighterMoves.js';
import { FighterWeapons } from './FighterWeapons.js';
import { styleFighterMaterial } from '../core/ArtDirection.js';
import { pacedProfile } from '../core/Pacing.js';

export class FighterLibrary {
  constructor() { this.models = new Map(); }
  async load(progress = () => {}) {
    const loader = new GLTFLoader(); let done = 0;
    await Promise.all(FIGHTER_LIST.map(async config => {
      const gltf = await loader.loadAsync(config.url).catch(() => { throw new Error(`Could not load prepared fighter ${config.name}. Check assets/characters/generated.`); });
      gltf.userData={batchedPrimitives:batchSkinnedPrimitives(gltf)};
      this.models.set(config.id, gltf); progress(++done, FIGHTER_LIST.length);
    }));
    this.weapons = await new FighterWeapons().load();
    const response = await fetch('./assets/characters/generated/gait-calibration.json');
    if (!response.ok) throw new Error('Missing gait calibration data');
    this.gaits = await response.json();
    return this;
  }
  create(id, facing) {
    const template = this.models.get(id);
    const profile = FIGHTERS[id] ? pacedProfile(FIGHTERS[id]) : null;
    if (!profile || !template) throw new Error('Unknown or unloaded fighter: ' + id);
    const gltf = { scene: clone(template.scene), animations: template.animations };
    // SkeletonUtils clones can retain cached skin bounds in the wrong bind
    // frame. Refresh bone matrices before measuring; otherwise this FBX's
    // exported .022 root scale would be applied twice and create a 45x boss.
    gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(mesh=>{if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.boundingBox=null;}});
    const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
    const modelScale=profile.enemyOnly?profile.height/size.y:1;
    const gait=this.gaits[id]||this.gaits.mutant;
    const character = new Character(gltf, { scale:modelScale, modelYaw: 0, gaitCalibration:gait }); character.startLocomotion(profile);
    const styled=new Set();
    character.model.traverse(mesh=>{if(mesh.isMesh)for(const material of [].concat(mesh.material))if(!styled.has(material)){
      styleFighterMaterial(material,profile.color);styled.add(material);
    }});
    const mover = new Mover(character, { walkSpeed: profile.walkSpeed, runSpeed: profile.runSpeed, accel: profile.accel, turnRate: profile.turnRate, facing });
    Object.assign(mover, { lockSpeed: profile.lockSpeed, sprintSpeed: profile.sprintSpeed, crouchSpeed: profile.crouchSpeed || 1 });
    character.mixer.update(0); character.root.updateMatrixWorld(true);
    const equipment = id==='soldier'?soldierLoadout(this.weapons,character,profile,FIGHTER_MOVES[id]):this.weapons.create(profile.weapon, character);
    if(id==='soldier')equipment.pistolGait=this.gaits.soldierPistol;
    if(!equipment?.realistic)equipment?.model?.traverse(mesh=>{if(mesh.isMesh)for(const material of [].concat(mesh.material))styleFighterMaterial(material,profile.color);});
    return { profile, character, mover, equipment, moves: FIGHTER_MOVES[id], defense: fighterDefense(id) };
  }
}
