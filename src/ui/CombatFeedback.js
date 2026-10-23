import * as THREE from 'three';

const format=value=>value<10&&Math.abs(value-Math.round(value))>.04?value.toFixed(1):String(Math.round(value));
const hex=color=>'#'+new THREE.Color(color).getHexString();

// World-anchored labels, one small hit streak and two player status notices.
// All DOM nodes are allocated once; rapid shots merge, never an unbounded feed.
export class CombatFeedback{
  constructor(world){
    this.world=world;this.time=0;this.limit=28;this.sequence=0;this.projected=new THREE.Vector3();
    this.root=document.createElement('div');this.root.id='combatFeedback';this.root.hidden=true;this.root.setAttribute('aria-hidden','true');document.body.appendChild(this.root);
    this.slots=Array.from({length:40},()=>{
      const el=document.createElement('div');el.className='combat-float';el.hidden=true;el.innerHTML='<small></small><b></b><em></em>';this.root.appendChild(el);
      return{el,label:el.children[0],value:el.children[1],sub:el.children[2],position:new THREE.Vector3(),life:0};
    });
    this.streak=document.createElement('div');this.streak.id='hitStreak';this.streak.hidden=true;this.streak.innerHTML='<strong></strong><span></span>';this.root.appendChild(this.streak);
    this.notices=Array.from({length:2},()=>{const el=document.createElement('div');el.className='combat-notice';el.hidden=true;el.innerHTML='<b></b><span></span>';this.root.appendChild(el);return{el,title:el.children[0],description:el.children[1],life:0};});
    this.clear();
  }
  setBudget(particles){this.limit=particles<64?16:particles<128?28:40;}
  clear(){for(const s of this.slots){s.life=0;s.el.hidden=true;s.target=null;}for(const n of this.notices){n.life=0;n.el.hidden=true;}this.hits=0;this.damageTotal=0;this.streakLife=0;this.streak.hidden=true;}
  emit(target,point,kind,value,label='',sub=''){
    let stack=0;
    if(kind==='status'){
      const active=this.slots.filter(s=>s.life>0&&s.target===target&&s.kind==='status');
      if(active.length>=2){const oldest=active.reduce((a,b)=>a.created<b.created?a:b);oldest.life=0;oldest.el.hidden=true;}
      const occupied=new Set(active.filter(s=>s.life>0).map(s=>s.stack));stack=occupied.has(0)?1:0;
    }
    const pool=this.slots.slice(0,this.limit),slot=pool.find(s=>s.life<=0)||pool.reduce((a,b)=>a.life<b.life?a:b);
    slot.target=target;slot.kind=kind;slot.position.copy(point);slot.valueNumber=value;slot.life=slot.max=kind==='status'?1.25:.95;slot.created=this.time;slot.hits=1;
    slot.follow=kind==='status';slot.stack=stack;slot.lane=this.sequence++%3-1;slot.el.className='combat-float '+kind;slot.label.textContent=label;slot.value.textContent=typeof value==='number'?format(value):value;slot.sub.textContent=sub;slot.el.hidden=false;slot.el.style.removeProperty('--status-color');return slot;
  }
  damage(attacker,target,point,result,info=target.lastHitInfo){
    if(!info||!(info.damage>0)&&result!=='blocked')return;
    const player=this.world.combatants[0],incoming=target===player,periodic=!!info.periodic;
    const kind=result==='blocked'?'guard':info.critical?'critical':periodic?'periodic':incoming?'incoming':'damage';
    const label=result==='blocked'?'GUARD':info.critical?'CRITICAL':info.guardBroken?'GUARD BREAK':periodic?(info.statusLabel||'DAMAGE OVER TIME'):'';
    let slot=this.slots.find(s=>s.life>0&&s.target===target&&s.kind===kind&&s.attacker===attacker&&this.time-s.created<.12);
    if(slot){slot.valueNumber+=info.damage;slot.hits++;slot.value.textContent=format(slot.valueNumber);slot.sub.textContent='×'+slot.hits;}
    else slot=this.emit(target,point,kind,info.damage,label);
    slot.attacker=attacker;
    if(info.critical)slot.sub.textContent='FINISHER · ×1.25';
    if(periodic&&info.color)slot.el.style.setProperty('--status-color',hex(info.color));
    if(attacker===player&&!periodic&&result!=='blocked'){
      if(this.streakLife<=0){this.hits=0;this.damageTotal=0;}
      this.hits++;this.damageTotal+=info.damage;this.streakLife=2.2;this.streak.children[0].textContent=this.hits+' HIT'+(this.hits===1?'':'S');this.streak.children[1].textContent=format(this.damageTotal)+' DAMAGE';
    }
  }
  notice(title,description,kind){
    const n=this.notices.find(n=>n.life<=0)||this.notices.reduce((a,b)=>a.life<b.life?a:b);
    n.life=2.7;n.el.className='combat-notice '+kind;n.title.textContent=title;n.description.textContent=description;n.el.hidden=false;
  }
  status(target,type,duration=type.duration){
    const point=target.position.clone().add(new THREE.Vector3(0,target.height+.22,0));
    const slot=this.emit(target,point,'status',(type.positive?'+ ':'− ')+type.label.toUpperCase(),type.positive?'BUFF':'DEBUFF',duration+'s');
    slot.positive=type.positive;slot.el.dataset.positive=String(type.positive);slot.el.style.setProperty('--status-color',hex(type.color));
    if(target===this.world.combatants[0])this.notice((type.positive?'BUFF · ':'DEBUFF · ')+type.label.toUpperCase(),type.description,type.positive?'positive':'negative');
  }
  ended(target,type,reason){if(reason==='cleansed')return;if(target===this.world.combatants[0])this.notice(type.label.toUpperCase()+(reason==='depleted'?' BROKEN':' ENDED'),reason==='depleted'?'Shield depleted.':'Effect expired.','ended');}
  shield(target,amount){this.emit(target,target.position.clone().add(new THREE.Vector3(0,target.height*.65,0)),'guard',Math.round(amount),'SHIELD ABSORBED');}
  cleansed(target,count){const slot=this.emit(target,target.position.clone().add(new THREE.Vector3(0,target.height+.22,0)),'status','CLEANSED','DEBUFFS REMOVED',count+' effect'+(count===1?'':'s'));slot.el.dataset.positive='true';if(target===this.world.combatants[0])this.notice('CLEANSED',count+' negative effect'+(count===1?'':'s')+' removed.','positive');}
  heal(target,amount){
    if(amount<.05)return;this.emit(target,target.position.clone().add(new THREE.Vector3(0,target.height*.7,0)),'healing','+'+format(amount),'HEAL');
  }
  render(camera,dt,visible){
    this.root.hidden=!visible;if(!visible){this.clear();return;}
    this.time+=dt;const width=window.innerWidth,height=window.innerHeight;
    for(let i=0;i<this.slots.length;i++){
      const s=this.slots[i];s.life=Math.max(0,s.life-dt);s.el.hidden=s.life<=0||i>=this.limit||s.target?.inactive;if(s.el.hidden)continue;
      if(s.follow){this.projected.copy(s.target.position);this.projected.y+=Math.min(2.8,s.target.height+.22)+s.stack*.4;}else this.projected.copy(s.position);
      const t=1-s.life/s.max;this.projected.y+=(s.kind==='critical'?.4:.18)+t*.65;this.projected.project(camera);
      s.el.hidden=this.projected.z< -1||this.projected.z>1||Math.abs(this.projected.x)>1.05||Math.abs(this.projected.y)>1.05;if(s.el.hidden)continue;
      const x=(this.projected.x*.5+.5)*width+(s.kind==='status'?(s.target===this.world.combatants[0]?65:-35):s.lane*24),y=(-this.projected.y*.5+.5)*height;
      const scale=s.kind==='critical'?1+Math.max(0,1-t*5)*.3:1+Math.max(0,1-t*6)*.12;
      s.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%) scale(${scale})`;
      s.el.style.opacity=String(Math.min(1,s.life/.22));
    }
    this.streakLife=Math.max(0,this.streakLife-dt);this.streak.hidden=this.streakLife<=0||this.hits<2;this.streak.style.opacity=String(Math.min(1,this.streakLife/.35));
    this.notices.forEach((n,i)=>{n.life=Math.max(0,n.life-dt);n.el.hidden=n.life<=0;n.el.style.setProperty('--notice-row',i);n.el.style.opacity=String(Math.min(1,n.life/.3));});
  }
}
