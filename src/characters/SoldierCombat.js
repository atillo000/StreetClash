import * as THREE from 'three';

// Tactical shooting: authored Mixamo rifle motion, short distinct shot clips,
// additive upper-body actions, plus a reversible aim/recoil layer. Legs keep
// using the character's own rifle/pistol locomotion and planted idle stance.
export const SOLDIER_ACTIONS={
 RifleShotI:{duration:.72,events:[.24],lean:.025},
 RifleShotII:{duration:.7,events:[.25],lean:-.025},
 RifleShotIII:{duration:.9,events:[.32],lean:.04},
 RifleBurst:{duration:1,events:[.18,.42,.66],lean:.02},
 RifleSuppress:{duration:1.05,events:[.18,.42,.66],lean:-.02},
 RifleArc:{duration:.9,events:[.38],lean:.035},
 RifleAcquire:{duration:.5,events:[],lean:.02},
 RifleUltimateBurst:{duration:1.1,events:[.18,.4,.62],lean:.02},
 RifleUltimateFinish:{duration:.95,events:[.28],lean:.045},
};

export function configureSoldierCombat(kit){
 const set=(move,name,speed,mobile=false)=>Object.assign(move,{clip:name,events:[...SOLDIER_ACTIONS[name].events],windows:[[.12,.74]],endAt:.92,cancelAt:.7,dodgeCancelAt:.6,speed,mobileFire:mobile,fade:.045});
 kit.punch.chain.forEach((move,i)=>set(move,['RifleShotI','RifleShotII','RifleShotIII'][i],[1.5,1.5,1.55][i],true));
 Object.assign(kit.punch,{...kit.punch.chain[0],chain:kit.punch.chain,cooldown:0});
 set(kit.heavy,'RifleBurst',1.5,true);kit.heavy.label='Combat burst';
 set(kit.skill1,'RifleSuppress',1.45,true);kit.skill1.label='Advancing fire';
 set(kit.skill2,'RifleArc',1.5);
 set(kit.ultimateStart,'RifleAcquire',1.6);kit.ultimateStart.events=[];kit.ultimateStart.windows=[];kit.ultimateStart.endAt=.6;
 set(kit.ultimateStrike,'RifleUltimateBurst',1.45);
 set(kit.ultimateFinisher,'RifleUltimateFinish',1.5);
}

const upper=/mixamorig(?:Spine\d*|Neck|Head|(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand.*))\.quaternion$/;
export function buildSoldierActions(character){
 const clips=[];
 const ready=character.actions.get('AimIdle')?.getClip();if(ready&&!character.hasClip('RifleReadyIdle')){const idle=ready.clone();idle.name='RifleReadyIdle';clips.push(idle);}
 for(const pistol of [false,true]){
  const reference=character.actions.get(pistol?'PistolAimIdle':'AimIdle')?.getClip();
  const source=character.actions.get(pistol?'PistolLight':'Light')?.getClip();if(!reference||!source)continue;
  const refTracks=new Map(reference.tracks.map(t=>[t.name,t]));
  for(const[name,definition]of Object.entries(SOLDIER_ACTIONS)){
   const clipName=(pistol?'Pistol':'')+name;if(character.hasClip(clipName))continue;
   const duration=definition.duration,steps=Math.ceil(duration*30),times=Array.from({length:steps+1},(_,i)=>duration*i/steps),tracks=[];
   for(const track of reference.tracks){if(!upper.test(track.name))continue;
    const firing=source.tracks.find(t=>t.name===track.name)||track,sample=firing.createInterpolant(),ref=refTracks.get(track.name).createInterpolant(),values=[];
    for(const time of times){const phase=time/duration,q=new THREE.Quaternion().fromArray(sample.evaluate(phase*source.duration));
     // Enter and recover into the exact ready pose instead of snapping from
     // a relaxed carry. Recoil itself is triggered by each real shot event.
     const weight=Math.min(1,phase/.12,(1-phase)/.16);const base=new THREE.Quaternion().fromArray(ref.evaluate(Math.min(time,reference.duration)));
     base.slerp(q,Math.max(0,weight)*.8);
     if(/Spine2\./.test(track.name))base.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.sin(phase*Math.PI)*definition.lean));
     values.push(base.x,base.y,base.z,base.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(track.name,times,values));
   }
   const clip=new THREE.AnimationClip(clipName,duration,tracks);THREE.AnimationUtils.makeClipAdditive(clip,0,reference,30);clip.userData={upperBody:true};clip.optimize();clips.push(clip);
  }
 }
 character.addClips(clips);
}

