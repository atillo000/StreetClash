import * as THREE from 'three';
import { NET,ACTIONS,validInput,validSnapshot,roomRates } from './Protocol.js';
import { requestedAttacks } from '../core/controls.js';
import { STATUS_TYPES } from '../combat/StatusEffects.js';
const vec=a=>new THREE.Vector3().fromArray(a);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const moveKey=(c,m)=>Object.entries(c.moves).find(([,v])=>v===m)?.[0]||c.moveId||'punch';
const stowed=c=>['block','blockEnd','dodge','hit','down','getup','dead','jump','land','victory'].includes(c.state)||(c.state==='attack'&&(c.move?.clip==='Kick'||c.move?.kind==='mobility'));

// The host runs the existing Combatant, swept hitboxes, terrain and Rapier loop.
// Guests send bounded input intents and render snapshots; never run damage logic.
export class OnlineMatch{
 constructor(options){
  Object.assign(this,options);this.playing=false;this.actors=new Map();this.events=[];this.remote=new Map();this.buffers=[];this.powerVisuals=new Map();this.seq=0;this.inputSeq=0;this.eventSeq=0;this.lastEvent=0;this.tags=new Map();this.pendingAttacks=[];this.pendingEdges={};this.finished=false;
  this.onMessage=()=>{};this.onEnd=()=>{};
  const w=this.world;
  for(const name of ['onAttack','onCast','onSwing','onHit','onUltimateComplete']){
   const original=w[name];w[name]=(...args)=>{const result=original.apply(w,args);if(this.playing&&this.rooms.host){const[c,a,b,m,point]=args;
    if(name==='onHit')this.event('hit',{a:c.netId,b:a.netId,result:b,move:moveKey(c,m),point:point.toArray(),info:a.lastHitInfo,damage:a.lastDamage});
    else this.event(name,{a:c.netId,move:moveKey(c,a)});
   }return result;};
  }
  const impact=w.arena.terrain.impact.bind(w.arena.terrain);w.arena.terrain.impact=(p,damage,radius,scorch)=>{if(this.playing&&this.rooms.host)this.event('ground',{p:p.toArray(),damage,radius,scorch:!!scorch});return impact(p,damage,radius,scorch);};
  const mark=this.effects.wreck.mark.bind(this.effects.wreck);this.effects.wreck.mark=(p,n,kind,damage,radius)=>{if(this.playing&&this.rooms.host)this.event('mark',{p:p.toArray(),normal:n.toArray(),kind,damage,radius});return mark(p,n,kind,damage,radius);};
  const spawn=this.effects.special.spawn.bind(this.effects.special);this.effects.special.spawn=(...args)=>{const visual=spawn(...args);if(this.playing&&this.rooms.host&&args[0]==='lightning'&&visual)this.event('bolt',{visual});return visual;};
 }
 event(type,data){if(!this.playing)return;this.events.push({n:++this.eventSeq,type,...data});if(this.events.length>64)this.events.shift();}
 begin(room,members){
  if(this.playing||members.length<2||members.length>NET.maxPlayers)return false;
  this.original=this.world.combatants.map(c=>({c,id:c.profile.id,team:c.team,name:c.name,spawn:c.spawn.clone(),facing:c.spawnFacing,isMinion:c.isMinion}));
  this.world.setPaused(false);this.world.match.practice();this.ai.enabled=false;this.lock.clear();this.world.enemyPool.clear();
  this.playing=true;this.finished=false;this.result=null;this.matchId=room.match_id;this.roster=members.map(m=>({...m}));this.rates=roomRates(members.length);this.actors.clear();this.remote.clear();this.events=[];this.buffers=[];this.pendingAttacks=[];this.pendingEdges={};this.seq=this.inputSeq=this.lastSnapshot=this.lastEvent=this.eventSeq=0;this.receivedAt=performance.now();this.elapsed=0;this.countdown=3;this.remaining=NET.roundSeconds;this.snapshotT=this.inputT=0;this.snapshotBusy=false;this.awaiting=new Set(members.filter(m=>m.user_id!==room.host_id).map(m=>m.user_id));this.startWait=0;this.lastHello=0;
  const mine=this.rooms.user.id,others=members.filter(m=>m.user_id!==mine),ordered=[members.find(m=>m.user_id===mine),...others],slots=[this.player,this.enemy,...this.world.enemyPool.entries.map(x=>x.c)];
  const spawns=[[-4,-4],[4,4],[-4,4],[4,-4]];
  for(let i=0;i<ordered.length;i++){
   const member=ordered[i],c=slots[i],index=members.findIndex(m=>m.user_id===member.user_id),p=spawns[index];
   c.replaceFighter(this.world.library.create(member.fighter,0));c.name=member.display_name;c.team=member.user_id;c.netId=member.user_id;c.isMinion=false;c.inactive=false;c.character.root.visible=true;c.spawn.set(p[0],0,p[1]);c.spawnFacing=Math.atan2(-p[0],-p[1]);c.reset();this.actors.set(member.user_id,c);
   const tag=document.createElement('div');tag.className='online-nameplate';const name=document.createElement('b'),bar=document.createElement('i');name.textContent=member.display_name+(member.user_id===room.host_id?' · HOST':'');tag.append(name,bar);document.body.appendChild(tag);this.tags.set(c,tag);
  }
  for(const c of this.world.combatants)if(!this.actors.has(c.netId)){c.inactive=true;c.character.root.visible=false;c.hp=0;c.state='dead';}
  this.input.clear();this.world.combatEnabled=false;this.cam._first=true;this.world.fixed?.reset();document.exitPointerLock?.();this.onMessage('Connecting fighters…');return true;
 }
 stop(message='Returned to room'){
  if(!this.playing)return;this.playing=false;this.finished=false;this.world.powers.clear();this.world.projectiles.clear();this.effects.clear();this.lock.clear();for(const tag of this.tags.values())tag.remove();this.tags.clear();for(const s of this.powerVisuals.values())this.effects.special.finish(s);this.powerVisuals.clear();
  for(const o of this.original){const c=o.c;c.team=o.team;c.name=o.name;c.spawn.copy(o.spawn);c.spawnFacing=o.facing;c.isMinion=o.isMinion;delete c.netId;if(c.profile.id!==o.id)c.replaceFighter(this.world.library.create(o.id,o.facing));}
  this.world.match.toLobby();this.world.setPaused(false);this.actors.clear();this.input.clear();document.getElementById('countdown').hidden=true;this.onMessage(message);this.onEnd();
 }
 packet(sender,p){
  if(!this.playing||p.match!==this.matchId)return;
  if(this.rooms.host){
   if(sender===this.rooms.user.id||!this.actors.has(sender))return;
   if(p.type==='hello'){this.awaiting.delete(sender);return;}
   if(p.type!=='input'||!validInput(p))return;
   const old=this.remote.get(sender),now=performance.now();if(old&&p.seq<=old.seq)return;
   const bucket=Math.floor(now/1000),rate=old?.bucket===bucket?(old.rate||0)+1:1;if(rate>35)return;
   const edges=old?.edges||{};for(const key of ['jump','dodge','switchWeapon'])edges[key]||=p[key];
   const attacks=[...(old?.attacks||[]),...p.attacks].slice(0,6);this.remote.set(sender,{...p,attacks,edges,at:now,bucket,rate});
  }else if(sender===this.rooms.room.host_id&&p.type==='snapshot'&&validSnapshot(p,[...this.actors.keys()])&&p.seq>this.lastSnapshot){
   this.lastSnapshot=p.seq;this.receivedAt=performance.now();this.remaining=p.remaining;if(this.countdown>0&&p.countdown===0)this.onMessage('FIGHT / Last fighter standing wins');this.countdown=p.countdown;this.finished=!!p.result;this.result=p.result;this.buffers.push({at:this.receivedAt,p});if(this.buffers.length>6)this.buffers.shift();
   for(const event of p.events)if(event.n>this.lastEvent){this.presentEvent(event);this.lastEvent=event.n;}
   this.syncProps(p.props||[]);this.syncPowers(p.powers);this.syncShots(p.shots);
   if(this.finished)this.onMessage('ROUND COMPLETE / '+(this.result.winner?this.roster.find(m=>m.user_id===this.result.winner)?.display_name+' wins':'Draw'));
  }
 }
 capture(dt){
  if(this.rooms.host||!this.playing)return;
  if(this.input.pressed('Tab'))this.lock.toggle();this.lock.update();this.aim.update(this.camera,this.player,this.world);
  const axis=this.input.moveAxis(),f=new THREE.Vector3(),r=new THREE.Vector3(),dir=new THREE.Vector3();this.cam.forward(f);this.cam.right(r);dir.addScaledVector(f,axis.y).addScaledVector(r,axis.x);if(dir.lengthSq()>1)dir.normalize();
  const target=this.lock.target,point=target?target.position.clone().add(new THREE.Vector3(0,1,0)):this.aim.point.clone();
  this.latestInput={dir:[dir.x,dir.z],aim:wrap(target?Math.atan2(target.position.x-this.player.position.x,target.position.z-this.player.position.z):this.aim.heading(this.player)),point:point.toArray(),aiming:!!target||this.input.locked,walk:this.input.walkModifier,block:this.input.down('KeyF'),crouch:this.input.down('KeyC'),sprint:this.input.down('KeyZ')};
  const pressed=requestedAttacks(this.input,this.player.moves);if(pressed.length&&this.countdown<=0&&!this.finished)this.world.sound.play('intent');
  this.pendingAttacks.push(...pressed);this.pendingAttacks=this.pendingAttacks.slice(0,6);
  for(const[k,code]of [['jump','Space'],['dodge','KeyE'],['switchWeapon','KeyQ']])this.pendingEdges[k]||=this.input.pressed(code);
  this.inputT+=dt;if(this.inputT>=1/this.rates.inputHz){this.inputT=0;const packet={v:NET.version,type:'input',match:this.matchId,seq:++this.inputSeq,...this.latestInput,attacks:this.pendingAttacks.splice(0),jump:!!this.pendingEdges.jump,dodge:!!this.pendingEdges.dodge,switchWeapon:!!this.pendingEdges.switchWeapon};this.pendingEdges={};this.rooms.send(packet);}
 }
 applyRemote(){
  const now=performance.now();for(const[id,c]of this.actors){if(c===this.player)continue;const p=this.remote.get(id);if(!p||now-p.at>NET.inputTimeoutMs||this.countdown>0||this.finished){c.mover.steer(new THREE.Vector3(),0);c.wantBlock=c.wantCrouch=false;c.mover.sprinting=false;continue;}
   const dir=new THREE.Vector3(p.dir[0],0,p.dir[1]);if(dir.lengthSq()>1)dir.normalize();c.manualAim=true;c.aimPoint=vec(p.point);c.target=null;const ranged=c.profile.ranged??['magic','soldier','archer'].includes(c.profile.id);c.mover.lockFacing=ranged&&p.aiming&&!p.sprint?p.aim:null;c.mover.steer(dir,dir.length(),p.walk);c.wantBlock=p.block;c.wantCrouch=p.crouch;c.mover.sprinting=p.sprint&&c.character.hasClip('Sprint');
   if(p.edges.switchWeapon&&c.profile.id==='soldier'&&c.state==='free'){c.equipment.toggle();c.moves=c.equipment.moves;}
   if(p.edges.jump)c.tryJump();if(p.edges.dodge)c.tryDodge(dir.lengthSq()?Math.atan2(dir.x,dir.z):null);
   for(const key of p.attacks)if(ACTIONS.includes(key)&&!c.moves[key]?.sequenceOnly)c.tryAttack(key,p.aim);p.attacks=[];p.edges={};
  }
 }
 beforeStep(dt){
  if(!this.playing)return false;
  if(!this.rooms.host){this.capture(dt);this.interpolate(dt);this.world.projectiles.tracers.update(dt);this.world.destruction.update(dt);this.world.physics.step(dt);this.input.endFrame();const now=performance.now();if(this.countdown>0&&now-this.lastHello>1000){this.lastHello=now;this.rooms.send({v:1,type:'hello',match:this.matchId});}if(now-this.receivedAt>NET.hostTimeoutMs)this.stop('Host connection lost. Rejoin a room; this round was not saved.');return true;}
  if(this.awaiting.size){this.startWait+=dt;if(this.startWait>20){this.onMessage('A fighter could not connect. Returning to room.');this.rooms.finish().catch(e=>this.onMessage(e.message));this.stop('Connection timed out. Ready up again.');}this.broadcast(dt);this.input.clear();return true;}
  const previousCountdown=this.countdown;this.countdown=Math.max(0,this.countdown-dt);if(previousCountdown>0&&this.countdown===0)this.onMessage('FIGHT / Last fighter standing wins');this.world.combatEnabled=this.countdown===0&&!this.finished;
  if(!this.world.combatEnabled){for(const c of this.actors.values()){c.previousPosition.copy(c.position);c.previousFacing=c.mover.facing;c.character.update(dt);}this.broadcast(dt);this.input.endFrame();return true;}
  for(const[id,c]of this.actors){if(c===this.player||!c.alive)continue;const remote=this.remote.get(id);if(remote&&performance.now()-remote.at>NET.hostTimeoutMs){c.hp=0;c.character.playAction('Defeat',{fade:.1});c._setState('dead');c.deadT=0;this.onMessage(c.name+' disconnected / eliminated');}}
  this.applyRemote();return false;
 }
 afterStep(dt){
  if(!this.playing||!this.rooms.host)return;this.elapsed+=dt;this.remaining=Math.max(0,NET.roundSeconds-this.elapsed);
  const alive=[...this.actors.values()].filter(c=>c.alive&&c.hp>0);
  if(alive.length<=1||this.remaining<=0){const ranked=alive.sort((a,b)=>b.hp/b.maxHp-a.hp/a.maxHp),winner=ranked.length===1||ranked.length>1&&Math.abs(ranked[0].hp/ranked[0].maxHp-ranked[1].hp/ranked[1].maxHp)>.0001?ranked[0].netId:null;this.finished=true;this.result={winner};this.world.combatEnabled=false;this.onMessage('ROUND COMPLETE / '+(winner?this.roster.find(m=>m.user_id===winner).display_name+' wins':'Draw'));}
  this.broadcast(dt);
 }
 broadcast(dt){
  this.snapshotT+=dt;if(this.snapshotT<1/this.rates.snapshotHz||this.snapshotBusy)return;this.snapshotT=0;
  const actors=[...this.actors].map(([id,c])=>({id,fighter:c.profile.id,p:c.position.toArray(),yaw:c.mover.facing,hp:c.hp,state:c.state,clip:c.character.actionName||'',progress:c.character.actionProgress(),paused:!!c.character.action?.paused,move:c.move?moveKey(c,c.move):'',sequence:c.attackSequence?{id:c.attackSequence.id,index:c.attackSequence.index,total:c.attackSequence.total}:null,combo:c.comboStage,cooldowns:c.cooldowns,speed:c.mover.speed,velocity:c.mover.velocity.toArray(),locked:c.mover.lockFacing!==null,crouching:c.crouching,grounded:c.character.grounded,height:c.height,aim:c.aimPoint?.toArray()||null,manualAim:c.manualAim,weapon:c.equipment?.id||'',statuses:[...c.statuses.entries.values()].map(e=>({id:e.id,remaining:e.remaining,duration:e.duration,shield:e.shield,empowered:e.empowered,empoweredT:e.empoweredT||0}))}));
  const events=this.events.map(e=>{if(e.type==='bolt'&&e.visual){e.p=e.visual.position.toArray();e.end=e.visual.end.toArray();e.color=e.visual.material.color.getHex();delete e.visual;}return e;});
  const props=this.world.destruction.props.map(p=>({hp:p.hp,p:p.root.position.toArray()}));
  const powers=this.world.powers.items.map((s,i)=>({id:i,kind:s.kind,owner:s.owner.netId,p:s.position.toArray(),dir:s.direction.toArray(),radius:s.summon?s.move.range:s.move.projectileRadius*1.5,color:s.move.color}));
  const shots=this.world.projectiles.items.map((s,i)=>({id:i,owner:s.owner.netId,p:s.position.toArray(),v:s.velocity.toArray(),move:moveKey(s.owner,s.move)}));
  this.snapshotBusy=true;this.rooms.send({v:NET.version,type:'snapshot',match:this.matchId,seq:++this.seq,remaining:this.remaining,countdown:this.countdown,result:this.result||null,actors,events,props,powers,shots}).finally(()=>{this.snapshotBusy=false;});
 }
 interpolate(dt){
  if(!this.buffers.length)return;const now=performance.now()-Math.max(NET.interpolationMs,1000/this.rates.snapshotHz+20);let a=this.buffers[0],b=a;for(const frame of this.buffers){if(frame.at<=now)a=frame;if(frame.at>=now){b=frame;break;}b=frame;}const t=b.at>a.at?THREE.MathUtils.clamp((now-a.at)/(b.at-a.at),0,1):1;
  for(const next of b.p.actors){const c=this.actors.get(next.id),old=a.p.actors.find(x=>x.id===next.id)||next;if(!c)continue;c.previousPosition.copy(c.position);c.previousFacing=c.mover.facing;c.position.copy(vec(old.p)).lerp(vec(next.p),t);c.mover.facing=old.yaw+wrap(next.yaw-old.yaw)*t;c.character.root.rotation.y=c.mover.facing;c.hp=next.hp;c.state=next.state;c.comboStage=next.combo;c.cooldowns=next.cooldowns||{};c.moveId=next.move;c.move=c.moves[next.move]||null;c.attackSequence=next.sequence||null;c.mover.speed=next.speed||0;c.mover.velocity.copy(vec(next.velocity||[0,0,0]));c.mover.lockFacing=next.locked?next.yaw:null;c.crouching=!!next.crouching;c.height=next.height||c.profile.height;c.character.grounded=!!next.grounded;c.manualAim=!!next.manualAim;c.aimPoint=next.aim?vec(next.aim):null;
   if(c.profile.id==='soldier'&&next.weapon&&next.weapon!==c.equipment.id){c.equipment.toggle();c.moves=c.equipment.moves;}
   if(next.clip&&c.character.hasClip(next.clip)){if(c.character.actionName!==next.clip)c.character.playAction(next.clip,{fade:.08,loop:['JumpLoop','Block'].includes(next.clip)});const action=c.character.action;if(action){action.time=next.progress*action.getClip().duration;action.paused=!!next.paused;}}
   else if(c.character.action)c.character.endAction(.1);
   c.statuses.entries.clear();for(const e of next.statuses||[]){const type=STATUS_TYPES[e.id];if(type)c.statuses.entries.set(e.id,{...e,type,source:c,tick:0});}
   const vx=c.mover.speed>.01?c.mover.velocity.x/c.mover.speed:0,vz=c.mover.speed>.01?c.mover.velocity.z/c.mover.speed:0;
   c.character.locomote(c.mover.speed,dt,{locked:!!next.locked,side:vx*Math.cos(c.mover.facing)-vz*Math.sin(c.mover.facing),forward:vx*Math.sin(c.mover.facing)+vz*Math.cos(c.mover.facing),crouching:c.crouching});c.character.update(dt);c.equipment?.update(stowed(c));
  }
 }
 presentEvent(e){
  const a=this.actors.get(e.a),b=this.actors.get(e.b),move=a?.moves[e.move]||a?.moves.punch;
  if(e.type==='ground'){this.world.arena.terrain.impact(vec(e.p),e.damage,e.radius,e.scorch);this.effects.wreck.fragments(vec(e.p),'rubble',e.damage,true);this.effects.contacts.dust(vec(e.p),e.radius,1.8);this.world.sound.play('stone',{volume:.5});}
  else if(e.type==='mark')this.effects.wreck.mark(vec(e.p),vec(e.normal),e.kind,e.damage,e.radius);
  else if(e.type==='bolt'){const start=vec(e.p),end=vec(e.end),s=this.effects.special.spawn('lightning',start,end.clone().sub(start).normalize(),e.color,.2);if(s){s.end.copy(end);s.held=false;s.life=.22;}}
  else if(a&&move){
   if(e.type==='onAttack'){this.effects.contacts.anticipate(a,move);this.effects.elemental.charge(a,move);}
   if(e.type==='onSwing'){this.world.sound.play('swing');this.effects.swing(a,move);this.world.destruction.reactions.swing(a,move);}
   if(e.type==='onUltimateComplete')this.effects.elemental.empower(a,move);
   if(e.type==='onCast'){this.effects.contacts.release(a,move);this.world.sound.play(a.profile.id==='soldier'?'rifle':'magic');this.effects.elemental.release(a,move);if(move.kind==='projectile'&&!move.specialPower){const source=a.equipment?.muzzle||a.character.bone('mixamorigRightHand');this.effects.cast(source.getWorldPosition(new THREE.Vector3()),move.color,a.profile.id==='soldier'?'muzzle':'cast');}if(move.kind==='area'&&!move.specialPower)this.world.destruction.reactions.area(a,move,a.position,move.environment?.surface==='air');}
   if(e.type==='hit'&&b){b.lastHitInfo=e.info;b.lastDamage=e.damage;const point=vec(e.point);this.world.sound.play(e.result==='blocked'?'block':move.power==='heavy'?'heavy':'hit');this.effects.contact(a,b,e.result,move,point);this.world.onNetworkHit?.(a,b,point,e.result);if(b===this.player&&!this.world.juice?.reduced)this.cam.shake(.07);}
  }
 }
 syncProps(props){for(let i=0;i<props.length&&i<this.world.destruction.props.length;i++){const state=props[i],p=this.world.destruction.props[i];if(!Number.isFinite(state.hp)||!Array.isArray(state.p))continue;const delta=vec(state.p).sub(p.root.position);p.root.position.add(delta);p.bounds.translate(delta);p.hp=Math.max(0,state.hp);const alive=p.hp>0;if(p.alive!==alive){p.alive=alive;p.root.visible=alive;if(!alive){for(const list of [this.world.arena.obstacles,this.world.arena.cameraBlockers]){const j=list.indexOf(p.bounds);if(j>=0)list.splice(j,1);}this.world.arena.revision++;this.effects.wreck.fragments(p.bounds.getCenter(new THREE.Vector3()),p.material,20,true);}}for(const{material,base}of p.materials)material.color.copy(base).multiplyScalar(.7+.3*p.hp/p.maxHp);}this.world.arena.syncBreakables();}
 syncPowers(powers){const ids=new Set();for(const p of powers){const c=this.actors.get(p.owner);if(!c||!Array.isArray(p.p)||!Array.isArray(p.dir))continue;ids.add(p.id);let s=this.powerVisuals.get(p.id);if(s&&s.kind!==p.kind){this.effects.special.finish(s);this.powerVisuals.delete(p.id);s=null;}s??=this.effects.special.spawn(p.kind,vec(p.p),vec(p.dir),p.color,p.radius);if(s){s.position.copy(vec(p.p));s.direction.copy(vec(p.dir));this.powerVisuals.set(p.id,s);}}for(const[id,s]of this.powerVisuals)if(!ids.has(id)){this.effects.special.finish(s);this.powerVisuals.delete(id);}}
 syncShots(shots){const old=this.world.projectiles.items;for(const shot of shots){const c=this.actors.get(shot.owner),move=c?.moves[shot.move];if(!c||!move)continue;const p=vec(shot.p),v=vec(shot.v);if(c.profile.id==='soldier')this.world.projectiles.tracers.add(p.clone().addScaledVector(v.clone().normalize(),-1),p);else this.effects.projectileTrail(p,move.color,move.projectileStyle);}this.world.projectiles.items=shots.map(s=>{const owner=this.actors.get(s.owner);return{owner,move:owner?.moves[s.move]||owner?.moves.punch,position:vec(s.p),velocity:vec(s.v)};}).filter(s=>s.owner&&s.move);this.world.projectiles.sync();this.world.projectiles.items=old;this.world.projectiles.tracers.update(0);}
 render(camera){
  if(!this.playing)return;for(const[c,tag]of this.tags){const p=c.position.clone().add(new THREE.Vector3(0,c.height+.25,0)).project(camera);tag.hidden=c===this.player||!c.alive||p.z< -1||p.z>1;tag.style.left=(p.x*.5+.5)*100+'%';tag.style.top=(-p.y*.5+.5)*100+'%';tag.querySelector('i').style.setProperty('--health',Math.max(0,c.hp/c.maxHp)*100+'%');}
  document.getElementById('matchMode').textContent='FRIENDS / FREE FOR ALL';document.getElementById('timer').textContent=this.finished?'FINISH':Math.floor(Math.ceil(this.remaining)/60)+':'+String(Math.ceil(this.remaining)%60).padStart(2,'0');
  const countdown=document.getElementById('countdown');countdown.hidden=this.countdown<=0;countdown.textContent=this.awaiting.size&&this.rooms.host?'CONNECTING':String(Math.ceil(this.countdown));
 }
}
