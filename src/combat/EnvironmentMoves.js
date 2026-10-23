// Ground damage is explicit, not inferred from the 'heavy' damage flag.
// Sword/axe ground marks still require their swept weapon to touch the floor.
export function configureEnvironmentMoves(roster){
  const tag=(move,extra)=>{if(move)move.environment={...move.environment,...extra};};
  for(const[id,kit]of Object.entries(roster))for(const move of Object.values(kit)){
    const stages=move.chain||[move];
    for(const stage of stages)tag(stage,{propDamage:1,groundStyle:id==='magic'?'scorch':id==='soldier'||id==='archer'?'chip':'crack'});
  }
  for(const id of ['greatsword','axe','paladin']){
    const kit=roster[id];
    for(const key of ['heavy','skill2','ultimateFinisher'])tag(kit[key],{groundContact:true,propDamage:1.25});
    tag(kit.punch.chain?.at(-1),{groundContact:true});
  }
  const brute=roster.mutant;
  for(const move of [brute.skill1,brute.ultimateFinisher,brute.punch.chain?.at(-1)])tag(move,{surface:'ground',groundStyle:'crack',propDamage:1.3});
  for(const move of [brute.Roar,brute.skill2])if(move?.kind==='area')tag(move,{surface:'air',propDamage:0});
  for(const move of [roster.magic.heavy,roster.magic.skill2,roster.magic.ultimateFinisher])tag(move,{surface:'ground',groundStyle:'scorch',propDamage:1});
  // A scream is a body-height energy pulse, not a crater or a structural blast.
  tag(roster.zombie.skill2,{surface:'air',propDamage:0});
  tag(roster.chupacabra?.skill2,{surface:'air',propDamage:0});
  // Paladin's existing ultimate ends with a ground-directed area judgment.
  tag(roster.paladin.ultimateFinisher,{surface:'ground',groundStyle:'crack',propDamage:1.25});
}
