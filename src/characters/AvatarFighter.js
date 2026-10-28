// The supplied avatar model and a dedicated unarmed kickboxing loadout.
const free='./assets/animations/Quaternius Universal Animation Library/standard.glb';
const mix=n=>'./assets/animations/Custom Avatar/Mixamo/'+n+'.fbx';
const box=n=>'./assets/animations/Boxing Animation/'+n+'.fbx';
const loco=n=>'./assets/animations/locomotion/'+n+'.fbx';
export const AVATAR_FIGHTER={
 id:'avatar',name:'Carl',role:'Kickboxer',color:'#d5b78c',weapon:null,maxHp:100,
 description:'Your custom avatar. Jab-cross-kick combinations, counter knees and an uppercut ultimate.',
 height:1.8,radius:.38,walkSpeed:1.9,runSpeed:5.3,sprintSpeed:6.4,lockSpeed:3.4,accel:36,turnRate:20,gaitRate:1.08,
 source:'./assets/characters/Custom Character Avatars/avatar/My Own Face Character.fbx',url:'./assets/characters/generated/avatar.glb',
 normalizeMixamoNames:true,boneAnimationOnly:true,
 animationSourceScales:{'./assets/animations/Custom Avatar/Mixamo/':100},stripUnusedMorphTargets:true,compressOpaqueTextures:true,
 clips:{Idle:mix('Boxing Idle'),AimIdle:mix('Boxing Idle'),Walk:free,Run:free,Sprint:free,Jump:free,JumpLoop:free,Land:free,Roll:free,
  Light:mix('Lead Jab'),Cross:mix('Rear Cross'),Hook:mix('Rear Hook'),Heavy:mix('Rear Uppercut'),Knee:mix('Knee Strike'),Hit:free,HitBack:box('Hit Reaction'),HitLeft:box('Hit Reaction'),HitRight:box('Hit Reaction'),
  Kick:box('Mma Kick'),Combo:mix('Jab Cross Combo'),Block:box('Outward Block'),Down:box('Knocked Down'),GetUp:box('Getting Up'),Defeat:box('Defeat'),Victory:box('Victory'),
  StrafeLeftWalk:loco('left strafe walking'),StrafeRightWalk:loco('right strafe walking'),StrafeLeftRun:loco('left strafe'),StrafeRightRun:loco('right strafe'),TurnLeft:loco('left turn 90'),TurnRight:loco('right turn 90'),
  UltimateStart:mix('Lead Jab'),UltimateStrike:mix('Rear Cross'),UltimateCombo:mix('Rear Hook'),UltimateFinisher:mix('Rear Uppercut')},
 clipNames:{Walk:'Walk_Loop',Run:'Jog_Fwd_Loop',Sprint:'Sprint_Loop',Jump:'Jump_Start',JumpLoop:'Jump_Loop',Land:'Jump_Land',Roll:'Roll',Hit:'Hit_Chest'},
 // Mixamo includes long guard tails. Keep anticipation, contact and recovery.
 clipTrims:{Light:[.06,.48],Cross:[.12,.5],Hook:[.08,.55],Heavy:[.08,.55],Knee:[.12,.63],Combo:[.06,.52],Kick:[.12,.75],
  UltimateStart:[.06,.48],UltimateStrike:[.12,.5],UltimateCombo:[.08,.55],UltimateFinisher:[.08,.55]},
};
