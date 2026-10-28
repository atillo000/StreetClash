// Physical responses are authored independently of damage flags and VFX color.
// groundResponse: none | chip | scorch | frost | fracture.
export function configureEnvironmentMoves(roster){
 const tag=(move,extra)=>{if(move)move.environment={...move.environment,...extra};};
 for(const[id,kit]of Object.entries(roster))for(const move of Object.values(kit))for(const stage of [move,...(move.chain||[])]){
  tag(stage,{propDamage:1,groundResponse:id==='magic'?'scorch':'chip',groundContact:false,surface:stage.kind==='area'?'air':'contact',reaction:'none'});
  // No damage/range on setup poses: charging never breaks scenery.
  if(stage.skill||stage.sequenceOnly)tag(stage,{reaction:({avatar:'wind',capoeira:'wind',magic:'arcane',soldier:'storm',archer:'frost',greatsword:'frost',axe:'heat',paladin:'holy',mutant:'earth',zombie:'toxin',chupacabra:'shadow'})[id]||'none'});
  if(stage.specialPower==='tornado')tag(stage,{reaction:id==='axe'?'heatWind':'wind',groundResponse:'none',path:'wind',pathPropDamage:.45});
  if(stage.specialPower==='fissure')tag(stage,{reaction:'frost',groundResponse:'fracture',path:'seismic',pathPropDamage:.7});
  if(stage.specialPower==='lightning')tag(stage,{reaction:id==='paladin'?'holy':'storm',groundResponse:'scorch'});
  if(stage.specialPower==='windArrow')tag(stage,{reaction:'wind',groundResponse:'chip'});
  if(stage.specialPower==='dragon')tag(stage,{reaction:'arcane',groundResponse:'scorch'});
  if(stage.specialPower==='spirits'||stage.specialPower==='guardians')tag(stage,{reaction:stage.specialPower==='spirits'?'arcane':'holy',surface:'air',groundResponse:'none',propDamage:0});
 }
 for(const id of ['greatsword','axe','paladin']){
  const kit=roster[id];
  for(const move of [kit.heavy,kit.skill2,kit.ultimateFinisher,kit.punch.chain?.at(-1)]){
   // A bolt, companion or seismic projectile is not a swept sword strike.
   if(move?.strikers?.some(s=>s.startsWith('weapon:')))tag(move,{groundContact:true,groundResponse:id==='paladin'?'chip':'fracture',propDamage:1.25});
  }
 }
 for(const move of [roster.mutant.skill1,roster.mutant.ultimateFinisher,roster.mutant.punch.chain?.at(-1),roster.chupacabra?.skill1,roster.chupacabra?.ultimateFinisher]){
  if(move?.kind==='area')tag(move,{surface:'ground',groundResponse:'fracture',reaction:'earth',propDamage:1.3});
 }
 for(const move of [roster.magic.heavy,roster.magic.skill2])tag(move,{surface:'ground',groundResponse:'scorch',reaction:'arcane'});
 for(const id of ['zombie','chupacabra'])for(const move of Object.values(roster[id]||{}))if(move.kind==='area'&&move.environment?.surface!=='ground')tag(move,{surface:'air',groundResponse:'none',propDamage:0});
}
