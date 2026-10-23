// Original combat balance. Durations use simulation time; duplicates refresh,
// never stack. Multipliers are recomputed from active entries, not base stats.
export const STATUS_TYPES={
  flow:{label:'Flow',positive:true,color:0xe9c37a,duration:4,moveSpeed:1.10,description:'+10% movement speed.'},
  offBalance:{label:'Off balance',positive:false,color:0xd79e70,duration:3,knockTaken:1.25,description:'Takes 25% more knockback.'},
  arcaneSurge:{label:'Arcane surge',positive:true,color:0xbca1ed,duration:4,damage:1.15,description:'+15% direct attack damage.'},
  weakened:{label:'Weakened',positive:false,color:0xa791cb,duration:4,damage:.85,description:'Deals 15% less direct attack damage.'},
  focus:{label:'Focus',positive:true,color:0x96c5bd,duration:4,damage:1.12,description:'+12% direct attack damage.'},
  exposed:{label:'Exposed',positive:false,color:0xdc9a74,duration:4,defense:1.15,description:'Takes 15% more direct attack damage.'},
  hunterPace:{label:'Hunter pace',positive:true,color:0xb0c889,duration:4,moveSpeed:1.08,description:'+8% movement speed.'},
  hobbled:{label:'Hobbled',positive:false,color:0xc6a27c,duration:3,moveSpeed:.75,description:'Movement speed reduced by 25%.'},
  poise:{label:'Poise',positive:true,color:0xa3c7d6,duration:4,knockTaken:.65,description:'35% less knockback. Does not prevent stagger or knockdown.'},
  sundered:{label:'Sundered',positive:false,color:0xcf986f,duration:4,defense:1.15,description:'Takes 15% more direct attack damage.'},
  fury:{label:'Fury',positive:true,color:0xe5a16e,duration:4,damage:1.18,defense:1.10,description:'+18% direct damage, but takes 10% more direct damage.'},
  bleeding:{label:'Bleeding',positive:false,color:0xc9695a,duration:4,dot:2,description:'Loses 2 HP each second for 4 seconds; no repeated stagger.'},
  enraged:{label:'Enraged',positive:true,color:0xc2cb84,duration:4,damage:1.15,knockTaken:.7,moveSpeed:.9,description:'+15% direct damage, 30% less knockback, but 10% slower movement.'},
  crushed:{label:'Crushed',positive:false,color:0xa6ad7b,duration:3,moveSpeed:.8,description:'Movement speed reduced by 20%.'},
  bulwark:{label:'Bulwark',positive:true,color:0xe0ce91,duration:4,defense:.8,description:'Takes 20% less direct attack damage.'},
  judged:{label:'Judged',positive:false,color:0xc1b084,duration:4,damage:.9,description:'Deals 10% less direct attack damage.'},
  hunger:{label:'Hunger',positive:true,color:0xb4ce84,duration:4,leech:.2,description:'Heals for 20% of subsequent unblocked direct damage dealt.'},
  infected:{label:'Infected',positive:false,color:0xa6b85e,duration:4,dot:2,healing:.5,description:'Loses 2 HP per second and receives 50% less healing for 4 seconds.'},
};

// Triggers belong to the actual move, so delayed projectiles retain their effects.
export const STATUS_LOADOUTS={
  capoeira:{skill1:{statusSelf:['flow']},skill2:{statusTarget:['offBalance']}},
  magic:{skill1:{statusTarget:['weakened']},skill2:{statusSelf:['arcaneSurge']}},
  soldier:{skill1:{statusSelf:['focus']},skill2:{statusTarget:['exposed']}},
  archer:{skill1:{statusSelf:['hunterPace']},skill2:{statusTarget:['hobbled']}},
  greatsword:{skill1:{statusSelf:['poise']},skill2:{statusTarget:['sundered']}},
  axe:{skill1:{statusSelf:['fury']},skill2:{statusTarget:['bleeding']}},
  mutant:{skill1:{statusTarget:['crushed']},skill2:{statusSelf:['enraged']}},
  paladin:{skill1:{statusSelf:['bulwark']},skill2:{statusCleanse:true,statusTarget:['judged']}},
  zombie:{kick:{statusTarget:['infected']},skill1:{statusSelf:['hunger']},skill2:{statusTarget:['infected']}},
};

