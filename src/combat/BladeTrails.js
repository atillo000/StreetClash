import * as THREE from 'three';
import { elementalTextures } from './ElementalEffects.js';
// Samples actual animation strike points, so trails follow the blade/fist/foot.
// A single instanced draw call and fixed storage bound the cost of multi-hits.
export class BladeTrails{
 constructor(scene){
  this.limit=96;this.time=0;this.entries=Array.from({length:160},()=>({a:new THREE.Vector3(),b:new THREE.Vector3(),color:new THREE.Color(),life:0,width:.1}));this.cursor=0;
  this.mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}),160);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
  this.dummy=new THREE.Object3D();this.x=new THREE.Vector3();this.y=new THREE.Vector3();this.z=new THREE.Vector3();this.view=new THREE.Vector3();this.matrix=new THREE.Matrix4();this.color=new THREE.Color();
 }
 setBudget(count){this.limit=count<64?48:count<128?96:160;}
 sample(a,b,fighter,move){if(a.distanceToSquared(b)<.0001)return;const entry=this.entries[this.cursor++%this.limit];entry.a.copy(a);entry.b.copy(b);entry.life=.14;entry.color.set(move.artColor||move.color||fighter.profile.color);entry.width=fighter.profile.weapon?.18:.12;}
 update(dt){for(const e of this.entries)e.life=Math.max(0,e.life-dt);}
 render(camera){
  if(this.mesh.material.map!==elementalTextures.slash){this.mesh.material.map=elementalTextures.slash;this.mesh.material.needsUpdate=true;}
  let count=0;for(let i=0;i<this.limit;i++){const e=this.entries[i];if(e.life<=0)continue;this.dummy.position.copy(e.a).add(e.b).multiplyScalar(.5);this.x.subVectors(e.b,e.a);const length=this.x.length();this.x.normalize();this.view.subVectors(camera.position,this.dummy.position).normalize();this.y.crossVectors(this.view,this.x).normalize();this.z.crossVectors(this.x,this.y).normalize();this.matrix.makeBasis(this.x,this.y,this.z);this.dummy.quaternion.setFromRotationMatrix(this.matrix);this.dummy.scale.set(length+.08,e.width,1);this.dummy.updateMatrix();this.mesh.setMatrixAt(count,this.dummy.matrix);this.color.copy(e.color).multiplyScalar(e.life/.14);this.mesh.setColorAt(count++,this.color);}
  this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
 }
 clear(){for(const e of this.entries)e.life=0;this.mesh.count=0;}
}
