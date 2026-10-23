// Two weapons, one Soldier: preserve HP, cooldowns, statuses and combo state.
// The new pack supplies locomotion; short original recoil clips are prepared
// from its pistol idle pose because the pack contains no shooting take.
export function soldierLoadout(weapons,character,profile,rifleMoves){
  const original=new Map(character.actions);
  const stop=()=>{for(const action of new Set(character.actions.values()))action.stop();};
  function pose(pistol){
    stop();character.action=null;character.actionName=null;character.autoAction=false;character.locoGain=1;character.actions=new Map(original);
    if(pistol)for(const name of original.keys()){
      const action=original.get('Pistol'+name);
      if(action)character.actions.set(name,action);
      else if(['TurnLeft','TurnRight','MoveStart','MoveStop','JumpLoop','Land','IdleFidget'].includes(name))character.actions.delete(name);
    }
    character.startLocomotion(profile);character.transitionBlockT=.3;character.mixer.update(0);character.root.updateMatrixWorld(true);
  }
  const rifle=weapons.create('rifle',character);pose(true);
  const pistol=weapons.create('pistol',character);pose(false);
  const pistolMoves=structuredClone(rifleMoves);
  const rename=(m,label)=>{m.label=label;if(m.kind==='projectile'){m.range=Math.min(m.range,12);m.projectileRadius=.045;}return m;};
  rename(pistolMoves.punch,'Pistol combination');
  pistolMoves.punch.chain.forEach((m,i)=>rename(m,['Pistol shot I','Pistol shot II','Stopping shot III'][i]));
  rename(pistolMoves.heavy,'Pistol burst');rename(pistolMoves.skill1,'Rapid pistol fire');rename(pistolMoves.skill2,'Piercing pistol shot');
  pistolMoves.ultimate.label='Sidearm barrage';
  let active=rifle;
  return {
    realistic:true,rifle,pistol,mode:'rifle',moves:rifleMoves,
    get id(){return active.id;},get root(){return active.root;},get model(){return active.model;},get grip(){return active.grip;},
    get tip(){return active.tip;},get mid(){return active.mid;},get base(){return active.base;},get muzzle(){return active.muzzle;},
    toggle(){this.rifleGait??=character.gaitCalibration;this.mode=this.mode==='rifle'?'pistol':'rifle';character.gaitCalibration=this.mode==='pistol'?(this.pistolGait||null):this.rifleGait;pose(this.mode==='pistol');active=this.mode==='rifle'?rifle:pistol;this.moves=this.mode==='rifle'?rifleMoves:pistolMoves;this.update();return this.mode;},
    kick(){active.kick();},
    update(stowed=false){
      const gunJump=['Jump','JumpRun','JumpLoop','Land','LandRun'].includes(character.actionName);
      const hidden=stowed&&!gunJump;rifle.update(hidden||active!==rifle);pistol.update(hidden||active!==pistol);
    },
    dispose(){rifle.dispose();pistol.dispose();},
  };
}
