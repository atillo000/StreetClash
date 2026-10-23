import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { palmWorld } from './HandSocket.js';

// Handle centers measured on the supplied geometry AFTER its axis conversion,
// in source units. The center of the complete asset is not the grip center:
// the bow's curved limbs and the axe head make their bounds asymmetric.
export const WEAPONS = {
  rifle: { url:'./assets/Weapons/realistic/rifle.glb',length:1.05,axis:'firearm',realistic:true,
    handle:[0,-.035,-.31],muzzle:[0,.022,.595] },
  pistol: { url:'./assets/Weapons/realistic/pistol.glb',length:.25,axis:'firearm',realistic:true,
    handle:[0,.005,-.005],muzzle:[0,.061,.174],
    omit:['service_pistol_pistol_b','service_pistol_slide_b','service_pistol_hammer_b','service_pistol_trigger_b','service_pistol_magazine_loaded','service_pistol_magazine_empty','service_pistol_bullet'] },
  bow: { url: './assets/Weapons/long-bow.glb', length: 1.45, axis: 'x', grip: 0.5,
    handle: [-0.020105, 0, 0.072845] },
  greatsword: { url: './assets/Weapons/generated/great-sword.glb', length: 1.45, axis: 'z', grip: 0.15,
    handle: [-0.000034, -0.384982, 0.043674] },
  paladin: { url: './assets/Weapons/generated/great-sword.glb', length: 1.05, axis: 'z', grip: 0.15,
    handle: [-0.000034, -0.384982, 0.043674] },
  axe: { url: './assets/Weapons/battle-axe.glb', length: 1.15, axis: 'x', grip: 0.17,
    handle: [-0.018299, -0.260898, -0.063499] },
};

// Build a complete mounting frame, including roll. +Y runs from the pommel
// toward the blade/upper limb; +Z faces the axe edge/bow limbs forward.
function frame(up, forward, out) {
  const y = up.clone().normalize();
  const z = forward.clone().addScaledVector(y, -forward.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  z.crossVectors(x, y).normalize();
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// A small original shield, mounted to the left hand, complements the supplied
// Paladin's otherwise unarmed model. It is independent of the sword's frame.
function paladinShield(character) {
  const root=new THREE.Group(),shape=new THREE.Shape();
  shape.moveTo(-0.29,0.36);shape.lineTo(0.29,0.36);shape.lineTo(0.33,0.1);
  shape.lineTo(0.23,-0.23);shape.lineTo(0,-0.44);shape.lineTo(-0.23,-0.23);shape.lineTo(-0.33,0.1);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:0.055,bevelEnabled:true,bevelSize:0.018,bevelThickness:0.012,bevelSegments:1,steps:1});
  const rimMaterial=new THREE.MeshStandardMaterial({color:0xd9b66b,roughness:0.65,metalness:0.2});
  const faceMaterial=new THREE.MeshStandardMaterial({color:0x334d6a,roughness:0.8,metalness:0.05});
  const rim=new THREE.Mesh(geometry,rimMaterial),face=new THREE.Mesh(geometry,faceMaterial);
  face.scale.set(.86,.86,.75);face.position.z=.035;root.add(rim,face);
  const bossGeometry=new THREE.SphereGeometry(.085,10,6),boss=new THREE.Mesh(bossGeometry,rimMaterial);boss.scale.z=.5;boss.position.set(0,0,.11);root.add(boss);
  root.name='Paladin shield';root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});character.root.add(root);
  const hand=character.bone('mixamorigLeftHand'),point=new THREE.Vector3(),rotation=new THREE.Quaternion(),inverse=new THREE.Quaternion();
  character.root.updateMatrixWorld(true);character.root.getWorldQuaternion(inverse).invert();hand.getWorldQuaternion(rotation).premultiply(inverse);
  const mounting=rotation.clone().invert();
  return {root,update(){character.root.updateMatrixWorld(true);palmWorld(character,'Left',point);character.root.worldToLocal(point);root.position.copy(point);
    character.root.getWorldQuaternion(inverse).invert();hand.getWorldQuaternion(rotation).premultiply(inverse).multiply(mounting);root.quaternion.copy(rotation);root.updateMatrixWorld(true);},
    dispose(){root.removeFromParent();geometry.dispose();bossGeometry.dispose();rimMaterial.dispose();faceMaterial.dispose();}};
}

