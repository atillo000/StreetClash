import * as THREE from 'three';

// Short luminous streaks along confirmed projectile travel. These never deal
// damage and never extend past the first actual body/cover/ground contact.
export class BulletTracers{
 constructor(scene,capacity=128){
  this.slots=Array.from({length:capacity},()=>({from:new THREE.Vector3(),to:new THREE.Vector3(),life:0}));this.next=0;
  this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.025,1),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),capacity);
  this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
  this.dummy=new THREE.Object3D();this.direction=new THREE.Vector3();this.forward=new THREE.Vector3(0,0,1);this.color=new THREE.Color();
 }
 add(from,to,color=0xffda8e){if(from.distanceToSquared(to)<1e-6)return;const s=this.slots[this.next++%this.slots.length];s.from.copy(from);s.to.copy(to);s.life=.1;s.color=color;}
 update(dt){let count=0;for(const s of this.slots){s.life=Math.max(0,s.life-dt);if(s.life<=0)continue;this.direction.subVectors(s.to,s.from);const length=this.direction.length();this.dummy.position.copy(s.from).lerp(s.to,.5);this.dummy.quaternion.setFromUnitVectors(this.forward,this.direction.normalize());const fade=s.life/.1;this.dummy.scale.set(.65+fade*.35,.65+fade*.35,length);this.dummy.updateMatrix();this.mesh.setMatrixAt(count,this.dummy.matrix);this.color.set(s.color).multiplyScalar(fade);this.mesh.setColorAt(count++,this.color);}this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;}
 clear(){for(const s of this.slots)s.life=0;this.mesh.count=0;this.next=0;}
}
