const cast=(label,clip,extra={})=>({label,clip,kind:'projectile',projectileStyle:'void',castBone:'mixamorigLeftHand',events:[.4],windows:[[.32,.62]],strikers:[],minSpeed:.7,strikeRadius:.2,
 speed:2.1,fade:.06,endAt:.9,cancelAt:.78,dodgeCancelAt:.72,damage:10,knock:1,power:'light',lunge:0,range:12,projectileSpeed:13,projectileRadius:.16,cooldown:0,color:0xa56aff,icon:'magic',...extra});
const jab=cast('Void bolt','Light',{events:[.34],cancelAt:.63}),cross=cast('Twilight bolt','Cross',{events:[.4],color:0x77d4ed,cancelAt:.7}),third=cast('Rift bolt','Combo',{events:[.42],projectileRadius:.21,knock:2.5});
export const VOID_MAGE_MOVES={
 punch:{...jab,chain:[{...jab},{...cross},{...third}]},
 heavy:cast('Void rupture','Heavy',{kind:'area',events:[.52],speed:1.9,range:2.8,damage:22,power:'heavy',knock:5,cooldown:6,icon:'area'}),
 kick:cast('Graviton orb','Skill1',{skill:true,events:[.46],speed:2,damage:18,projectileRadius:.26,projectileSpeed:10,knock:3,cooldown:4,statusTarget:['hobbled']}),
 skill1:cast('Rift pulse','Skill2',{skill:true,kind:'area',events:[.48],damage:20,range:2.8,power:'heavy',knock:4,cooldown:6,icon:'area',statusSelf:['arcaneWard']}),
 skill2:cast('Void lance','Skill3',{skill:true,events:[.48],speed:2.1,damage:24,projectileRadius:.28,projectileSpeed:16,range:14,knock:3,cooldown:8,statusTarget:['weakened']}),
 ultimateStart:cast('Gather the rift','UltimateStart',{sequenceOnly:true,skill:true,kind:'area',damage:0,events:[],speed:2,endAt:.72}),
 ultimateStrike:cast('Event horizon','UltimateStrike',{sequenceOnly:true,skill:true,damage:26,events:[.46],speed:2.4,projectileRadius:.33,knock:.5,endAt:.88}),
 ultimateFinisher:cast('Rift collapse','UltimateFinisher',{sequenceOnly:true,skill:true,kind:'area',damage:34,events:[.52],speed:2.2,range:3.4,power:'heavy',knock:6,endAt:.94,icon:'area'}),
 ultimate:{label:'Eclipse covenant',input:{label:'4',codes:['Digit4']},sequence:['ultimateStart','ultimateStrike','ultimateFinisher'],cooldown:26,skill:true,playerOnly:true,powerDescription:'Gather void energy, release an orb and collapse the nearby rift. Completion grants Arcane surge for four seconds.'},
};
