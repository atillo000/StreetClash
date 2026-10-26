import * as THREE from 'three';

// Event-driven surroundings, using existing pooled VFX and Rapier fragments.
// Does not apply character damage, create a second hitbox, or break solid walls.
export class EnvironmentReactions{
 constructor(destruction){this.destruction=destruction;this.world=destruction.world;this.effects=destruction.effects;}
 burst(owner,move,point,radius=1){
  const reaction=move.environment?.reaction;if(!reaction||reaction==='none')return;
  const kind=({wind:'gust',heatWind:'gust',heat:'heat',arcane:'arcaneField',storm:'discharge',frost:'frostMist',holy:'holyField',earth:'landing',toxin:'toxinCloud',shadow:'shadowPulse'})[reaction];
  this.effects.elemental.emit(kind,point,move,owner,Math.min(3.8,Math.max(.35,radius)),reaction==='frost'?.85:.55);
  if(['wind','heatWind','earth'].includes(reaction))this.effects.cast(point,0xb8ad99,'smoke');
  if(['arcane','storm','holy','heat','heatWind'].includes(reaction))this.effects.elemental.flash(point,move.artColor??move.color??owner.profile.color,false);
 }
 disturb(owner,point,radius,strength=1,swirl=false){
  const origin=point.clone().add(new THREE.Vector3(0,.25,0));
  for(const d of this.effects.wreck.debris){
   const p=d.body?d.body.translation():d.p,delta=new THREE.Vector3(p.x-point.x,0,p.z-point.z),distance=delta.length();
   if(distance>radius||Math.abs(p.y-point.y)>2.5||!this.destruction.visible(origin,new THREE.Vector3(p.x,p.y+.03,p.z),null))continue;
   if(distance<.03)delta.set(1,0,0);else delta.multiplyScalar(1/distance);
   const amount=Math.max(0,1-distance/radius)*strength;
   const push=swirl?new THREE.Vector3(-delta.z-.35*delta.x,.65,delta.x-.35*delta.z):delta.setY(.3);
   const v=d.body?d.body.linvel():d.v;
   const next=new THREE.Vector3(v.x,v.y,v.z).addScaledVector(push,amount).clampLength(0,9);
   if(d.body)d.body.setLinvel(next,true);else d.v.copy(next);
  }
 }
 swing(owner,move){
  if(!(move.damage>0)||!(move.skill||move.sequenceOnly))return;
  // Ground fractures wait for the actual active weapon/floor contact in sweep().
  const p=owner.position.clone().add(new THREE.Vector3(0,owner.height*.38,0));
  this.burst(owner,move,p,Math.min(1.4,move.range||1));
  if(['wind','heat','frost'].includes(move.environment?.reaction))this.disturb(owner,owner.position,Math.min(2,move.range||1),1.2);
 }
 area(owner,move,center,air){
  const p=center.clone();if(air)p.y+=owner.height*.5;else p.y=this.world.arena.groundHeight(p.x,p.z)+.04;
  this.burst(owner,move,p,move.range||1);
  this.disturb(owner,center,move.range||1,move.environment?.reaction==='earth'?4:1.5);
 }
 pulse(s){
  // Summoned wards/familiars affect the air and light, not the concrete.
  this.burst(s.owner,s.move,s.position.clone().add(new THREE.Vector3(0,.08,0)),s.move.range);
  this.disturb(s.owner,s.position,s.move.range,.8);
 }
 path(s,from,to){
  const env=s.move.environment;if(!s.grounded||!env?.path)return;
  // Distance-spaced samples are independent of FPS and target contacts.
  // Heightfield deformation must not count as extra forward travel.
  const length=Math.hypot(to.x-from.x,to.z-from.z);if(length<1e-6)return;
  const spacing=env.path==='seismic'?1.1:.55;
  let next=spacing-(s.environmentDistance||0),count=0;
  while(next<=length+1e-8&&count++<8){
   const p=from.clone().lerp(to,next/length);p.y=this.world.arena.groundHeight(p.x,p.z);
   if(env.path==='seismic')this.destruction.groundImpact(s.owner,s.move,p,.48);
   else{this.effects.cast(p.clone().add(new THREE.Vector3(0,.1,0)),0xb8ad99,'smoke');this.burst(s.owner,s.move,p,.65);}
   this.disturb(s.owner,p,env.path==='seismic'?1.7:1.6,env.path==='seismic'?3:4,env.path==='wind');
   next+=spacing;
  }
  s.environmentDistance=((s.environmentDistance||0)+length)%spacing;
  // Each prop receives at most one bounded share per projectile, not per tick.
  const radius=(s.move.projectileRadius||.3)+.2;
  for(const prop of this.destruction.props){
   if(!prop.alive||s.environmentProps.has(prop))continue;
   const expanded=prop.bounds.clone().expandByScalar(radius),delta=to.clone().sub(from),ray=new THREE.Ray(from,delta.normalize());
   const hit=expanded.containsPoint(from)?from:ray.intersectBox(expanded,new THREE.Vector3());
   if(!hit||hit.distanceTo(from)>length+.001)continue;
   const point=prop.bounds.clampPoint(hit,new THREE.Vector3());
   if(!this.destruction.visible(from.clone().add(new THREE.Vector3(0,.6,0)),point,prop.bounds))continue;
   s.environmentProps.add(prop);
   this.destruction.damage(prop,s.owner,{...s.move,environment:{...env,propDamage:env.pathPropDamage}},point);
  }
 }
}
