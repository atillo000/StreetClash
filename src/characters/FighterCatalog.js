import { IMPORTED_FIGHTERS } from './ImportedFighters.js';
const shared = file => `./assets/animations/Boxing Animation/${file}.fbx`;
const cap = file => `./assets/animations/Capoeira Character Animation Pack/Capoeira Locomotion Pack/${file}.fbx`;
const magic = file => `./assets/animations/Magic Character Animation Pack/Pro Magic Locomotion Pack/${file}.fbx`;
const rifle = file => `./assets/animations/Soldier Character Animation Pack/Pro Rifle Locomotion Pack/${file}.fbx`;
const pistol = file => `./assets/animations/Soldier Character Animation Pack/Pistol or Handgun Locomotion Pack/${file}.fbx`;
const shooter = file => `./assets/animations/Soldier Character Animation Pack/Shooter Locomotion Pack/${file}.fbx`;
const common = { Hit: shared('Hit Reaction'), Down: shared('Knocked Down'), GetUp: shared('Getting Up'),
  Block: shared('Outward Block'), Roll: shared('Stand To Roll'), Defeat: shared('Defeat'), Victory: shared('Victory') };

export const FIGHTERS = {
  capoeira: {
    id: 'capoeira', name: 'Roda', role: 'Capoeira', description: 'Ginga footwork, fast kicks and spinning strikes.', color: '#f2b85b',
    source: './assets/characters/Capoeira Type Character.fbx', url: './assets/characters/generated/capoeira.glb',
    height: 1.8, walkSpeed: 2, runSpeed: 6.4, sprintSpeed: 7.8, lockSpeed: 3.8, accel: 42, turnRate: 22, gaitRate: 1.3, weapon: null,
    clips: { ...common, Idle: cap('ginga variation 1'), AimIdle: cap('ginga variation 2'),
      Walk: './assets/animations/locomotion/walking.fbx', Run: './assets/animations/locomotion/running.fbx',
      CombatWalk: cap('ginga forward'), CombatRun: cap('ginga forward'), BackWalk: cap('ginga backward'), BackRun: cap('ginga backward'),
      StrafeLeftWalk: cap('ginga sideways 2'), StrafeRightWalk: cap('ginga sideways 1'),
      StrafeLeftRun: cap('ginga sideways 2'), StrafeRightRun: cap('ginga sideways 1'),
      Light: cap('meia lua de frente'), Kick: cap('bencao'), Heavy: cap('armada'), Roll: cap('au'),
      Jump: './assets/animations/locomotion/jump.fbx', IdleFidget: cap('ginga variation 3'),
      // Ultimate aliases must be inside clips to be embedded by asset preparation.
      UltimateStart: cap('armada trim start'), UltimateStrike: cap('martelo 2'), UltimateFinisher: cap('meia lua de compasso') },
    moveLabels: ['Meia lua', 'Bencao', 'Armada'],
  },
  magic: {
    id: 'magic', name: 'Vesper', role: 'Magician', description: 'Moving casts, focused bolts and a close-range arcane pulse.', color: '#bd9bff',
    source: './assets/characters/Magic Type Character.fbx', url: './assets/characters/generated/magic.glb',
    height: 1.8, walkSpeed: 1.9, runSpeed: 5.7, sprintSpeed: 6.8, lockSpeed: 3.8, crouchSpeed: 1.35, accel: 36, turnRate: 20, gaitRate: 1.2, weapon: null,
    clips: { ...common, Idle: magic('standing idle'), AimIdle: magic('standing idle 02'), IdleFidget: magic('Standing Idle 03'),
      Walk: magic('Standing Walk Forward'), Run: magic('Standing Run Forward'), Sprint: magic('Standing Sprint Forward'),
      CombatWalk: magic('Standing Walk Forward'), CombatRun: magic('Standing Run Forward'),
      BackWalk: magic('Standing Walk Back'), BackRun: magic('Standing Run Back'),
      StrafeLeftWalk: magic('Standing Walk Left'), StrafeRightWalk: magic('Standing Walk Right'),
      StrafeLeftRun: magic('Standing Run Left'), StrafeRightRun: magic('Standing Run Right'),
      TurnLeft: magic('Standing Turn Left 90'), TurnRight: magic('Standing Turn Right 90'),
      CrouchIdle: magic('Crouch Idle'), CrouchWalk: magic('Crouch Walk Forward'), CrouchBack: magic('Crouch Walk Back'),
      CrouchLeft: magic('Crouch Walk Left'), CrouchRight: magic('Crouch Walk Right'),
      CrouchStart: magic('Standing Idle To Crouch'), CrouchEnd: magic('Crouch To Standing Idle'),
      Jump: magic('Standing Jump'), JumpRun: magic('Standing Jump Running'), Land: magic('Standing Land To Standing Idle'), LandRun: magic('Standing Jump Running Landing'),
      BlockStart: magic('Standing Block Start'), Block: magic('Standing Block Idle'), BlockEnd: magic('Standing Block End'), BlockHit: magic('Standing Block React Large'),
      Hit: magic('Standing React Small From Front'), HitBack: magic('Standing React Small From Back'), HitLeft: magic('Standing React Small From Left'), HitRight: magic('Standing React Small From Right'),
      Defeat: magic('Standing React Death Backward'), DefeatBack: magic('Standing React Death Forward'), DefeatLeft: magic('Standing React Death Right'), DefeatRight: magic('Standing React Death Left'),
      Light: magic('Standing 1H Magic Attack 01'), Kick: magic('Standing 2H Magic Attack 02'), Heavy: magic('Standing 2H Magic Area Attack 02'),
      UltimateStart: magic('Standing 2H Cast Spell 01'), UltimateStrike: magic('Standing 2H Magic Attack 03'),
      UltimateFinisher: magic('Standing 2H Magic Area Attack 02') },
    moveLabels: ['Arc bolt', 'Twin-hand blast', 'Arcane pulse'],
  },
  soldier: {
    id: 'soldier', name: 'Rook', role: 'Soldier', description: 'Textured rifle and pistol loadouts. Press Q while ready to switch weapon and dedicated movement.', color: '#86cbb7',
    source: './assets/characters/Soldier Type Character.fbx', url: './assets/characters/generated/soldier.glb',
    height: 1.85, walkSpeed: 1.9, runSpeed: 5.5, sprintSpeed: 6.7, lockSpeed: 3.5, crouchSpeed: 1.35, accel: 36, turnRate: 20, gaitRate: 1.2, weapon: 'rifle',
    clipTrims: { Kick: [0.12, 0.75] },
    clips: { ...common, Idle: rifle('idle'), AimIdle: rifle('idle aiming'),
      Walk: rifle('walk forward'), Run: rifle('run forward'), Sprint: rifle('sprint forward'),
      CombatWalk: rifle('walk forward'), CombatRun: rifle('run forward'),
      BackWalk: rifle('walk backward'), BackRun: rifle('run backward'),
      StrafeLeftWalk: rifle('walk left'), StrafeRightWalk: rifle('walk right'), StrafeLeftRun: rifle('run left'), StrafeRightRun: rifle('run right'),
      ForwardLeftWalk: rifle('walk forward left'), ForwardRightWalk: rifle('walk forward right'), BackLeftWalk: rifle('walk backward left'), BackRightWalk: rifle('walk backward right'),
      ForwardLeftRun: rifle('run forward left'), ForwardRightRun: rifle('run forward right'), BackLeftRun: rifle('run backward left'), BackRightRun: rifle('run backward right'),
      TurnLeft: rifle('turn 90 left'), TurnRight: rifle('turn 90 right'),
      CrouchIdle: rifle('idle crouching'), CrouchWalk: rifle('walk crouching forward'), CrouchBack: rifle('walk crouching backward'),
      CrouchLeft: rifle('walk crouching left'), CrouchRight: rifle('walk crouching right'),
      CrouchForwardLeft: rifle('walk crouching forward left'), CrouchForwardRight: rifle('walk crouching forward right'),
      CrouchBackLeft: rifle('walk crouching backward left'), CrouchBackRight: rifle('walk crouching backward right'),
      Jump: rifle('jump up'), JumpLoop: rifle('jump loop'), Land: rifle('jump down'),
      MoveStart: shooter('start walking'), MoveStop: shooter('stop walking'),
      Light: shooter('firing rifle'), Heavy: shooter('firing rifle'), Kick: shared('Mma Kick'),
      UltimateStart: rifle('idle aiming'), UltimateStrike: shooter('firing rifle'), UltimateFinisher: shooter('firing rifle'),
      PistolIdle: pistol('pistol idle'), PistolAimIdle: pistol('pistol idle'),
      PistolWalk: pistol('pistol walk'), PistolRun: pistol('pistol run'), PistolSprint: pistol('pistol run'),
      PistolCombatWalk: pistol('pistol walk'), PistolCombatRun: pistol('pistol run'),
      PistolBackWalk: pistol('pistol walk backward'), PistolBackRun: pistol('pistol run backward'),
      PistolStrafeLeftWalk: pistol('pistol strafe'), PistolStrafeRightWalk: pistol('pistol strafe (2)'),
      PistolStrafeLeftRun: pistol('pistol strafe'), PistolStrafeRightRun: pistol('pistol strafe (2)'),
      PistolForwardLeftWalk: pistol('pistol walk arc'), PistolForwardRightWalk: pistol('pistol walk arc (2)'),
      PistolBackLeftWalk: pistol('pistol walk backward arc'), PistolBackRightWalk: pistol('pistol walk backward arc (2)'),
      PistolForwardLeftRun: pistol('pistol run arc'), PistolForwardRightRun: pistol('pistol run arc (2)'),
      PistolBackLeftRun: pistol('pistol run backward arc'), PistolBackRightRun: pistol('pistol run backward arc (2)'),
      PistolCrouchIdle: pistol('pistol kneeling idle'), PistolCrouchStart: pistol('pistol stand to kneel'), PistolCrouchEnd: pistol('pistol kneel to stand'),
      PistolJump: pistol('pistol jump'), PistolJumpRun: pistol('pistol jump (2)'),
      Defeat: rifle('death from the front'), DefeatBack: rifle('death from the back'), DefeatLeft: rifle('death from right') },
    moveLabels: ['Rifle shot', 'Close kick', 'Rifle burst'],
  },
  ...IMPORTED_FIGHTERS,
};

export const FIGHTER_LIST = Object.values(FIGHTERS);
