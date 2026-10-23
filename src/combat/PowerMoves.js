// Original class powers. These reuse each fighter's authored attack clip.
// Configure BEFORE CombatBalance so new event counts share the same damage budget.
export const POWER_DESCRIPTIONS={
 tornado:'Releases a moving cyclone. Hits each enemy once; cover stops it.',
 dragon:'Releases a spectral dragon projectile. The first enemy or solid surface stops it.',
 lightning:'Discharges a weapon-aligned lightning bolt into the first target or cover.',
 windArrow:'Fires a wind-wrapped arrow through a single target.',
 fissure:'Releases a ground-following seismic wave that hits each enemy once.',
 spirits:'Summons two stationary arcane wisps for four one-second pulses. The full pulse sequence shares one damage budget per target.',
 guardians:'Summons holy sword wards for three one-second pulses. Enemies inside the visible circle take damage; walls block the pulses.',
};
export function configurePowers(roster){
 const set=(id,key,power,label,patch={})=>Object.assign(roster[id][key],{specialPower:power,label,kind:['spirits','guardians'].includes(power)?'area':'projectile',strikers:[],events:[roster[id][key].windows?.[0]?.[0]||.4],lunge:0,projectileRadius:.28,projectileSpeed:12,...patch});
 set('capoeira','skill2','tornado','Compasso cyclone',{range:6,projectileSpeed:5.5,projectileRadius:.65});
 set('magic','skill1','dragon','Astral dragon',{range:15,projectileSpeed:14,projectileRadius:.4,color:0xb9a0ed});
 set('magic','ultimateFinisher','spirits','Astral familiars',{range:3.6,powerPulses:4,power:'light',knock:0,color:0xbba3e8});
 set('magic','ultimateStrike','dragon','Dragon flight',{range:15,projectileSpeed:14,projectileRadius:.4,color:0xb9a0ed,events:[.46]});
 roster.magic.ultimate.label='Dragon covenant';roster.magic.ultimate.powerDescription='Launches a spectral dragon, then summons two arcane wisps that pulse for four seconds.';
 set('soldier','skill2','lightning','Arc penetrator',{range:15,color:0x9acde2,events:[.38]});
 set('archer','skill2','windArrow','Gale arrow',{range:14,projectileSpeed:19,projectileRadius:.18,color:0xc1dbab});
 set('greatsword','skill2','fissure','Seismic breaker',{range:6,projectileSpeed:7,projectileRadius:.55,color:0xe3b376});
 set('axe','skill1','tornado','Iron cyclone',{range:5.5,projectileSpeed:5,projectileRadius:.75,color:0xd8b283});
 set('paladin','skill2','lightning','Judgment bolt',{range:7,color:0xefdaa1});
 set('paladin','ultimateFinisher','guardians','Oath guardians',{range:3.4,powerPulses:3,power:'light',knock:0,color:0xe8d298});
 roster.paladin.ultimate.label='Guardian oath';roster.paladin.ultimate.powerDescription='Summons two holy sword wards after the sword combination. Three pulses share the finisher damage budget.';
}