export class FighterWeapons {
  constructor() { this.models = new Map(); }
  async load() {
    const loader = new GLTFLoader();
    await Promise.all(Object.entries(WEAPONS).map(async ([id, config]) => {
      this.models.set(id, (await loader.loadAsync(config.url)).scene);
    }));
    return this;
  }
  create(id, character) {
    const config = WEAPONS[id], source = this.models.get(id);
    if (!config || !source) return null;
    const root = new THREE.Group(), model = source.clone(true);
    root.name = id + ' weapon'; root.add(model);
    if (config.axis === 'x') model.rotation.z = Math.PI / 2;
    else if (config.axis === 'z') model.rotation.x = Math.PI / 2;
    else if (config.axis === 'firearm') model.rotation.y = -Math.PI / 2;
    for(const name of config.omit||[])model.getObjectByName(name)?.removeFromParent();
    const bounds = new THREE.Box3().setFromObject(model);
    const height = config.axis === 'firearm' ? bounds.max.z-bounds.min.z : bounds.max.y-bounds.min.y;
    const scale = config.length / height;
    model.scale.setScalar(scale);
    model.position.fromArray(config.handle).multiplyScalar(-scale);
    character.root.add(root);
    const marker = (name, point) => { const m = new THREE.Object3D(); m.name = name; m.position.copy(point); root.add(m); return m; };
    const tip = marker('blade tip', new THREE.Vector3(0,(bounds.max.y-config.handle[1])*scale,0));
    const mid = marker('blade middle', new THREE.Vector3(0,tip.position.y*.55,0));
    const base = marker('blade base', new THREE.Vector3(0,id==='greatsword'?.23:.1,0));
    const muzzle = marker('muzzle', new THREE.Vector3(0,id==='rifle'?(.055-config.handle[1])*scale:0,id==='rifle'?(bounds.max.z-config.handle[2])*scale:.15));
    if(config.muzzle)muzzle.position.fromArray(config.muzzle).sub(new THREE.Vector3().fromArray(config.handle)).multiplyScalar(scale);
    const side = id === 'bow' ? 'Left' : 'Right', hand = character.bone('mixamorig'+side+'Hand');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
    const q = new THREE.Quaternion(), inverse = new THREE.Quaternion(), handRotation = new THREE.Quaternion();
    const mounting = new THREE.Quaternion(), swing = new THREE.Quaternion(), mountedAxis = new THREE.Vector3();
    const longAxis = new THREE.Vector3(0,id==='rifle'?0:1,id==='rifle'?1:0);
    character.root.updateMatrixWorld(true);
    character.root.getWorldQuaternion(inverse).invert();
    hand.getWorldQuaternion(handRotation).premultiply(inverse).normalize();
    if (id === 'rifle') {
      palmWorld(character,'Right',a); palmWorld(character,'Left',b);
      character.root.worldToLocal(a); character.root.worldToLocal(b); direction.subVectors(b,a).normalize();
      const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
      const y = new THREE.Vector3().crossVectors(direction,x).normalize();
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,direction));
    } else if(id==='pistol'){q.identity();
    } else {
      // Across the knuckles, not along the fingers. The left hand uses -X.
      direction.set(side==='Left'?-1:1,0,0).applyQuaternion(handRotation);
      if (id === 'greatsword') {
        // The supporting left hand holds the POMMEL, below the right hand.
        palmWorld(character,'Right',a); palmWorld(character,'Left',b);
        character.root.worldToLocal(a); character.root.worldToLocal(b); direction.subVectors(a,b).normalize();
      }
      frame(direction,new THREE.Vector3(0,0,1),q);
    }
    mounting.copy(handRotation).invert().multiply(q);
    const materials = new Set();
    model.traverse(o => { if (o.isMesh) {
      o.castShadow=true; o.receiveShadow=true;
      o.material=[].concat(o.material).map(m=>{const copy=m.clone();materials.add(copy);return copy;});
      if(o.material.length===1)o.material=o.material[0];
    }});
    const shield=id==='paladin'?paladinShield(character):null;
    const equipment = { root, model, shield: shield?.root, grip: root, tip, mid, base, muzzle, id, kick() {},
      update(stowed = false) {
        root.visible = id==='paladin' || !stowed;
        shield?.update();
        character.root.updateMatrixWorld(true);
        palmWorld(character,side,a); character.root.worldToLocal(a); root.position.copy(a);
        character.root.getWorldQuaternion(inverse).invert();
        hand.getWorldQuaternion(q).premultiply(inverse).normalize().multiply(mounting);
        if (id === 'greatsword' || id === 'rifle') {
          palmWorld(character,'Left',b); character.root.worldToLocal(b);
          const distance=b.distanceTo(a);
          // Sword points AWAY from the lower hand; rifle points TOWARD its foregrip.
          direction.subVectors(id==='greatsword'?a:b,id==='greatsword'?b:a).normalize();
          mountedAxis.copy(longAxis).applyQuaternion(q);
          if(distance>.08&&distance<.5&&mountedAxis.dot(direction)>.2)q.premultiply(swing.setFromUnitVectors(mountedAxis,direction));
        }
        root.quaternion.copy(q).normalize(); root.updateMatrixWorld(true);
      },
      dispose() { shield?.dispose(); root.removeFromParent(); for (const material of materials) material.dispose(); },
    };
    equipment.update(); return equipment;
  }
}
