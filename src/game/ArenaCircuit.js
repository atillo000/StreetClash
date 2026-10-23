import * as THREE from 'three';

const MODES={
  duel:{label:'DUEL',duration:120,rules:'One rival. Two minutes. Win by knockout or finish with more health.'},
  gauntlet:{label:'GAUNTLET',duration:360,rules:'Clear the Parasite wave, defeat the giant Mutant, then hunt El Chupacabra. Bosses arrive with zombie support. One health pool.'},
  boss:{label:'MUTANT HUNT',duration:240,rules:'Defeat the giant Mutant and its Parasite Zombies. Clear every enemy before time runs out.'},
  predator:{label:'CHUPACABRA HUNT',duration:240,rules:'Hunt El Chupacabra and its Parasite Zombies. Watch the pounce and claw combinations; clear the arena to win.'},
};
const STORAGE='streetclash.circuit.scores.v1';
export class ArenaCircuit{
 constructor({world,match,player,enemy,ai,library,scene,effects,lock}){
  Object.assign(this,{world,match,player,enemy,ai,library,scene,effects,lock});
  this.mode='duel';this.rivalId=enemy.profile.id;this.stage=0;this.kills=0;this.pending=0;this.rows=[];this.defeated=new Set();
  try{const rows=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(rows))this.rows=rows.filter(r=>r&&typeof r.name==='string'&&Number.isFinite(r.score)).slice(0,8);}catch{}
  const lobby=document.getElementById('lobby'),board=document.createElement('aside');board.id='circuitBoard';board.innerHTML='<div class="eyebrow">LOCAL RECORDS</div><h2>THE CIRCUIT</h2><p>Best runs on this device</p><ol id="circuitRecords"></ol>';lobby.appendChild(board);
  const featured=document.createElement('div');featured.id='featuredFighter';featured.innerHTML='<small>SELECTED FIGHTER</small><strong></strong><span></span>';lobby.appendChild(featured);
  const overlay=document.createElement('div');overlay.id='encounterDisplay';overlay.hidden=true;
  overlay.innerHTML='<div id="encounterProgress"></div><div id="bossDisplay" hidden><small>IRONWORKS / BOSS ENCOUNTER</small><strong></strong><div class="boss-track" role="progressbar" aria-label="Boss health"><i></i></div><span></span></div><div id="spawnWarning" hidden></div><div id="enemyNameplate" hidden><b></b><div><i></i></div></div>';document.body.appendChild(overlay);
  const score=document.createElement('p');score.id='runScore';document.getElementById('resultReason').after(score);
  this.marker=new THREE.Mesh(new THREE.RingGeometry(.85,.92,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xc18f52,transparent:true,opacity:.55,depthWrite:false}));this.marker.visible=false;scene.add(this.marker);this.projected=new THREE.Vector3();
  document.getElementById('arenaMode').addEventListener('change',event=>{if(match.state!=='lobby')return;this.mode=event.target.value;world.enemyPool.clear();this.spawnEnemy(this.plan()[0].id,false);this.updateHud();});
  const reset=match.onReset;
  match.onReset=()=>{
    world.enemyPool.clear();this.stage=0;this.kills=0;this.pending=0;this.defeated.clear();this.sequence=this.training?[{id:this.rivalId,zombies:0}]:this.plan();
    this.spawnEnemy(this.sequence[0].id,false);match.duration=MODES[this.mode].duration;match.remaining=match.duration;
    reset();
    // Reset first clears terrain/effects; only then place the new zombie wave.
    if(!this.training)world.enemyPool.spawn(this.sequence[0].zombies||0);
    this.marker.visible=false;
  };
  const practice=match.practice.bind(match);match.practice=()=>{this.training=true;practice();this.training=false;world.enemyPool.clear();};
  const start=match.start.bind(match);match.start=()=>{this.training=false;start();};
  const lobbyChange=match.toLobby.bind(match);match.toLobby=()=>{lobbyChange();world.enemyPool.clear();};
  const resolve=match.resolveOutcome.bind(match);
  match.resolveOutcome=()=>{
    if(match.state!=='active')return;
    if(this.mode==='duel')return resolve();
    if(player.hp<=0){match.finish('defeat','Knocked out in the circuit');return;}
    for(const c of world.combatants)if(c.team==='e'&&!c.alive&&!c.inactive&&!this.defeated.has(c)){this.defeated.add(c);this.kills++;}
    const cleared=!enemy.alive&&world.enemyPool.living===0;
    if(cleared&&this.stage===this.sequence.length-1){match.finish('victory',this.boss?enemy.profile.name+' defeated / arena cleared':'Circuit cleared');return;}
    if(match.remaining<=1e-8){match.finish('defeat','Time limit / enemies remain');return;}
    if(cleared&&!this.pending){this.pending=3;ai.enabled=false;lock.clear();world.projectiles.clear();this.spawnPoint();}
  };
  const finish=match.onFinish;
  match.onFinish=result=>{
    finish(result);const kills=this.mode==='duel'?(result.outcome==='victory'?1:0):this.kills;
    result.score=Math.max(0,Math.round(result.damageDealt+100*kills+(result.outcome==='victory'?500+player.hp*3+match.remaining*2:0)));
    this.rows.push({name:player.profile.name,mode:this.label,score:result.score,won:result.outcome==='victory'});this.rows.sort((a,b)=>b.score-a.score);this.rows=this.rows.slice(0,8);
    try{localStorage.setItem(STORAGE,JSON.stringify(this.rows));}catch{}this.drawRecords();
  };
  this.drawRecords();this.updateHud();
 }
 get label(){return MODES[this.mode].label;}
 plan(){return this.mode==='gauntlet'?[{id:'zombie',zombies:3},{id:'mutant',zombies:2},{id:'chupacabra',zombies:3}]:this.mode==='boss'?[{id:'mutant',zombies:2}]:this.mode==='predator'?[{id:'chupacabra',zombies:3}]:[{id:this.rivalId,zombies:0}];}
 spawnPoint(){const points=[[-4.7,-4.7],[4.7,-4.7],[-4.7,4.7],[4.7,4.7]];points.sort((a,b)=>Math.hypot(b[0]-this.player.position.x,b[1]-this.player.position.z)-Math.hypot(a[0]-this.player.position.x,a[1]-this.player.position.z));this.nextSpawn=new THREE.Vector3(points[0][0],0,points[0][1]);this.marker.position.set(this.nextSpawn.x,this.world.arena.groundHeight(this.nextSpawn.x,this.nextSpawn.z)+.023,this.nextSpawn.z);}
 spawnEnemy(id,arrival){const c=this.enemy;if(c.profile.id!==id)c.replaceFighter(this.library.create(id,c.spawnFacing));this.boss=!!c.profile.boss;c.maxHp=c.profile.maxHp||100;c.spawn.set(0,0,-3.8);if(arrival)c.spawn.copy(this.nextSpawn);c.reset();this.ai.reset();this.lock.clear();if(arrival){this.effects.pulse(c.position,0xc18f52,1.4);c.iframes=1;this.world.projectiles.clear();}}
 update(dt){
  if(!this.match.canFight)return;
  this.world.enemyPool.update(dt,this.match.state==='active'&&this.pending<=0);
  if(this.pending>0){this.pending=Math.max(0,this.pending-dt);this.ai.enabled=false;if(this.pending===0){this.stage++;this.defeated.clear();this.spawnEnemy(this.sequence[this.stage].id,true);this.world.enemyPool.spawn(this.sequence[this.stage].zombies||0);this.ai.enabled=true;this.marker.visible=false;}}
 }
 drawRecords(){const list=document.getElementById('circuitRecords');list.replaceChildren();if(!this.rows.length){const li=document.createElement('li');li.className='empty-record';li.textContent='Finish a match to set the first record.';list.appendChild(li);}this.rows.slice(0,5).forEach((r,i)=>{const li=document.createElement('li'),rank=document.createElement('b'),who=document.createElement('span'),value=document.createElement('strong');rank.textContent=String(i+1).padStart(2,'0');who.textContent=r.name+' / '+r.mode;value.textContent=r.score.toLocaleString();li.append(rank,who,value);list.appendChild(li);});}
 updateHud(){
  const m=this.match;document.getElementById('encounterDisplay').hidden=!['countdown','active','practice','ending'].includes(m.state);
  document.getElementById('modeRules').textContent=MODES[this.mode].rules;document.querySelector('.arena-tag').textContent=this.mode==='gauntlet'?'3 WAVES':this.mode==='duel'?'1V1':'BOSS';document.getElementById('opponentChoice').disabled=this.mode!=='duel';
  const feature=document.getElementById('featuredFighter');feature.querySelector('strong').textContent=this.player.profile.name.toUpperCase();feature.querySelector('span').textContent=this.player.profile.role;document.querySelector('.location-stamp small').textContent=this.label+' / LOCAL PLAY';
  const living=(this.enemy.alive?1:0)+this.world.enemyPool.living;
  document.getElementById('encounterProgress').textContent=m.state==='practice'?'TRAINING / NO RECORD':this.mode==='duel'?'':(this.mode==='gauntlet'?'ENCOUNTER '+(this.stage+1)+' / 3 · ':'')+living+' ENEMIES REMAIN · '+this.kills+' KOs';
  const warning=document.getElementById('spawnWarning');warning.hidden=!(this.pending>0&&m.state==='active');warning.textContent='NEXT ENCOUNTER IN '+Math.ceil(this.pending);
  const boss=document.getElementById('bossDisplay');boss.hidden=!this.boss||m.state==='practice';boss.querySelector('strong').textContent=this.enemy.profile.name.toUpperCase();boss.querySelector('i').style.width=Math.max(0,this.enemy.hp/this.enemy.maxHp)*100+'%';boss.querySelector('span').textContent=Math.ceil(this.enemy.hp)+' / '+this.enemy.maxHp;
  const bar=boss.querySelector('[role]');bar.setAttribute('aria-valuenow',Math.ceil(this.enemy.hp));bar.setAttribute('aria-valuemax',this.enemy.maxHp);document.getElementById('runScore').textContent=m.result?(m.result.score??0)+' CIRCUIT POINTS / SAVED ON THIS DEVICE':'';
 }
 render(camera){
  const active=this.match.canFight&&!this.world.paused;this.world.enemyPool.render(camera,active);
  this.marker.visible=(active&&this.pending>0)||(this.match.state==='countdown'&&!this.world.paused);
  if(this.match.state==='countdown')this.marker.position.set(this.enemy.spawn.x,this.world.arena.groundHeight(this.enemy.spawn.x,this.enemy.spawn.z)+.023,this.enemy.spawn.z);
  if(this.marker.visible)this.marker.scale.setScalar(1+Math.sin(performance.now()*.009)*.08);
  const tag=document.getElementById('enemyNameplate'),c=this.enemy,head=c.character.bone('mixamorigHead');if(head)head.getWorldPosition(this.projected);else this.projected.copy(c.position).add(new THREE.Vector3(0,c.height,0));this.projected.y+=.3;this.projected.project(camera);
  tag.hidden=!active||!c.alive||this.projected.z< -1||this.projected.z>1||Math.abs(this.projected.x)>.95||Math.abs(this.projected.y)>.84;
  if(!tag.hidden){tag.style.left=(this.projected.x*.5+.5)*100+'%';tag.style.top=(-this.projected.y*.5+.5)*100+'%';tag.querySelector('b').textContent=c.profile.name.toUpperCase();tag.querySelector('i').style.width=Math.max(0,c.hp/c.maxHp)*100+'%';}
 }
}
