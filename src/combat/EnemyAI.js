import * as THREE from 'three';
import { Navigator } from '../physics/Navigator.js';
import { SparringAI } from './SparringAI.js';

// Keep normal rival behavior, but creatures do not perform human blocks/rolls.
export class EnemyAI extends SparringAI{
  reset(){super.reset();if(this.navigator&&this.navigator.radius!==this.c.radius)this.navigator=new Navigator(this.c.world.arena,this.c.radius);}
  update(dt){
    const c=this.c;if(!c.profile.enemyOnly)return super.update(dt);
    c.wantBlock=false;c.mover.lockFacing=null;
    if(!this.enabled||!c.alive||c.inactive){c.mover.steer(new THREE.Vector3(),0);return;}
    const enemy=c._nearestEnemy();if(!enemy)return;
    this.cool-=dt;this.repathT-=dt;c.target=enemy.c;c.aimPoint=enemy.c.position.clone();
    const visible=c.world.arena.hasLineOfSight(c.position,enemy.c.position);
    if(c.state==='attack'){
      if(c.moveId==='punch'&&c.comboStage<(c.moves.punch.chain?.length||1)&&c.character.actionProgress()>.5)c.tryAttack('punch',enemy.angle);
      return;
    }
    if(c.state!=='free')return;
    const range=c.profile.boss?2.35:1.08;
    if(enemy.dist>range||!visible){
      if(this.repathT<=0){this.path=this.navigator.findPath(c.position,enemy.c.position);this.repathT=.55;}
      while(this.path.length&&Math.hypot(this.path[0].x-c.position.x,this.path[0].z-c.position.z)<.18)this.path.shift();
      const goal=this.path[0]||enemy.c.position;
      c.mover.steer(new THREE.Vector3(goal.x-c.position.x,0,goal.z-c.position.z).normalize(),1,false);this.behavior='hunt';
    }else{c.mover.steer(new THREE.Vector3(),0);c.mover.lockFacing=enemy.angle;this.behavior='engage';}
    if(visible&&this.cool<=0){
      const choices=Object.entries(c.moves).filter(([id,m])=>!m.sequenceOnly&&!m.playerOnly&&m.kind!=='mobility'&&enemy.dist<=(m.range||1.3)&&!(c.cooldowns[id]>0));
      const entry=choices[Math.floor(this.random()*choices.length)];
      if(entry&&c.tryAttack(entry[0],enemy.angle)){this.cool=c.profile.boss?1.1+this.random()*.8:1.6+this.random()*.8;this.behavior=entry[1].label;}
    }
  }
}
