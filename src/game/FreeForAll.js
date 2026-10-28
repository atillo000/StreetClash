import { KILL_ICON, DEATH_ICON } from '../ui/DisplayOptions.js';
import * as THREE from 'three';
import { Navigator } from '../physics/Navigator.js';

// Reuses the rival and three pooled actors: no extra skinned characters per round.
export class FreeForAll {
  constructor({world,player,enemy,ai,library}) {
    Object.assign(this,{world,player,enemy,ai,library});
    this.active=false;this.stats=new Map();this.respawns=new Map();this.scored=new Set();
    this.actors=[player,enemy,...world.enemyPool.entries.map(e=>e.c)];
    this.ais=new Map([[enemy,ai],...world.enemyPool.entries.map(e=>[e.c,e.ai])]);
    this.tags=new Map();this.point=new THREE.Vector3();
    this.rows=new Map();this.order='';this.resultKey='';
    const board=this.board=document.createElement('aside');board.id='ffaBoard';board.hidden=true;
    board.innerHTML='<small>FREE FOR ALL · FIRST TO 12</small><ol></ol>';document.body.appendChild(board);
    this.counters=document.createElement('section');this.counters.id='ffaCounters';this.counters.hidden=true;
    this.counters.setAttribute('aria-label','Your kills and deaths');this.counters.innerHTML='<span><span class="metric-label">KILLS</span>'+KILL_ICON+'<b>0</b></span><span><span class="metric-label">DEATHS</span>'+DEATH_ICON+'<b>0</b></span><small></small>';document.body.appendChild(this.counters);
    this.feed=document.createElement('div');this.feed.id='killFeed';document.body.appendChild(this.feed);this.feedItems=[];
    this.result=document.createElement('div');this.result.id='ffaResults';this.result.hidden=true;document.querySelector('.scoreline').after(this.result);
    for(const c of this.actors.filter(c=>c!==player)){
      const tag=document.createElement('div');tag.className='ffa-nameplate';tag.hidden=true;tag.innerHTML='<b></b><div><i></i></div>';document.body.appendChild(tag);this.tags.set(c,tag);
    }
  }
  start() {
    this.active=true;this.stats.clear();this.respawns.clear();this.scored.clear();this.feedItems=[];this.feed.replaceChildren();
    const ids=['soldier','axe','archer','magic','greatsword','capoeira','paladin'].filter(id=>id!==this.player.profile.id);
    this.actors.forEach((c,i)=>{
      c.inactive=false;c.character.root.visible=true;c.team=i===0?'p':'ffa-'+i;
      if(i>0&&c.profile.id!==ids[i-1])c.replaceFighter(this.library.create(ids[i-1],0));
      this.stats.set(c,{kills:0,deaths:0});this.spawn(c);this.ais.get(c)?.reset();
    });
    this.draw();
  }
  clear() {
    this.active=false;this.respawns.clear();this.scored.clear();this.player.team='p';this.enemy.team='e';
    this.enemy.inactive=false;this.enemy.character.root.visible=true;
    for(const {c,ai} of this.world.enemyPool.entries){c.team='e';ai.enabled=false;}
    this.board.hidden=this.counters.hidden=this.result.hidden=true;this.feed.replaceChildren();this.feedItems=[];
    for(const tag of this.tags.values())tag.hidden=true;
    document.body.classList.remove('ffa-match');
  }
  spawn(c) {
    const others=this.actors.filter(a=>a!==c&&!a.inactive&&a.alive);
    const points=this.world.arena.spawnPoints.map(([x,z])=>new THREE.Vector3(x,0,z));
    points.sort((a,b)=>{
      const clearance=p=>others.length?Math.min(...others.map(o=>p.distanceToSquared(o.position))):0;
      return clearance(b)-clearance(a);
    });
    const nav=new Navigator(this.world.arena,c.radius),firstSpawn=c===this.player&&this.stats.get(c)?.deaths===0;
    const p=firstSpawn?new THREE.Vector3(0,0,6):points.find(p=>nav.walkable(p))||nav.project(points[0]);
    c.spawn.copy(p).setY(this.world.arena.groundHeight(p.x,p.z));c.spawnFacing=Math.atan2(-p.x,-p.z);
    c.reset();c.inactive=false;c.character.root.visible=true;c.iframes=1.2;
    this.scored.delete(c);this.respawns.delete(c);this.ais.get(c)?.reset();
    this.world.effects.pulse(c.position,0xb9d9d3,.7);
    if(c===this.player){this.world.hitstop=0;this.world.lock?.clear();if(this.world.cameraRig){this.world.cameraRig.yaw=c.spawnFacing+Math.PI;this.world.cameraRig._first=true;}}
  }
  kill(attacker,target) {
    if(!this.active||this.world.online?.playing||this.world.match.state!=='active'||!this.stats.has(target)||this.scored.has(target))return;
    this.scored.add(target);this.stats.get(target).deaths++;this.respawns.set(target,3.5);
    if(attacker!==target&&this.stats.has(attacker))this.stats.get(attacker).kills++;
    const line=document.createElement('p');line.textContent=(attacker&&this.stats.has(attacker)?attacker.profile.name:'ARENA')+'  ›  '+target.profile.name;
    if(attacker===this.player||target===this.player)line.className='personal';this.feed.prepend(line);this.feedItems.push({line,life:4});
    while(this.feedItems.length>4)this.feedItems.shift().line.remove();this.draw();
  }
  ranked(){return [...this.stats].sort((a,b)=>b[1].kills-a[1].kills||a[1].deaths-b[1].deaths||this.actors.indexOf(a[0])-this.actors.indexOf(b[0]));}
  get leader(){return this.ranked()[0]?.[0];}
  resolve() {
    if(!this.active||this.world.match.state!=='active')return;
    const ranked=this.ranked();if(!ranked.length)return;
    const [winner,top]=ranked[0];
    if(top.kills<12&&this.world.match.remaining>1e-8)return;
    const tied=ranked.filter(([,s])=>s.kills===top.kills&&s.deaths===top.deaths),isTied=tied.some(([c])=>c===this.player)&&tied.length>1;
    this.world.match.finish(isTied?'draw':winner===this.player?'victory':'defeat',top.kills>=12?'First to 12 eliminations':'Time limit · kills, then fewer deaths');
  }
  update(dt) {
    if(!this.active)return;
    const enabled=this.world.match.state==='active';
    for(const [c,ai]of this.ais){ai.enabled=enabled&&c.alive;if(c!==this.enemy)ai.update(dt);}
    if(enabled)for(const[c,t]of this.respawns){const left=t-dt;if(left<=0)this.spawn(c);else this.respawns.set(c,left);}
    for(let i=this.feedItems.length-1;i>=0;i--){const e=this.feedItems[i];e.life-=dt;if(e.life<=0){e.line.remove();this.feedItems.splice(i,1);}}
  }
  draw() {
    const state=this.world.match.state,visible=this.active&&['countdown','active','ending'].includes(state);
    this.board.hidden=this.counters.hidden=!visible;this.result.hidden=!(this.active&&state==='results');
    document.body.classList.toggle('ffa-match',this.active&&state!=='lobby');
    if(!this.active)return;
    const set=(el,value)=>{value=String(value);if(el.textContent!==value)el.textContent=value;};
    const ranked=this.ranked();
    // A hidden standings panel does no DOM work. Visible rows are reused; only
    // ranking changes reorder them. Results are built once when actually shown.
    if(visible&&document.body.classList.contains('hud-standings')){
      const list=this.board.querySelector('ol'),order=ranked.map(([c])=>this.actors.indexOf(c)).join(',');
      for(const[c,s]of ranked){let row=this.rows.get(c);if(!row){const li=document.createElement('li'),name=document.createElement('span'),score=document.createElement('b'),health=document.createElement('i');li.classList.toggle('you',c===this.player);li.append(name,score,health);row={li,name,score,health};this.rows.set(c,row);}}
      ranked.forEach(([c,s],i)=>{const row=this.rows.get(c);set(row.name,(i+1)+'. '+c.profile.name+(c===this.player?' · YOU':''));set(row.score,s.kills+' / '+s.deaths);const width=Math.max(0,c.hp/c.maxHp)*100+'%';if(row.health.style.width!==width)row.health.style.width=width;if(this.order!==order)list.appendChild(row.li);});this.order=order;
    }
    if(!this.result.hidden){const key=ranked.map(([c,s])=>c.profile.id+':'+s.kills+':'+s.deaths).join('|');if(key!==this.resultKey){
      const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent='FINAL STANDINGS';table.appendChild(caption);
      const head=table.createTHead().insertRow();for(const label of ['RANK','HERO','KILLS','DEATHS']){const th=document.createElement('th');th.textContent=label;head.appendChild(th);}
      const body=table.createTBody();ranked.forEach(([c,s],i)=>{const row=body.insertRow();row.classList.toggle('you',c===this.player);for(const value of [i+1,c.profile.name+(c===this.player?' · YOU':''),s.kills,s.deaths])row.insertCell().textContent=value;});this.result.replaceChildren(table);this.resultKey=key;
    }}
    const p=this.stats.get(this.player);this.counters.querySelectorAll('b').forEach((b,i)=>set(b,i?p.deaths:p.kills));
    const respawn=this.respawns.get(this.player);set(this.counters.querySelector('small'),respawn?'RESPAWN IN '+Math.ceil(respawn):'');
  }
  render(camera) {
    const active=this.active&&this.world.match.canFight&&!this.world.paused;
    for(const[c,tag]of this.tags){tag.hidden=!active||!c.alive||c.inactive;if(tag.hidden)continue;
      const head=c.character.bone('mixamorigHead');if(head)head.getWorldPosition(this.point);else this.point.copy(c.position).add(new THREE.Vector3(0,c.height,0));
      this.point.y+=.22;this.point.project(camera);tag.hidden=this.point.z< -1||this.point.z>1||Math.abs(this.point.x)>.96||Math.abs(this.point.y)>.88;
      if(!tag.hidden){tag.style.left=(this.point.x*.5+.5)*100+'%';tag.style.top=(-this.point.y*.5+.5)*100+'%';tag.querySelector('b').textContent=c.profile.name;tag.querySelector('i').style.width=Math.max(0,c.hp/c.maxHp)*100+'%';}
    }
  }
}
