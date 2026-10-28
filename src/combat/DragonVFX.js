import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

let template,pending;
export function loadDragonAsset(){return pending??=new GLTFLoader().loadAsync('assets/vfx/dragon/dragon.glb').then(gltf=>{template=gltf.scene;});}

// A real 1,262-triangle CC0 creature: textured volume, rigged wings, jaw and
// tail. Only the trailing flame wisps are sprites. Heading follows the actual
// projectile, never the camera. Instances share geometry/maps and are pooled.
export class DragonVFX{
 constructor(parent){this.group=new THREE.Group();this.group.name='3D spectral dragon';parent.add(this.group);this.group.visible=false;this.flight=new THREE.Group();this.group.add(this.flight);this.bones=new Map();this.materials=[];this.rotation=new THREE.Quaternion();this.axis=new THREE.Vector3(1,0,0);}
 init(){
  if(this.model||!template)return;const model=clone(template),pose=new THREE.Group();pose.add(model);pose.updateMatrixWorld(true);
  const head=model.getObjectByName('jaw_upper'),base=model.getObjectByName('base'),a=new THREE.Vector3(),b=new THREE.Vector3();head.getWorldPosition(a);base.getWorldPosition(b);a.sub(b).setY(0);pose.rotation.y=-Math.atan2(a.x,a.z);pose.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(pose),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=2.6/size.z;head.getWorldPosition(a);pose.scale.setScalar(scale);pose.position.set(-a.x*scale,-center.y*scale,.25-a.z*scale);
  model.traverse(o=>{if(o.isBone)this.bones.set(o.name,{bone:o,rest:o.quaternion.clone()});if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;o.material=o.material.clone();o.material.transparent=true;o.material.depthWrite=true;o.material.roughness=.65;o.material.metalness=.08;o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=.25;this.materials.push(o.material);}});
  this.flight.add(pose);this.model=model;
 }
 pose(name,angle,axis=this.axis){const entry=this.bones.get(name);if(entry)entry.bone.quaternion.copy(entry.rest).multiply(this.rotation.setFromAxisAngle(axis,angle));}
 update(s,fade){
  this.group.visible=s.kind==='dragon'&&fade>0;if(!this.group.visible)return;this.init();if(!this.model)return;
  const t=s.time;this.flight.rotation.x=-Math.atan2(s.direction.y,Math.hypot(s.direction.x,s.direction.z));this.flight.position.y=Math.sin(t*11)*.035;
  for(const side of ['L','R']){const sign=side==='L'?1:-1;this.pose('wing_upper_'+side,sign*(.3+Math.sin(t*12)*.42));this.pose('wing_lower_'+side,sign*(.12+Math.sin(t*12-.7)*.2));this.pose('leg_front_upper_'+side,.25);this.pose('leg_back_upper_'+side,-.2);}
  for(let i=1;i<=3;i++)this.pose('tail'+i,Math.sin(t*9-i*.7)*.14);this.pose('jaw_lower',.17+Math.sin(t*8)*.04);
  const color=s.material.color;for(const material of this.materials){material.color.set(0xffffff).lerp(color,.2);material.emissive.copy(color);material.emissiveIntensity=.25+Math.sin(t*13)*.04;material.opacity=.96*fade;}
 }
 render(){}
}
