import * as THREE from 'three';
import { sweepHurtCapsule } from '../physics/collision.js';
import { boxSurfaceNormal } from './DestructibleProps.js';

// Simulation owns all damage. Effect meshes never decide hits or add damage.
// Reuses the same takeHit/onHit path as weapons, including guard, crit, status,
// score, feedback and friendly-fire rules. Eight bounded active spell slots.
export class PowerSystem{
 constructor(world,effects){this.world=world;this.effects=effects;this.items=[];this.free=Array.from({length:8},()=>({position:new THREE.Vector3(),direction:new THREE.Vector3(),hit:new Set()}));}
 clear(){while(this.items.length)this.remove(this.items.at(-1));}
 release(owner,move){
  if(!owner.alive||owner.inactive||!this.world.combatEnabled)return false;
  if(['spirits','guardians'].includes(move.specialPower))for(const s of [...this.items])if(s.owner===owner&&s.summon)this.remove(s);
  const s=this.free.pop();if(!s)return false;
  Object.assign(s,{owner,move,context:owner.hitContext,kind:move.specialPower,summon:['spirits','guardians'].includes(move.specialPower),grounded:false,life:0,elapsed:0,pulses:0,tick:0,travel:0,trailT:0,visual:null,elementVisual:null,statusId:null});s.hit.clear();
  s.direction.set(Math.sin(owner.attackAngle??owner.mover.facing),0,Math.cos(owner.attackAngle??owner.mover.facing));
  const origin=owner.equipment?.muzzle||owner.character.bone('mixamorigRightHand');if(origin)origin.getWorldPosition(s.position);else s.position.copy(owner.position).add(new THREE.Vector3(0,1,0));
  if(owner.castTarget)s.direction.copy(owner.castTarget).sub(s.position).normalize();
  s.grounded=['tornado','fissure'].includes(s.kind)&&owner.position.y<=this.ground(owner.position)+.3;
  if(s.grounded){s.position.copy(owner.position).addScaledVector(s.direction,.7);s.direction.y=0;s.direction.normalize();s.position.y=this.ground(s.position);}
  if(s.summon){s.position.copy(owner.position);s.position.y=this.ground(s.position);s.direction.set(0,0,1);s.pulses=move.powerPulses||3;s.life=s.pulses;s.tick=1;s.statusId=s.kind==='guardians'?'guardians':'familiars';owner.statuses.apply(s.statusId,owner,s.life);if(s.kind==='guardians')owner.statuses.apply('wardShield',owner,s.life);}
  else s.life=move.range/(move.projectileSpeed||12);
  s.visual=this.effects.special.spawn(s.kind,s.position,s.direction,move.color??owner.profile.color,s.summon?move.range:move.projectileRadius*1.5);
  if(s.kind==='fissure'){s.elementVisual=this.effects.elemental.emit('frostWave',s.position,move,owner,move.projectileRadius*1.5,s.life+.2);if(s.elementVisual)s.elementVisual.follow=s;}
  this.items.push(s);this.effects.cast(s.position,move.color??owner.profile.color,s.kind==='lightning'?'impact':'wind');
  if(s.kind==='lightning'){
   const end=s.position.clone().addScaledVector(s.direction,move.range);const contact=this.trace(s,s.position,end);const stop=contact?.point||end;this.effects.elemental.strike(stop,move,owner);
   if(s.visual){s.visual.end.copy(stop);s.visual.held=false;s.visual.life=.22;}
   if(contact)this.contact(s,contact);this.remove(s,false);
  }
  return true;
 }
 ground(point){return this.world.arena.groundHeight(point.x,point.z);}
 trace(s,from,to){
  const delta=to.clone().sub(from),length=delta.length();if(length<.00001)return null;
  const ray=new THREE.Ray(from,delta.normalize()),point=new THREE.Vector3();let nearest=null,distance=length+.0001;
  for(const box of this.world.arena.cameraBlockers){const expanded=box.clone().expandByScalar(s.move.projectileRadius||.2);const hit=expanded.containsPoint(from)?from:ray.intersectBox(expanded,point);if(hit){const d=from.distanceTo(hit);if(d<distance){distance=d;nearest={point:hit.clone(),box};}}}
  if(!s.grounded){const terrain=this.world.arena.terrain.intersectSegment(from,to,s.move.projectileRadius||.2);if(terrain&&terrain.distance<distance){distance=terrain.distance;nearest={point:terrain.point,normal:terrain.normal};}}
  const start=from.clone(),end=to.clone();if(s.grounded){start.y+=.85;end.y+=.85;}
  for(const target of this.world.combatants){if(target===s.owner||target.team===s.owner.team||!target.alive||target.inactive||s.hit.has(target))continue;
   if(!sweepHurtCapsule(start,end,target,s.move.projectileRadius||.2,point))continue;
   const d=start.distanceTo(point);if(d<distance){distance=d;nearest={point:point.clone(),target};}
  }
  return nearest;
 }
 damage(s,target,point,amount=s.move.damage){
  const dir=s.summon?target.position.clone().sub(s.position).setY(0):s.direction.clone().setY(0);if(dir.lengthSq()<.001)dir.subVectors(target.position,s.position).setY(0);if(dir.lengthSq()<.001)dir.set(0,0,1);dir.normalize();
  const result=target.takeHit({damage:amount,knock:s.move.knock,power:s.move.power,dir,attacker:s.owner,move:s.move,context:s.context});
  if(result==='miss')return false;this.world.onHit(s.owner,target,result,s.move,point);return true;
 }
 contact(s,hit){
  if(hit.target){if(!this.damage(s,hit.target,hit.point))return false;s.hit.add(hit.target);if(s.kind==='fissure'&&s.grounded)this.world.destruction.groundImpact(s.owner,s.move,hit.target.position,.55);}
  else {const normal=hit.normal||boxSurfaceNormal(hit.point,hit.box);this.world.destruction.surface(s.owner,s.move,hit.point,hit.box,normal);}
  this.effects.impact(hit.point,s.move.color,true);return true;
 }
 remove(s,finish=true){const i=this.items.indexOf(s);if(i<0)return;if(s.statusId)s.owner?.statuses.remove(s.statusId,'dismissed');if(finish)this.effects.special.finish(s.visual);if(s.elementVisual){s.elementVisual.follow=null;s.elementVisual.life=Math.min(.2,s.elementVisual.life);s.elementVisual=null;}this.items.splice(i,1);s.visual=null;s.owner=null;s.context=null;s.hit.clear();this.free.push(s);}
 update(dt){
  if(!(dt>0)||!this.world.combatEnabled)return;
  for(const s of [...this.items]){
   if(!s.owner.alive||s.owner.inactive){this.remove(s);continue;}
   s.life=Math.max(0,s.life-dt);s.elapsed+=dt;
   if(s.summon){
    // Companions follow the owner; the simulation position, visible orbit and
    // pulse origin share this same smoothed center. Cover still blocks attacks.
    s.position.lerp(s.owner.position,1-Math.exp(-dt*14));s.position.y=this.ground(s.position);if(s.visual)s.visual.position.copy(s.position);
    s.tick-=dt;
    if(s.tick<=1e-8){s.tick+=1;const pulse=s.move.damage/s.pulses;this.effects.elemental.emit('nova',s.position,s.move,s.owner,s.move.range,.5);this.effects.shockwave(s.position,s.move.color,s.move.range);
     for(const target of this.world.combatants){if(!target.alive||target.inactive||target.team===s.owner.team||Math.abs(target.position.y-s.position.y)>1||target.position.distanceTo(s.position)>s.move.range+target.radius||!this.world.arena.hasLineOfSight(s.position,target.position))continue;
      const point=target.position.clone().add(new THREE.Vector3(0,.9,0));this.damage(s,target,point,pulse);const a=s.elapsed*1.5+(Math.round(s.elapsed)%2)*Math.PI,orbit=s.kind==='spirits'?.85:s.move.range*.48;const origin=s.position.clone().add(new THREE.Vector3(Math.cos(a)*orbit,1.15,Math.sin(a)*orbit));this.effects.blades.sample(origin,point,s.owner,s.move);
     }
    }
   }else{
    const from=s.position.clone(),travel=Math.min((s.move.projectileSpeed||12)*dt,s.move.range-s.travel);s.position.addScaledVector(s.direction,travel);s.travel+=travel;if(s.grounded)s.position.y=this.ground(s.position);
    // A broad wave can hit several bodies in one step, but stops at the first wall.
    for(let i=0;i<this.world.combatants.length+1;i++){const hit=this.trace(s,from,s.position);if(!hit)break;const landed=this.contact(s,hit);if(!hit.target||!['tornado','fissure'].includes(s.kind)){if(landed||!hit.target){this.remove(s);break;}break;}if(!landed)break;}
    if(!s.owner)continue;
    if(s.visual)s.visual.position.copy(s.position);s.trailT+=dt;if(s.trailT>=.1){s.trailT=0;this.effects.projectileTrail(s.position,s.move.color,s.kind==='dragon'?'arcane':'arrow');}
    if(s.travel>=s.move.range-1e-6)s.life=0;
   }
   if(s.life<=1e-8)this.remove(s);
  }
 }
}
