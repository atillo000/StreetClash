const hands=['mixamorigLeftHand','mixamorigRightHand'],feet=['mixamorigLeftFoot','mixamorigRightFoot'];
const strike=(label,clip,extra={})=>({label,clip,speed:1.6,fade:.055,endAt:.94,cancelAt:.78,dodgeCancelAt:.74,windows:[[.18,.72]],strikers:hands,minSpeed:.7,strikeRadius:.2,range:1.65,damage:12,knock:1.5,power:'light',lunge:3,cooldown:0,color:0xd5b78c,icon:'fist',...extra});
const jab=strike('Jab','Light',{speed:1.65,windows:[[.2,.62]],cancelAt:.68});
const cross=strike('Cross','Cross',{speed:1.7,windows:[[.21,.66]],cancelAt:.72});
const kick=strike('Body kick','Kick',{strikers:feet,icon:'boot',speed:1.9,windows:[[.24,.78]],range:1.9,knock:4,damage:16});
export const AVATAR_MOVES={
 punch:{...jab,chain:[{...jab},{...cross},{...kick}]},
 heavy:strike('Rising uppercut','Heavy',{speed:1.45,damage:23,power:'heavy',knock:5,cooldown:3.2,windows:[[.17,.74]]}),
 kick:strike('Counter knee','Knee',{skill:true,strikers:['mixamorigLeftLeg','mixamorigRightLeg'],icon:'boot',strikeRadius:.24,speed:1.65,damage:16,knock:3,cooldown:3.5,windows:[[.27,.7]],statusTarget:['stunned']}),
 skill1:strike('Driving hook','Hook',{skill:true,speed:1.65,lunge:10,lungeDecay:5,range:3,damage:21,knock:4,cooldown:6,windows:[[.17,.72]],statusSelf:['flow']}),
 skill2:strike('Pressure combination','Combo',{skill:true,speed:1.4,windows:[[.19,.35],[.43,.65]],damage:12,knock:1,lunge:3,range:1.8,cooldown:8,statusTarget:['offBalance']}),
 ultimateStart:strike('Opening jab','UltimateStart',{sequenceOnly:true,skill:true,speed:1.8,damage:9,knock:.5,endAt:.9,windows:[[.2,.62]]}),
 ultimateStrike:strike('Follow-up cross','UltimateStrike',{sequenceOnly:true,skill:true,speed:1.8,damage:11,knock:.6,endAt:.9,windows:[[.21,.66]]}),
 ultimateCombo:strike('Turning hook','UltimateCombo',{sequenceOnly:true,skill:true,speed:1.8,damage:14,knock:.6,endAt:.9,windows:[[.17,.72]]}),
 ultimateFinisher:strike('Rising finisher','UltimateFinisher',{sequenceOnly:true,skill:true,speed:1.65,damage:26,knock:6,power:'heavy',launchSpeed:3.3,endAt:.95,windows:[[.17,.74]]}),
 ultimate:{label:'Street resolve',input:{label:'4',codes:['Digit4']},sequence:['ultimateStart','ultimateStrike','ultimateCombo','ultimateFinisher'],cooldown:26,skill:true,playerOnly:true,powerDescription:'Jab, cross, hook and a launching uppercut. Completing the sequence grants four seconds of Poise.'},
};
