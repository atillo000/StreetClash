export const CAMPAIGN_STORAGE='streetclash.campaign.v1';
export const MISSIONS=[
 {id:'dock-quarantine',title:'01 / Dock quarantine',type:'Zombie Survival',duration:150,recovery:8,brief:'Clear three Parasite waves. Recover 8 HP between waves.',reward:120,waves:[{id:'zombie',zombies:1,hpScale:.8},{id:'zombie',zombies:2,hpScale:.9},{id:'zombie',zombies:3}]},
 {id:'first-brute',title:'02 / The first Brute',type:'Boss Battle',duration:210,brief:'Defeat the Mutant and its two Parasite escorts.',reward:180,waves:[{id:'mutant',zombies:2,hpScale:.85}]},
 {id:'night-shift',title:'03 / Night shift',type:'Zombie Survival',duration:240,recovery:8,brief:'Hold the dock through five waves. One health pool; small recovery between waves.',reward:220,waves:[1,2,3,3,3].map((zombies,i)=>({id:'zombie',zombies,hpScale:1+i*.1}))},
 {id:'predator-contract',title:'04 / Predator contract',type:'Boss Battle',duration:240,brief:'El Chupacabra joins the fight with three Parasites. Clear every enemy.',reward:260,waves:[{id:'chupacabra',zombies:3}]},
 {id:'last-watch',title:'05 / The last watch',type:'Zombie Survival',duration:300,recovery:8,brief:'Six reinforced waves. Save your ultimate for crowded encounters.',reward:300,waves:Array.from({length:6},(_,i)=>({id:'zombie',zombies:3,hpScale:1.1+i*.1}))},
 {id:'ironworks-finale',title:'06 / Ironworks finale',type:'Boss Battle',duration:420,brief:'Clear the infestation, then defeat both bosses. No healing between encounters.',reward:400,waves:[{id:'zombie',zombies:3,hpScale:1.3},{id:'mutant',zombies:2,hpScale:1.1},{id:'chupacabra',zombies:3,hpScale:1.1}]},
];
const fresh=()=>({version:1,selected:MISSIONS[0].id,records:{}});
const integer=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export class CampaignProgress{
 constructor(storage){this.storage=storage;this.saved=!!storage;this.data=fresh();try{const raw=JSON.parse(storage?.getItem(CAMPAIGN_STORAGE)||'null');if(raw?.version===1){for(const m of MISSIONS){const r=raw.records?.[m.id];if(r&&integer(r.stars,3)>0)this.data.records[m.id]={stars:integer(r.stars,3),bestScore:integer(r.bestScore,1e8)};}if(MISSIONS.some(m=>m.id===raw.selected)&&this.unlocked(raw.selected))this.data.selected=raw.selected;}}catch{this.saved=false;}}
 unlocked(id){const index=MISSIONS.findIndex(m=>m.id===id);return index===0||index>0&&MISSIONS.slice(0,index).every(m=>this.data.records[m.id]?.stars>0);}
 get selected(){return MISSIONS.find(m=>m.id===this.data.selected)||MISSIONS[0];}
 get stars(){return Object.values(this.data.records).reduce((sum,r)=>sum+r.stars,0);}
 get xp(){return MISSIONS.reduce((sum,m)=>{const r=this.data.records[m.id];return sum+(r?m.reward+(r.stars-1)*40:0);},0);}
 get rank(){return ['RECRUIT','SURVIVOR','HUNTER','DOCK CHAMPION'][Math.min(3,Math.floor(this.xp/550))];}
 save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(CAMPAIGN_STORAGE,JSON.stringify(this.data));this.saved=true;}catch{this.saved=false;}return this.saved;}
 select(id){if(!this.unlocked(id))return false;this.data.selected=id;this.save();return true;}
 complete(mission,result,maxHp,duration){if(result.outcome!=='victory'||!this.unlocked(mission.id))return null;const stars=1+(result.playerHp>=maxHp*.5?1:0)+(duration-result.elapsed>=duration*.25?1:0),old=this.data.records[mission.id];const before=this.xp;this.data.records[mission.id]={stars:Math.max(stars,old?.stars||0),bestScore:Math.max(integer(result.score,1e8),old?.bestScore||0)};const next=MISSIONS[MISSIONS.findIndex(m=>m.id===mission.id)+1];this.save();return{stars,bestStars:this.data.records[mission.id].stars,xp:this.xp-before,next:next?.id||null};}
}

