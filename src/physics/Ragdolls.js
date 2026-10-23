import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Terminal reactions only. Twelve constrained segments follow the supplied
// humanoid skeleton. Living hitboxes/controllers never use this visual pose.
const SEGMENTS=[
 ['Hips','Spine',-1,.085],['Spine','Neck',0,.10],['Neck','Head',1,.065],
 ['LeftArm','LeftForeArm',1,.045],['LeftForeArm','LeftHand',3,.04],
 ['RightArm','RightForeArm',1,.045],['RightForeArm','RightHand',5,.04],
 ['LeftUpLeg','LeftLeg',0,.06],['LeftLeg','LeftFoot',7,.05],
 ['RightUpLeg','RightLeg',0,.06],['RightLeg','RightFoot',9,.05],['Head','HeadTop_End',2,.085]
];
const GROUP=(8<<16)|5;
export class Ragdolls{
 constructor(physics){this.enabled=false;this.physics=physics;this.world=physics.world;this.entries=new Map();this.limit=2;this.p=new THREE.Vector3();this.q=new THREE.Quaternion();this.parentQ=new THREE.Quaternion();this.y=new THREE.Vector3(0,1,0);}
 setBudget(count){this.limit=count<128?2:3;const active=[...this.entries.values()].filter(e=>e.active);while(active.length>this.limit)this.freeze(active.shift());}
 start(fighter,attacker){
  if(!this.enabled)return false; // Authored death animations are the default.
  if(fighter.profile.boss||fighter.inactive||this.entries.has(fighter))return false;
  const character=fighter.character,parts=SEGMENTS.map(([a,b])=>{
   const bone=character.bone('mixamorig'+a);let end=character.bone('mixamorig'+b);
   if(b==='HeadTop_End'&&!end&&bone)end={getWorldPosition(out){const q=bone.getWorldQuaternion(new THREE.Quaternion());return out.set(0,fighter.height*.1,0).applyQuaternion(q).add(bone.getWorldPosition(new THREE.Vector3()));}};
   return[bone,end];
  });
  if(parts.some(([a,b])=>!a||!b))return false;
  const active=[...this.entries.values()].filter(e=>e.active);if(active.length>=this.limit)this.freeze(active[0]);
  character.root.updateMatrixWorld(true);
  const dir=attacker?fighter.position.clone().sub(attacker.position).setY(0).normalize():new THREE.Vector3(0,0,1);
  const entry={fighter,character,age:0,active:true,segments:[],saved:[]};
  const push=fighter.lastHitInfo?.periodic?0:Math.min(4,Math.max(.7,fighter.mover.impulse.length()));
  for(let i=0;i<parts.length;i++){
   const [bone,end]=parts[i],a=bone.getWorldPosition(new THREE.Vector3()),b=end.getWorldPosition(new THREE.Vector3()),length=Math.max(.025,a.distanceTo(b)),direction=b.clone().sub(a).normalize(),rotation=new THREE.Quaternion().setFromUnitVectors(this.y,direction),center=a.clone().add(b).multiplyScalar(.5),radius=i===11?fighter.height*.065:Math.min(length*.4,fighter.height*SEGMENTS[i][3]);
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(center.x,center.y,center.z).setRotation(rotation).setLinvel(dir.x*push,push?1.5:0,dir.z*push).setLinearDamping(1.2).setAngularDamping(3).setAdditionalSolverIterations(2).setCanSleep(true).setCcdEnabled(true));
   this.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(.005,length/2-radius),radius).setDensity(350).setFriction(.8).setRestitution(.03).setCollisionGroups(GROUP),body);
   const offset=rotation.clone().invert().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
   const segment={body,bone,length,radius,ground:this.physics.arena.groundHeight(center.x,center.z),offset,rotation:rotation.clone(),position:center.clone()};entry.segments.push(segment);
   entry.saved.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone()});
   const parent=SEGMENTS[i][2];if(parent>=0){const upper=entry.segments[parent],anchor1=a.clone().sub(upper.position).applyQuaternion(upper.rotation.clone().invert()),anchor2=a.clone().sub(center).applyQuaternion(rotation.clone().invert());this.world.createImpulseJoint(RAPIER.JointData.spherical(anchor1,anchor2),upper.body,body,true).setContactsEnabled(false);}
  }
  character.ragdoll=true;this.entries.set(fighter,entry);return true;
 }
 freeze(entry){if(!entry.active)return;for(const s of entry.segments){s.position.copy(s.body.translation());s.rotation.copy(s.body.rotation());this.world.removeRigidBody(s.body);s.body=null;}entry.active=false;}
 stop(fighter){const e=this.entries.get(fighter);if(!e)return;this.freeze(e);for(const s of e.saved){s.bone.position.copy(s.position);s.bone.quaternion.copy(s.quaternion);}e.character.ragdoll=false;e.character.root.updateMatrixWorld(true);this.entries.delete(fighter);}
 clear(){for(const fighter of this.entries.keys())this.stop(fighter);}
 beforeStep(dt){for(const[f,e]of this.entries){if(f.alive||f.inactive||f.character!==e.character){this.stop(f);continue;}e.age+=dt;
   let lift=0;
   for(const s of e.segments){
    const p=s.body?s.body.translation():s.position,q=s.body?s.body.rotation():s.rotation,floor=this.physics.arena.groundHeight(p.x,p.z);
    const support=s.radius+Math.max(.005,s.length/2-s.radius)*Math.abs(1-2*(q.x*q.x+q.z*q.z));
    if(floor>s.ground+.00001&&p.y-support<floor){
     if(s.body){s.body.setTranslation({x:p.x,y:floor+support+.005,z:p.z},true);const v=s.body.linvel();s.body.setLinvel({x:v.x,y:Math.max(0,v.y),z:v.z},true);}
     else lift=Math.max(lift,floor+support+.005-p.y);
    }
    s.ground=floor;
   }
   if(lift)for(const s of e.segments)s.position.y+=lift;
   if(e.age>3)this.freeze(e);}}
 apply(){
  for(const e of this.entries.values()){
   const root=e.segments[0];if(root.body){root.position.copy(root.body.translation());root.rotation.copy(root.body.rotation());}
   this.p.set(0,-root.length/2,0).applyQuaternion(root.rotation).add(root.position);root.bone.parent.updateWorldMatrix(true,false);root.bone.position.copy(root.bone.parent.worldToLocal(this.p));
   for(const s of e.segments){
    if(s.body){s.position.copy(s.body.translation());s.rotation.copy(s.body.rotation());}
    s.bone.parent.updateWorldMatrix(true,false);s.bone.parent.getWorldQuaternion(this.parentQ);this.q.copy(s.rotation).multiply(s.offset);s.bone.quaternion.copy(this.parentQ.invert().multiply(this.q));s.bone.updateMatrixWorld(true);
   }
  }
 }
 get activeCount(){let n=0;for(const e of this.entries.values())if(e.active)n++;return n;}
}
