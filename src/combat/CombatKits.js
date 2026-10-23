// Combat-only loadouts using clips already embedded from each dedicated pack.
// Slots: kick = 1, skill1 = 2, skill2 = 3. Ultimate definitions remain independent.
const weapon=['weapon:tip','weapon:mid','weapon:base'];
function copy(source,patch={}){
  const {chain,sequence,sequenceOnly,playerOnly,input,...move}=source;
  return {...move,...patch};
}
function chain(kit,stages){
  const parts=stages.map(([source,patch])=>copy(source,{skill:false,cooldown:.08,power:'light',fade:.045,...patch}));
  kit.punch={...parts[0],cooldown:0,chain:parts};
}
function skill(source,patch){return copy(source,{skill:true,fade:.055,...patch});}

export function applyCombatKits(roster){
  const c=roster.capoeira,m=roster.magic,r=roster.soldier,b=roster.archer;
  const s=roster.greatsword,a=roster.axe,x=roster.mutant,p=roster.paladin,z=roster.zombie;
  // Keep Roda's familiar three-click chain, with independently usable martial skills.
  c.kick=skill(c.ultimateStrike,{label:'Martelo counter',clip:'UltimateStrike',speed:2.65,damage:17,knock:3,lunge:4,range:1.6,cooldown:3,windows:[[.38,.72]],endAt:.88,cancelAt:.8,dodgeCancelAt:.76});
  c.skill1=skill(c.ultimateStart,{label:'Armada rush',speed:2.7,damage:20,knock:3,lunge:15,lungeDecay:5,range:4,cooldown:5,windows:[[.32,.68]],cancelAt:.8,dodgeCancelAt:.78});
  c.skill2=skill(c.ultimateFinisher,{label:'Compasso sweep',clip:'UltimateFinisher',speed:2.8,damage:25,knock:6,power:'heavy',range:2,lunge:3,cooldown:7,windows:[[.3,.76]],vfx:'sweep'});

  chain(m,[[m.punch,{label:'Arc bolt I',speed:2.7,damage:8,knock:.6,events:[.34],cancelAt:.57,endAt:.8}],
    [m.kick,{label:'Twin cast II',speed:2.8,damage:10,knock:.8,events:[.48],cancelAt:.65,endAt:.86}],
    [m.ultimateStrike,{label:'Arc lance III',speed:3.5,damage:14,knock:3,events:[.46],endAt:.86,cancelAt:.82}]]);
  m.kick=skill(m.kick,{label:'Twin-hand blast',speed:2.5,damage:20,cooldown:4});
  m.skill1=skill(m.ultimateStrike,{label:'Astral lance',speed:3.4,damage:25,knock:4,range:15,projectileSpeed:20,cooldown:6,cancelAt:.8,dodgeCancelAt:.72});
  m.skill2=skill(m.heavy,{label:'Arcane rupture',speed:2.6,damage:26,range:3.1,cooldown:8});

  chain(r,[[r.punch,{label:'Controlled shot I',speed:2,damage:7,knock:.3,cancelAt:.54,endAt:.8}],
    [r.punch,{label:'Controlled shot II',speed:2.2,damage:7,knock:.4,cancelAt:.54,endAt:.8}],
    [r.punch,{label:'Stopping shot III',speed:1.85,damage:11,knock:2,projectileRadius:.08,cancelAt:.76,endAt:.88}]]);
  r.kick=skill(r.kick,{label:'Breach kick',speed:2.3,damage:18,knock:5,lunge:7,range:2,cooldown:3});
  r.skill1=skill(r.heavy,{label:'Suppressing burst',speed:1.4,events:[.18,.45,.72],damage:8,knock:.7,cooldown:5});
  r.skill2=skill(r.ultimateFinisher,{label:'Armor-piercing shot',speed:1.75,damage:27,knock:5,power:'heavy',cooldown:7});

  chain(b,[[b.punch,{label:'Quickshot I',speed:2.2,damage:8,knock:.4,cancelAt:.52,endAt:.8}],
    [b.ultimateStrike,{label:'Quickshot II',speed:2.5,damage:8,knock:.5,cancelAt:.52,endAt:.8}],
    [b.ultimateFinisher,{label:'Driving arrow III',speed:2.2,damage:13,knock:3,power:'light',projectileRadius:.1,cancelAt:.78,endAt:.88}]]);
  b.kick=skill(b.kick,{label:'Hunter counter',speed:2.8,windows:[[.22,.7]],damage:18,knock:5,lunge:6,range:1.8,cooldown:3});
  b.skill1=skill(b.punch,{label:'Three-arrow volley',speed:1.6,events:[.14,.36,.58],windows:[[.1,.65]],damage:9,knock:.7,cancelAt:.8,endAt:.9,cooldown:6});
  b.skill2=skill(b.heavy,{label:'Pinning arrow',speed:1.8,damage:29,knock:5,power:'heavy',projectileRadius:.13,cooldown:7});

  chain(s,[[s.punch,{label:'Crosscut I',speed:3,damage:11,knock:.8,cancelAt:.68,endAt:.86}],
    [s.ultimateStart,{label:'Return cut II',speed:3.4,damage:12,knock:1,cancelAt:.7,endAt:.86}],
    [s.heavy,{label:'Breaker III',speed:2.8,damage:19,knock:5,power:'heavy',cancelAt:.86,endAt:.94}]]);
  s.kick=skill(s.skill2,{label:'Sliding cut',speed:3.1,damage:19,lunge:13,range:4,cooldown:4});
  s.skill1=skill(s.skill1,{label:'Skywheel cleave',speed:3,damage:26,cooldown:7,vfx:'sweep'});
  s.skill2=skill(s.ultimateFinisher,{label:'Skybreaker slam',speed:2.9,damage:30,knock:7,power:'heavy',lunge:7,range:3,cooldown:8,vfx:'blade'});

  chain(a,[[a.punch,{label:'Hook cut I',speed:3.6,damage:12,knock:.8,cancelAt:.7,endAt:.88}],
    [a.heavy,{label:'Downward cut II',speed:3.2,damage:14,knock:1,cancelAt:.72,endAt:.9}],
    [a.skill1,{label:'Cyclone III',speed:3.8,damage:18,knock:5,power:'heavy',cancelAt:.86,endAt:.94,vfx:'sweep'}]]);
  a.kick=skill(a.ultimateStart,{label:'Double cleave',speed:4,windows:[[.18,.34],[.48,.66]],damage:11,knock:1.4,cancelAt:.8,endAt:.9,cooldown:4});
  a.skill1=skill(a.skill1,{label:'Whirlwind cleave',speed:3.7,damage:27,cooldown:7,vfx:'sweep'});
  a.skill2=skill(a.skill2,{label:'Leaping execution',speed:3.6,damage:29,knock:6,power:'heavy',cooldown:7});

  chain(x,[[x.punch,{label:'Claw rake I',speed:3.7,damage:12,knock:.8,cancelAt:.7,endAt:.87}],
    [x.heavy,{label:'Crushing fist II',speed:3.1,damage:14,knock:1,windows:[[.2,.34]],cancelAt:.64,endAt:.84}],
    [x.skill1,{label:'Groundbreaker III',speed:3.6,damage:19,knock:5,range:1.9,power:'heavy',cancelAt:.86,endAt:.94}]]);
  x.kick=skill(x.heavy,{label:'Crushing blow',speed:3.2,damage:24,cooldown:4});
  x.skill1=skill(x.skill1,{label:'Crater slam',speed:3.5,damage:30,cooldown:8});
  x.skill2=skill(x.ultimateStrike,{label:'Rending rush',speed:3.5,damage:22,knock:4,lunge:14,lungeDecay:5,range:4,cooldown:6});

  chain(p,[[p.punch,{label:'Sword cut I',speed:2.9,damage:10,knock:.8,cancelAt:.7,endAt:.86}],
    [p.ultimateStrike,{label:'Oathkeeper II',speed:2.8,damage:12,knock:1,cancelAt:.72,endAt:.87}],
    [p.heavy,{label:'Guardbreaker III',speed:2.9,damage:18,knock:5,power:'heavy',cancelAt:.86,endAt:.94}]]);
  p.kick=skill(p.ultimateStrike,{label:'Oathkeeper cut',speed:2.9,damage:19,knock:3,cancelAt:.8,endAt:.9,cooldown:3.5});
  p.skill1=skill(p.skill1,{label:'Shield-line advance',speed:3.2,damage:22,cooldown:5});
  p.skill2=skill(p.heavy,{label:'Judgment cut',clip:'UltimateFinisher',strikers:weapon,speed:2.5,windows:[[.45,.7]],damage:30,knock:7,power:'heavy',lunge:4,range:2.2,cooldown:8,vfx:'blade'});

  chain(z,[[z.punch,{label:'Claw rake I',speed:3.1,damage:9,knock:.7,cancelAt:.7,endAt:.86}],
    [z.ultimateStrike,{label:'Frenzied rake II',speed:3.5,damage:10,knock:.8,cancelAt:.7,endAt:.86}],
    [z.heavy,{label:'Feeding bite III',speed:3,damage:17,knock:4,power:'heavy',cancelAt:.86,endAt:.94}]]);
  z.kick=skill(z.heavy,{label:'Parasite bite',speed:3,damage:23,knock:4,cooldown:4});
  z.skill1=skill(z.skill1,{label:'Ravenous lunge',speed:3.3,damage:23,lunge:14,range:4,cooldown:5});
  z.skill2=skill(z.ultimateStart,{label:'Parasite shock',clip:'Kick',kind:'area',strikers:[],events:[.3],windows:[[.24,.4]],speed:3.5,damage:18,knock:6,power:'light',range:2.7,lunge:0,cancelAt:.7,endAt:.85,cooldown:7});
  const icons={capoeira:'boot',magic:'magic',soldier:'rifle',archer:'bow',greatsword:'sword',axe:'axe',mutant:'claw',paladin:'sword',zombie:'claw'};
  for(const [id,kit] of Object.entries(roster))for(const key of ['punch','heavy','kick','skill1','skill2']){
    const move=kit[key];
    move.icon=move.kind==='area'?'area':move.strikers?.some(name=>name.includes('Foot'))?'boot':icons[id];
  }

}
