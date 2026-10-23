import * as THREE from 'three';
import { Combatant } from '../combat/Combatant.js';
import { EnemyAI } from '../combat/EnemyAI.js';

// Three reusable zombie slots. Spawn/despawn never adds permanent actors,
// materials, status shells, navigation graphs or health bars during a match.
export class EnemyPool{
  constructor({world,scene,library,size=3}){
    this.world=world;this.entries=[];this.point=new THREE.Vector3();
    for(let i=0;i<size;i++){
      const setup=library.create('zombie',0);scene.add(setup.character.root);
      const c=new Combatant({...setup,world,name:'PARASITE '+(i+1),team:'e',spawn:new THREE.Vector3(4,0,-4),spawnFacing:0});
      c.isMinion=true;world.combatants.push(c);
      const ai=new EnemyAI(c),tag=document.createElement('div');tag.className='minion-nameplate';tag.hidden=true;
      tag.innerHTML='<b>PARASITE</b><div role="progressbar" aria-label="Parasite zombie health"><i></i></div>';document.body.appendChild(tag);
      this.entries.push({c,ai,tag});
    }
    this.clear();
  }
  get living(){return this.entries.filter(({c})=>!c.inactive&&c.alive).length;}
  clear(){for(const{c,ai,tag}of this.entries){c.inactive=true;c.hp=0;c._setState('dead');c.statuses.clear();c.character.root.visible=false;c.mover.steer(new THREE.Vector3(),0);c.mover.velocity.set(0,0,0);c.mover.impulse.set(0,0,0);ai.enabled=false;tag.hidden=true;}}
  spawn(count){
    this.clear();const player=this.world.combatants[0],main=this.world.combatants[1];
    const points=[[-4.5,-4.5],[4.5,-4.5],[-4.5,4.5],[4.5,4.5],[0,-5.4]];
    points.sort((a,b)=>Math.hypot(b[0]-player.position.x,b[1]-player.position.z)-Math.hypot(a[0]-player.position.x,a[1]-player.position.z));
    const usable=points.filter(p=>Math.hypot(p[0]-main.position.x,p[1]-main.position.z)>2);
    this.entries.slice(0,Math.min(count,this.entries.length)).forEach(({c,ai},i)=>{
      c.inactive=false;c.character.root.visible=true;c.spawn.set(usable[i][0],this.world.arena.groundHeight(usable[i][0],usable[i][1]),usable[i][1]);c.reset();c.iframes=.8;ai.reset();
      this.world.effects?.pulse(c.position,0x9dba6b,.7);
    });
  }
  update(dt,enabled){for(const{c,ai}of this.entries){ai.enabled=enabled&&!c.inactive;ai.update(dt);if(!c.alive&&c.deadT>2.8){c.inactive=true;c.character.root.visible=false;}}}
  render(camera,enabled){for(const{c,tag}of this.entries){
    tag.hidden=!enabled||c.inactive||!c.alive;if(tag.hidden)continue;
    const head=c.character.bone('mixamorigHead');if(head)head.getWorldPosition(this.point);else this.point.copy(c.position).add(new THREE.Vector3(0,c.height,0));
    this.point.y+=.22;this.point.project(camera);
    tag.hidden=this.point.z< -1||this.point.z>1||Math.abs(this.point.x)>.96||Math.abs(this.point.y)>.9;
    if(!tag.hidden){tag.style.left=(this.point.x*.5+.5)*100+'%';tag.style.top=(-this.point.y*.5+.5)*100+'%';tag.querySelector('i').style.width=Math.max(0,c.hp/c.maxHp)*100+'%';const bar=tag.querySelector('[role]');bar.setAttribute('aria-valuenow',Math.ceil(c.hp));bar.setAttribute('aria-valuemax',c.maxHp);}
  }}
}
