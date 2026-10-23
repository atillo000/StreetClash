// Enemy-only boss loadouts. Bigger poses need larger reach, not faster clips.
export function configureEnemyMoves(roster){
  const brute=roster.mutant;
  for(const move of Object.values(brute))for(const stage of move.chain||[move]){
    if(stage.strikers?.length){stage.range=Math.max(stage.range||0,2.7);stage.strikeRadius=Math.max(stage.strikeRadius||0,.48);}
    if(stage.speed)stage.speed*=.78;
  }
  const beast=structuredClone(brute);
  beast.punch.label='Raking claws';
  beast.punch.chain[0].label='Left claw';beast.punch.chain[1].label='Backhand claw';beast.punch.chain[1].clip='ClawReturn';
  beast.punch.chain[2]={...beast.punch.chain[0],label:'Double rake',clip:'DoubleClaw',windows:[[.2,.4],[.48,.7]],damage:10,knock:3,endAt:.9,cancelAt:.84};
  beast.heavy={...beast.heavy,label:'Savage claw',clip:'Heavy',damage:24,cooldown:4};
  beast.kick={...beast.skill2,label:'Blood rush',clip:'Light',damage:17,range:4,lunge:8,cooldown:6};
  beast.skill1={...beast.skill1,label:'Predator pounce',clip:'Slam',damage:26,range:3.2,cooldown:9};
  beast.skill2={...beast.skill2,label:'Hunting howl',clip:'Roar',kind:'area',strikers:[],events:[.42],windows:[[.36,.52]],damage:10,knock:5,range:3.8,lunge:0,cooldown:10,environment:{surface:'air',propDamage:0},statusSelf:['enraged']};
  beast.ultimate={...beast.ultimate,label:'Predator frenzy'};
  for(const move of Object.values(beast))for(const stage of move.chain||[move])stage.color=0xd2ae81;
  roster.chupacabra=beast;
}