export class Campaign{
 constructor(world){
  this.world=world;let storage;try{storage=window.localStorage;}catch{}this.progress=new CampaignProgress(storage);
  this.panel=document.createElement('section');this.panel.id='campaignPanel';this.panel.hidden=true;this.panel.setAttribute('aria-label','Campaign missions');
  this.panel.innerHTML='<div class="campaign-heading"><span>DOCK 09 / CAMPAIGN</span><strong></strong></div><p class="campaign-rank"></p><label for="campaignMission">MISSION</label><select id="campaignMission"></select><p class="campaign-objective"></p><p class="campaign-record"></p><small class="campaign-save" role="status"></small>';
  document.getElementById('modeRules').after(this.panel);
  this.select=this.panel.querySelector('select');for(const mission of MISSIONS){const option=document.createElement('option');option.value=mission.id;option.textContent=mission.title;this.select.appendChild(option);}
  this.select.addEventListener('change',()=>{if(world.match.state!=='lobby')return;this.progress.select(this.select.value);world.circuit.preview();});
  this.result=document.createElement('div');this.result.id='campaignResult';this.result.hidden=true;this.result.setAttribute('role','status');this.result.innerHTML='<strong></strong><p></p>';document.getElementById('runScore').after(this.result);
  this.next=document.createElement('button');this.next.id='nextMission';this.next.type='button';this.next.className='primary';this.next.hidden=true;this.next.textContent='Next mission →';document.getElementById('rematch').before(this.next);
  this.next.addEventListener('click',()=>{const id=world.match.result?.campaign?.next;if(!id||!this.progress.unlocked(id))return;world.setPaused(false);world.match.toLobby();this.progress.select(id);world.match.start();});this.updateHud();
 }
 get selected(){return this.progress.selected;}
 complete(mission,result){const award=this.progress.complete(mission,result,this.world.combatants[0].maxHp,mission.duration);if(award)result.campaign=award;this.updateHud();}
 updateHud(){
  const w=this.world,active=w.circuit.mode==='campaign',p=this.progress;this.panel.hidden=!active;document.getElementById('circuitBoard').classList.toggle('campaign-records',active);
  this.panel.querySelector('.campaign-heading strong').textContent=p.stars+' / 18 ★';this.panel.querySelector('.campaign-rank').textContent=p.rank+' · '+p.xp+' XP';
  for(const o of this.select.options){const record=p.data.records[o.value];o.disabled=!p.unlocked(o.value);o.textContent=MISSIONS.find(m=>m.id===o.value).title+(record?' · '+'★'.repeat(record.stars):o.disabled?' · LOCKED':'');}this.select.value=p.data.selected;
  this.panel.querySelector('.campaign-objective').textContent=this.selected.type+' · '+this.selected.brief;
  const record=p.data.records[p.data.selected];this.panel.querySelector('.campaign-record').textContent=record?'Best: '+record.stars+' / 3 stars · '+record.bestScore.toLocaleString()+' points':'First clear: '+this.selected.reward+' XP · Stars: clear / 50% HP / 25% time left.';
  this.panel.querySelector('.campaign-save').textContent=p.saved?'Progress saves on this browser/device.':'Storage unavailable — progress lasts for this session only.';
  const result=w.match.result,award=result?.campaign;this.result.hidden=!active||!award;this.next.hidden=!active||!award?.next;
  if(award){this.result.querySelector('strong').textContent='★'.repeat(award.stars)+' · MISSION CLEARED';this.result.querySelector('p').textContent='+'+award.xp+' XP · '+p.rank+(award.next?' · Next mission unlocked': ' · Campaign complete')+(p.saved?' · SAVED':' · SESSION ONLY');}
  const start=document.getElementById('startMatch');if(!start.disabled)start.textContent=active?'Start selected mission →':'Enter the arena ↗';document.getElementById('rematch').textContent=active?'Retry mission':'Fight again ↗';
 }
}
