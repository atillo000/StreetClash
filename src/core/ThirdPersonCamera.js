import * as THREE from 'three';
import { shortestAngle } from '../characters/Mover.js';

// Compact arena framing. User zoom stays close; lock-on may add only 0.6 m.
// Focus, orbit and collision recovery smooth independently so leaving cover
// never snaps the camera back to full distance.
export class ThirdPersonCamera {
  constructor(camera, { distance = 4.8, pitch = 0.38, height = 1.15 } = {}) {
    this.camera=camera; this.yaw=0; this.pitch=pitch; this.distance=distance; this.height=height;
    this.minDistance=3.8; this.maxDistance=5.8; this.sensitivity=0.0022;
    this.focus=new THREE.Vector3(); this._first=true; this.shakeAmt=0;
    this.viewYaw=0;this.viewPitch=pitch;this.viewDistance=distance;this.clearDistance=distance;
    this.radius=0.18;this.expanded=new THREE.Box3();this.ray=new THREE.Ray();
    this.anchor=new THREE.Vector3();this.want=new THREE.Vector3();this.offset=new THREE.Vector3();this.point=new THREE.Vector3();
    this.avoidYaw=0;this.avoidPitch=0;this.renderYaw=0;
    this.probe=camera.clone();this.screenPoint=new THREE.Vector3();this.probeDirection=new THREE.Vector3();
  }
  shake(amount){this.shakeAmt=Math.max(this.shakeAmt,amount);}
  forward(out=new THREE.Vector3()){return out.set(-Math.sin(this.renderYaw),0,-Math.cos(this.renderYaw));}
  right(out=new THREE.Vector3()){return out.set(Math.cos(this.renderYaw),0,-Math.sin(this.renderYaw));}
  clearance(direction,distance,blockers){
    this.ray.set(this.focus,direction);let clear=distance;
    for(const box of blockers){this.expanded.copy(box).expandByScalar(this.radius);
      if(this.ray.intersectBox(this.expanded,this.point))clear=Math.min(clear,Math.max(.3,this.point.distanceTo(this.focus)-.08));}
    return clear;
  }
  framingFits(direction,distance,player,enemy){
    this.probe.projectionMatrix.copy(this.camera.projectionMatrix);
    this.probe.position.copy(this.focus).addScaledVector(direction,distance);
    this.probe.lookAt(this.focus);this.probe.updateMatrixWorld(true);
    for(const actor of enemy?[player,enemy]:[player])for(const y of [0,2.3]){
      this.screenPoint.copy(actor);this.screenPoint.y+=y;this.screenPoint.project(this.probe);
      if(Math.abs(this.screenPoint.x)>.94||Math.abs(this.screenPoint.y)>.94||this.screenPoint.z< -1||this.screenPoint.z>1)return false;
    }
    return true;
  }
  applyLook(look){
    this.yaw-=look.dx*this.sensitivity;
    this.pitch=THREE.MathUtils.clamp(this.pitch+look.dy*this.sensitivity,0.12,0.85);
    this.distance=THREE.MathUtils.clamp(this.distance+look.wheel*.4,this.minDistance,this.maxDistance);
  }
  trackTarget(dt,playerPos,enemyPos){
    const heading=Math.atan2(enemyPos.x-playerPos.x,enemyPos.z-playerPos.z)+Math.PI;
    this.yaw+=shortestAngle(this.yaw,heading)*(1-Math.exp(-7*dt));
  }
  update(dt,targetPos,look={dx:0,dy:0,wheel:0},lockPos=null,blockers=[],shoulder=false){
    this.applyLook(look);
    const step=Math.min(Math.max(dt,0),.1),snap=this._first;
    if(snap)this.renderYaw=this.yaw;
    this.anchor.set(targetPos.x,targetPos.y+this.height,targetPos.z);this.want.copy(this.anchor);
    let distance=THREE.MathUtils.clamp(this.distance,this.minDistance,this.maxDistance);
    if(lockPos){
      this.offset.subVectors(lockPos,targetPos).setY(0);
      const separation=this.offset.length();
      this.offset.multiplyScalar(.18).clampLength(0,.8);this.want.add(this.offset);
      distance=Math.min(this.maxDistance,distance+THREE.MathUtils.clamp((separation-5)*.1,0,.6));
    }else{
      this.want.addScaledVector(this.forward(this.offset),.18);
      if(shoulder)this.want.addScaledVector(this.right(this.offset),.42);
    }
    // A shoulder/lock offset must not put the look-at point inside nearby cover.
    this.offset.subVectors(this.want,this.anchor);let length=this.offset.length();
    if(length>1e-5){
      this.ray.set(this.anchor,this.offset.normalize());let clear=length;
      for(const box of blockers){this.expanded.copy(box).expandByScalar(this.radius);
        if(this.ray.intersectBox(this.expanded,this.point))clear=Math.min(clear,Math.max(0,this.point.distanceTo(this.anchor)-.08));}
      this.want.copy(this.anchor).addScaledVector(this.ray.direction,clear);
    }
    if(snap){this.focus.copy(this.want);this.viewYaw=this.yaw;this.viewPitch=this.pitch;this.viewDistance=distance;}
    else{
      this.focus.lerp(this.want,1-Math.exp(-16*step));
      this.viewYaw+=shortestAngle(this.viewYaw,this.yaw)*(1-Math.exp(-18*step));
      this.viewPitch=THREE.MathUtils.lerp(this.viewPitch,this.pitch,1-Math.exp(-16*step));
      this.viewDistance=THREE.MathUtils.lerp(this.viewDistance,distance,1-Math.exp(-10*step));
    }
    let cp=Math.cos(this.viewPitch);
    this.offset.set(Math.sin(this.viewYaw)*cp,Math.sin(this.viewPitch),Math.cos(this.viewYaw)*cp);
    let clear=this.clearance(this.offset,this.viewDistance,blockers),avoidYaw=0,avoidPitch=0;
    // Hugging cover should not turn the player into a screen-filling close-up.
    // Prefer a small clear orbit/lift that still frames both actors over zooming
    // through a crate. The search runs only when the direct camera is obstructed.
    if(clear<3.2){
      let best=-Infinity;
      for(const lift of [0,.2,.4])for(const turn of [0,-.35,.35,-.7,.7,-1.05,1.05]){
        const pitch=Math.min(1,this.viewPitch+lift),yaw=this.viewYaw+turn,cos=Math.cos(pitch);
        this.probeDirection.set(Math.sin(yaw)*cos,Math.sin(pitch),Math.cos(yaw)*cos);
        const available=this.clearance(this.probeDirection,this.viewDistance,blockers);
        if(available<3||!this.framingFits(this.probeDirection,available,targetPos,lockPos))continue;
        const score=available-Math.abs(turn)*.6-lift*.8-Math.abs(turn-this.avoidYaw)*.25-Math.abs(lift-this.avoidPitch)*.2;
        if(score>best){best=score;avoidYaw=turn;avoidPitch=pitch-this.viewPitch;}
      }
    }
    if(snap){this.avoidYaw=avoidYaw;this.avoidPitch=avoidPitch;}
    else{const ease=1-Math.exp(-9*step);this.avoidYaw=THREE.MathUtils.lerp(this.avoidYaw,avoidYaw,ease);this.avoidPitch=THREE.MathUtils.lerp(this.avoidPitch,avoidPitch,ease);}
    this.renderYaw=this.viewYaw+this.avoidYaw;const pitch=this.viewPitch+this.avoidPitch;cp=Math.cos(pitch);
    this.offset.set(Math.sin(this.renderYaw)*cp,Math.sin(pitch),Math.cos(this.renderYaw)*cp);
    clear=this.clearance(this.offset,this.viewDistance,blockers);
    this.clearDistance=snap?clear:clear<this.clearDistance?clear:THREE.MathUtils.lerp(this.clearDistance,clear,1-Math.exp(-5*step));
    this.camera.position.copy(this.focus).addScaledVector(this.offset,this.clearDistance);
    if(this.shakeAmt>.001){
      // Angular shake cannot push the camera back through an obstruction.
      const amount=this.shakeAmt;this.want.copy(this.focus);
      this.want.x+=(Math.random()-.5)*amount;this.want.y+=(Math.random()-.5)*amount;
      this.shakeAmt*=Math.exp(-14*step);
    }else this.want.copy(this.focus);
    this.camera.position.y=Math.max(.35,this.camera.position.y);this.camera.lookAt(this.want);
    this._first=false;
  }
}