export class SoldierCombatPose{
 constructor(combatant){
  this.c=combatant;this.pitch=0;this.yaw=0;this.recoil=0;this.applied=Array.from({length:7},()=>({bone:null,inverse:new THREE.Quaternion()}));this.appliedCount=0;
  this.axis=new THREE.Vector3();this.forward=new THREE.Vector3();this.point=new THREE.Vector3();this.rotation=new THREE.Quaternion();this.parent=new THREE.Quaternion();this.delta=new THREE.Quaternion();this.inverseParent=new THREE.Quaternion();this.up=new THREE.Vector3(0,1,0);
  this.bones=[['Spine',.18],['Spine1',.2],['Spine2',.22],['LeftArm',.4],['RightArm',.4]].map(([name,weight])=>({bone:combatant.character.bone('mixamorig'+name),weight})).filter(x=>x.bone);this.yawBones=this.bones.filter(x=>/Spine[12]$/.test(x.bone.name));
 }
 shot(){this.recoil=Math.min(.2,this.recoil+(this.c.equipment?.id==='pistol'?.11:.075));}
 beforeMix(){for(let i=this.appliedCount-1;i>=0;i--){const {bone,inverse}=this.applied[i];bone.quaternion.premultiply(inverse);}this.appliedCount=0;}
 record(bone){const slot=this.applied[this.appliedCount++];slot.bone=bone;slot.inverse.copy(this.delta).invert();}
 update(dt){
  const c=this.c,ch=c.character;this.recoil*=Math.exp(-18*dt);
  const firing=c.state==='attack'&&c.move?.kind==='projectile',ready=c.state==='free'||firing;
  let correction=0,yawCorrection=0;
  if(ready&&c.alive){
   ch.root.updateWorldMatrix(true,false);c.equipment?.update(false);
   const weapon=c.equipment;if(weapon?.muzzle){weapon.muzzle.getWorldPosition(this.point);weapon.root.getWorldDirection(this.forward);
    const aim=firing?c.castTarget:c.aimPoint;
    if(aim){const dx=aim.x-this.point.x,dz=aim.z-this.point.z,elevation=Math.atan2(aim.y-this.point.y,Math.hypot(dx,dz));const yaw=Math.atan2(dx,dz)-Math.atan2(this.forward.x,this.forward.z);yawCorrection=THREE.MathUtils.clamp(Math.atan2(Math.sin(yaw),Math.cos(yaw)),-.65,.65);correction=THREE.MathUtils.clamp(elevation-Math.asin(THREE.MathUtils.clamp(this.forward.y,-1,1)),-1.45,1.45);}
   }
  }
  this.pitch=THREE.MathUtils.lerp(this.pitch,ready?correction:0,1-Math.exp(-16*dt));
  this.yaw=THREE.MathUtils.lerp(this.yaw,ready?yawCorrection:0,1-Math.exp(-32*dt));
  if(!ready)return;
  for(const {bone}of this.bones.filter(x=>/Spine[12]$/.test(x.bone.name))){bone.parent.getWorldQuaternion(this.parent);this.delta.setFromAxisAngle(this.up,this.yaw*.5);this.delta.premultiply(this.inverseParent.copy(this.parent).invert()).multiply(this.parent);bone.quaternion.premultiply(this.delta);this.record(bone);bone.updateWorldMatrix(true,false);}
  ch.root.getWorldQuaternion(this.rotation);this.axis.set(1,0,0).applyQuaternion(this.rotation);
  const elevation=this.pitch+this.recoil;
  for(const {bone,weight}of this.bones){
   bone.parent.getWorldQuaternion(this.parent);this.delta.setFromAxisAngle(this.axis,-elevation*weight);
   this.delta.premultiply(this.inverseParent.copy(this.parent).invert()).multiply(this.parent);bone.quaternion.premultiply(this.delta);
   this.record(bone);bone.updateWorldMatrix(true,false);
  }
 }
}
