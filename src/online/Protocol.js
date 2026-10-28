export const NET={version:1,maxPlayers:4,inputHz:15,snapshotHz:15,interpolationMs:100,inputTimeoutMs:500,hostTimeoutMs:12000,roundSeconds:120};
export const PLAYABLE=['capoeira','magic','soldier','archer','greatsword','axe','paladin','avatar'];
export const ACTIONS=['punch','heavy','kick','skill1','skill2','ultimate'];
const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
export function validInput(p){return p&&Number.isSafeInteger(p.seq)&&p.seq>=0&&Array.isArray(p.dir)&&p.dir.length===2&&p.dir.every(n=>finite(n,-1,1))&&finite(p.aim,-Math.PI*2,Math.PI*2)&&Array.isArray(p.point)&&p.point.length===3&&p.point.every(n=>finite(n,-100,100))&&Array.isArray(p.attacks)&&p.attacks.length<=6&&p.attacks.every(a=>ACTIONS.includes(a))&&['aiming','block','walk','crouch','sprint','jump','dodge','switchWeapon'].every(k=>typeof p[k]==='boolean');}
export function validSnapshot(p,ids){return p&&p.v===NET.version&&Number.isSafeInteger(p.seq)&&p.seq>=0&&finite(p.remaining,0,NET.roundSeconds)&&Array.isArray(p.actors)&&p.actors.length===ids.length&&new Set(p.actors.map(a=>a.id)).size===ids.length&&p.actors.every(a=>ids.includes(a.id)&&PLAYABLE.includes(a.fighter)&&Array.isArray(a.p)&&a.p.length===3&&a.p.every(n=>finite(n,-30,30))&&finite(a.yaw,-1000,1000)&&finite(a.hp,0,10000)&&finite(a.progress,0,1.01)&&typeof a.state==='string'&&typeof a.clip==='string')&&Array.isArray(p.events)&&p.events.length<=96&&Array.isArray(p.powers)&&p.powers.length<=8&&Array.isArray(p.shots)&&p.shots.length<=48;}
export const shortName=s=>String(s||'Fighter').trim().replace(/[\u0000-\u001f]/g,'').slice(0,20)||'Fighter';
export const topic=(room,user)=>'sc:'+room+':'+user;

// Supabase Free has a project-wide 100-message/second limit, including fan-out.
// These rates target one active friends room with headroom for control traffic.
export const roomRates=count=>count>=4?{inputHz:6,snapshotHz:6}:count===3?{inputHz:10,snapshotHz:10}:{inputHz:NET.inputHz,snapshotHz:NET.snapshotHz};
