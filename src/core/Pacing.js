// One tuning point for a slightly calmer game. Never scale the fixed timestep,
// UI timers, status durations or mouse input: those must remain responsive.
export const PACE={movement:.9,attack:.9,projectile:.9,lunge:.9,knockback:.9,dodge:.92,reaction:.95,turn:.95,acceleration:.95,jump:.95,gravity:.9};
export function pacedProfile(base){
  const profile={...base};
  for(const key of ['walkSpeed','runSpeed','sprintSpeed','lockSpeed','crouchSpeed'])if(Number.isFinite(profile[key]))profile[key]*=PACE.movement;
  if(Number.isFinite(profile.accel))profile.accel*=PACE.acceleration;
  if(Number.isFinite(profile.turnRate))profile.turnRate*=PACE.turn;
  if(!Number.isFinite(profile.crouchSpeed))profile.crouchSpeed=PACE.movement;
  return profile;
}
const tuned=new WeakSet();
export function paceMoves(roster){
  function visit(move){
    if(!move||tuned.has(move))return;tuned.add(move);
    for(const[key,factor]of [['speed',PACE.attack],['projectileSpeed',PACE.projectile],['lunge',PACE.lunge],['knock',PACE.knockback]])if(Number.isFinite(move[key]))move[key]*=factor;
    for(const stage of move.chain||[])visit(stage);
  }
  for(const kit of Object.values(roster))for(const move of Object.values(kit))visit(move);
}
export function paceDefense(defense){
  for(const [id,move]of Object.entries(defense)){
    if(Number.isFinite(move.speed))move.speed*=id==='dodge'?PACE.dodge:PACE.reaction;
    if(id==='dodge'&&Number.isFinite(move.impulse))move.impulse*=PACE.dodge;
  }
  return defense;
}
