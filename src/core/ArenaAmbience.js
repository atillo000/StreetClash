import * as THREE from 'three';
import { batchStatic } from './WarehouseArena.js';

// A few anchored visual set pieces breathe/lean. Their broad static collision
// footprints remain unchanged; these are not Rapier soft bodies or hazards.
export class ArenaAmbience{
 constructor(scene){this.group=new THREE.Group();this.group.name='Living district landmarks';scene.add(this.group);this.entries=[];this.time=0;this.theme='street';this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
 add(root,{theme=null,amplitude=.012,speed=.8,phase=0}={}){
  const position=root.position.clone(),quaternion=root.quaternion.clone(),scale=root.scale.clone();root.removeFromParent();root.position.set(0,0,0);root.quaternion.identity();root.scale.setScalar(1);root.updateMatrixWorld(true);batchStatic(root);
  root.position.copy(position);root.quaternion.copy(quaternion);root.scale.copy(scale);this.group.add(root);this.entries.push({root,theme,amplitude,speed,phase,rotation:root.rotation.clone(),scale:scale.clone()});this.setTheme(this.theme);return root;
 }
 setTheme(theme){this.theme=theme;for(const e of this.entries)e.root.visible=!e.theme||e.theme===theme;}
 update(dt,player){this.time+=dt;for(const e of this.entries){if(!e.root.visible)continue;const active=!this.reduced&&(!player||e.root.position.distanceToSquared(player)<65**2);const t=this.time*e.speed+e.phase,a=active?e.amplitude:0;
   e.root.rotation.x=e.rotation.x+Math.sin(t*.73)*a*.35;e.root.rotation.z=e.rotation.z+Math.sin(t)*a;e.root.scale.set(e.scale.x*(1+Math.sin(t+.9)*a*.4),e.scale.y*(1+Math.sin(t*1.2)*a*.65),e.scale.z);
  }}
}
