const magic=n=>'./assets/animations/Magic Character Animation Pack/Pro Magic Locomotion Pack/'+n+'.fbx';
const shared=n=>'./assets/animations/Boxing Animation/'+n+'.fbx';
const free='./assets/animations/Quaternius Universal Animation Library/standard.glb';
export const VOID_MAGE_FIGHTER={
 id:'voidmage',name:'Void Mage',role:'Rift Caster',color:'#a56aff',weapon:'voidglaive',maxHp:100,
 description:'Purple void magic, a floating hand orb and an ornate crescent glaive. An original approximation of your supplied mage concept.',
 height:1.82,radius:.38,walkSpeed:1.9,runSpeed:5.3,sprintSpeed:6.3,lockSpeed:3.3,crouchSpeed:1.25,accel:36,turnRate:20,gaitRate:1.05,
 source:'./assets/characters/Void Mage/source/void-mage-rigged.fbx',url:'./assets/characters/generated/voidmage.glb',
 normalizeMixamoNames:true,boneAnimationOnly:true,
 textureTemplate:'./assets/characters/Void Mage/source/void-mage-tripo-static-low.glb',templateFlipY:true,maxTextureSize:2048,
 clips:{Idle:magic('Standing Idle 04'),AimIdle:magic('standing idle'),IdleFidget:magic('Standing Idle 03'),
  Walk:magic('Standing Walk Forward'),Run:magic('Standing Run Forward'),Sprint:magic('Standing Sprint Forward'),
  BackWalk:magic('Standing Walk Back'),BackRun:magic('Standing Run Back'),CombatWalk:magic('Standing Walk Forward'),CombatRun:magic('Standing Run Forward'),
  StrafeLeftWalk:magic('Standing Walk Left'),StrafeRightWalk:magic('Standing Walk Right'),StrafeLeftRun:magic('Standing Run Left'),StrafeRightRun:magic('Standing Run Right'),
  TurnLeft:magic('Standing Turn Left 90'),TurnRight:magic('Standing Turn Right 90'),Jump:magic('Standing Jump'),JumpLoop:free,Land:magic('Standing Land To Standing Idle'),Roll:free,
  Light:magic('Standing 1H Magic Attack 01'),Cross:magic('Standing 1H Magic Attack 02'),Combo:magic('Standing 1H Magic Attack 03'),Heavy:magic('Standing 2H Magic Area Attack 02'),
  Skill1:magic('standing 1H cast spell 01'),Skill2:magic('Standing 2H Magic Area Attack 01'),Skill3:magic('Standing 2H Magic Attack 05'),
  UltimateStart:magic('Standing 2H Cast Spell 01'),UltimateStrike:magic('Standing 2H Magic Attack 03'),UltimateFinisher:magic('Standing 2H Magic Area Attack 02'),
  Block:magic('Standing Block Idle'),Hit:magic('Standing React Small From Front'),HitBack:magic('Standing React Small From Back'),HitLeft:magic('Standing React Small From Left'),HitRight:magic('Standing React Small From Right'),
  Defeat:magic('Standing React Death Backward'),DefeatBack:magic('Standing React Death Forward'),DefeatLeft:magic('Standing React Death Right'),DefeatRight:magic('Standing React Death Left'),Down:shared('Knocked Down'),GetUp:shared('Getting Up'),Victory:shared('Victory')},
 clipNames:{JumpLoop:'Jump_Loop',Roll:'Roll'},clipTrims:{},
};

