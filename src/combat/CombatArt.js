// Presentation and launch tuning only. Damage, cooldowns, bindings and clips
// stay in fighterMoves.js. Element names also select impact sound/lighting.
export const COMBAT_ART={
 capoeira:{element:'wind',color:0xc5f1ff},magic:{element:'fire',color:0xffae50},
 soldier:{element:'storm',color:0x83dfff},archer:{element:'frost',color:0x9eeaff},
 greatsword:{element:'frost',color:0x8cdfff},axe:{element:'fire',color:0xffad47},
 paladin:{element:'holy',color:0xffde8c},mutant:{element:'earth',color:0xc4ad85},
 zombie:{element:'toxin',color:0xb4dd79},chupacabra:{element:'shadow',color:0xb79aff}
};
export function configureCombatArt(roster){
 for(const[id,kit]of Object.entries(roster))for(const[key,move]of Object.entries(kit)){
  const art=COMBAT_ART[id]||COMBAT_ART.capoeira;
  for(const stage of [move,...(move.chain||[])]){
   stage.element??=art.element;stage.artColor??=art.color;
   // Launch selected melee finishers; ordinary bullets/pulses cannot juggle.
   if(stage.power==='heavy'&&stage.kind!=='projectile'&&stage.kind!=='area'&&!stage.specialPower&&['heavy','ultimateFinisher'].includes(key))stage.launchSpeed??=key==='ultimateFinisher'?4.1:3.3;
  }
 }
}
