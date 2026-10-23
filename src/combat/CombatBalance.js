// Damage budgets count every projectile / active window in one activation.
// Keep movement, animations and hit timings independent from balance tuning.
export const CRITICAL_MULTIPLIER=1.25;
export const DAMAGE_BUDGETS={
  capoeira:{chain:[8,9,13],heavy:18,skills:[15,18,22],cooldowns:[3,5,8],ultimate:60,ultimateCooldown:24},
  magic:{chain:[8,9,12],heavy:22,skills:[18,22,24],cooldowns:[4,6,9],ultimate:58,ultimateCooldown:24},
  soldier:{chain:[5,5,8],heavy:18,skills:[15,21,25],cooldowns:[3,6,8],ultimate:56,ultimateCooldown:24},
  archer:{chain:[3,3,5],heavy:20,skills:[15,22,25],cooldowns:[3,6,8],ultimate:56,ultimateCooldown:24},
  greatsword:{chain:[8,9,13],heavy:24,skills:[18,24,26],cooldowns:[4,7,10],ultimate:64,ultimateCooldown:26},
  axe:{chain:[9,10,15],heavy:26,skills:[20,26,27],cooldowns:[4,8,9],ultimate:66,ultimateCooldown:28},
  paladin:{chain:[7,8,11],heavy:22,skills:[17,20,26],cooldowns:[4,6,10],ultimate:60,ultimateCooldown:26},
  mutant:{chain:[9,10,14],heavy:18,skills:[16,22,16]},
  chupacabra:{chain:[8,9,14],heavy:18,skills:[12,20,6]},
  zombie:{chain:[3,3,5],heavy:7,skills:[7,8,4]},
};
export function hitCount(move){return Math.max(1,(move.kind==='projectile'||move.kind==='area'?move.events:move.windows)?.length||1);}
export function activationDamage(move){return Math.max(0,move.damage||0)*hitCount(move);}
const round=value=>Math.round(value*1000)/1000;
function budget(move,total){move.damage=round(total/hitCount(move));}
export function applyCombatBalance(roster){
  for(const[id,tuning]of Object.entries(DAMAGE_BUDGETS)){
    const kit=roster[id];if(!kit)continue;
    kit.punch.chain.forEach((move,i)=>{budget(move,tuning.chain[i]);move.criticalEligible=!!tuning.ultimate&&i===kit.punch.chain.length-1;});
    kit.punch.damage=kit.punch.chain[0].damage;
    budget(kit.heavy,tuning.heavy);
    ['kick','skill1','skill2'].forEach((key,i)=>{budget(kit[key],tuning.skills[i]);if(tuning.cooldowns)kit[key].cooldown=tuning.cooldowns[i];});
    if(!tuning.ultimate)continue;
    // Repeated stage IDs count repeatedly in the ultimate's total budget.
    const total=kit.ultimate.sequence.reduce((n,key)=>n+activationDamage(kit[key]),0);
    for(const key of new Set(kit.ultimate.sequence)){const move=kit[key];move.damage=round(move.damage*tuning.ultimate/Math.max(1,total));move.criticalEligible=key===kit.ultimate.sequence.at(-1);}
    kit.ultimate.cooldown=tuning.ultimateCooldown;
    kit.heavy.cooldown=Math.max(kit.heavy.cooldown||0,id==='magic'?7:id==='axe'?3.8:3.2);
  }
}

export function directDamage({damage,attacker,target,move,context,guarded}){
  const critical=!!move?.criticalEligible&&!attacker?.profile?.enemyOnly&&!guarded&&!!context&&!context.criticalTargets.has(target);
  const attack=attacker?.statuses?.multiplier('damage')??1,defense=target.statuses.multiplier('defense');
  return {damage:Math.max(0,damage)*attack*defense*(critical?CRITICAL_MULTIPLIER:1),critical};
}