// A reward for finishing the entire ultimate, including a whiff. Interruptions
// never reach the completion hook. Reuse existing effects rather than stacking.
export const ULTIMATE_REWARDS={capoeira:'flow',magic:'arcaneSurge',soldier:'focus',archer:'hunterPace',greatsword:'poise',axe:'fury',mutant:'enraged',paladin:'bulwark',zombie:'hunger'};
export function grantUltimateReward(fighter,move){
  if(!fighter.alive||fighter.hp<=0||fighter.world.combatEnabled===false)return;
  if(move.statusCleanseOnComplete)fighter.statuses.cleanse();
  for(const id of move.statusOnComplete||[])fighter.statuses.apply(id,fighter);
}
export function configureStatuses(roster){
  for(const[id,reward]of Object.entries(ULTIMATE_REWARDS)){
    roster[id].ultimate.statusOnComplete=[reward];
    if(id==='paladin')roster[id].ultimate.statusCleanseOnComplete=true;
  }
  for(const [fighter,moves]of Object.entries(STATUS_LOADOUTS))for(const [key,properties]of Object.entries(moves))Object.assign(roster[fighter][key],properties);
}

export class StatusEffects{
  constructor(owner){this.owner=owner;this.entries=new Map();}
  apply(id,source=this.owner,duration=STATUS_TYPES[id]?.duration){
    const type=STATUS_TYPES[id];if(!type||!this.owner.alive||this.owner.hp<=0||!(duration>0))return false;
    const old=this.entries.get(id);
    if(old){old.remaining=Math.max(old.remaining,duration);old.source=source;}
    else{this.entries.set(id,{id,type,remaining:duration,source,tick:0});this.owner.world.onStatusApplied?.(this.owner,type);}
    return true;
  }
  clear(){this.entries.clear();this.owner.mover.statusSpeed=1;}
  cleanse(){for(const[id,e]of this.entries)if(!e.type.positive)this.entries.delete(id);}
  multiplier(stat){
    let value=1;for(const e of this.entries.values())value*=e.type[stat]??1;
    const bounds={moveSpeed:[.6,1.25],damage:[.65,1.4],defense:[.65,1.35],knockTaken:[.4,1.4],healing:[.25,1.25]};
    const [low,high]=bounds[stat]||[.25,2];return Math.max(low,Math.min(high,value));
  }
  get leech(){let value=0;for(const e of this.entries.values())value=Math.max(value,e.type.leech||0);return value;}
  heal(amount){
    const c=this.owner;if(!c.alive||c.hp<=0||amount<=0)return 0;
    const before=c.hp;c.hp=Math.min(c.maxHp,c.hp+amount*this.multiplier('healing'));return c.hp-before;
  }
  update(dt){
    if(!this.owner.alive){this.clear();return;}
    for(const[id,e]of this.entries){
      const active=Math.min(dt,e.remaining);e.remaining=Math.max(0,e.remaining-dt);
      if(e.type.dot){
        e.tick+=active;
        while(e.tick>=1-1e-8&&this.owner.alive){e.tick=Math.max(0,e.tick-1);this.owner.takeStatusDamage(e.type.dot,e.source,e.type);}
      }
      if(e.remaining<=1e-8)this.entries.delete(id);
    }
  }
}

export function resolveStatusHit(attacker,target,result,move){
  if(result==='miss')return;
  if(result==='blocked'){
    if(target.profile.id==='paladin')target.statuses.apply('bulwark',target,2);
    return;
  }
  // Existing hunger heals this hit; newly earned hunger starts on following hits.
  attacker.statuses.heal(target.lastDamage*attacker.statuses.leech);
  if(move.statusCleanse)attacker.statuses.cleanse();
  for(const id of move.statusSelf||[])attacker.statuses.apply(id,attacker);
  for(const id of move.statusTarget||[])target.statuses.apply(id,attacker);
}

export function statusMoveDescription(move){
  const describe=(ids,target)=>(ids||[]).map(id=>`${target}: ${STATUS_TYPES[id].label} (${STATUS_TYPES[id].duration}s). ${STATUS_TYPES[id].description}`);
  return [...describe(move.statusSelf,'Self'),...describe(move.statusTarget,'Enemy'),...describe(move.statusOnComplete,'Ultimate complete'),...(move.statusCleanseOnComplete?['Ultimate complete: cleanse your debuffs.']:[]),...(move.statusCleanse?['On hit: cleanse your debuffs.']:[])].join(' ');
}
