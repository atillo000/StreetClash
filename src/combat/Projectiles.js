import * as THREE from 'three';
import { boxSurfaceNormal } from './DestructibleProps.js';
import { sweepHurtCapsule } from '../physics/collision.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class Projectiles {
  constructor(scene, world, effects, capacity = 48) {
    Object.assign(this, { world, effects, capacity });
    this.free = Array.from({ length: capacity }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), life: 0 }));
    this.items = [];
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 1), new THREE.MeshBasicMaterial(), capacity);
    this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh);
    const shaft = new THREE.CylinderGeometry(0.009, 0.009, 0.65, 5).rotateX(Math.PI / 2);
    const head = new THREE.ConeGeometry(0.035, 0.13, 4).rotateX(Math.PI / 2).translate(0, 0, 0.37);
    const arrow = mergeGeometries([shaft, head]); shaft.dispose(); head.dispose();
    this.arrows = new THREE.InstancedMesh(arrow, new THREE.MeshBasicMaterial({ color: 0xdbe8ba }), capacity);
    this.arrows.frustumCulled = false; this.arrows.count = 0; scene.add(this.arrows);
    this.dummy = new THREE.Object3D();
    this.point = new THREE.Vector3();
    this.expandedBox = new THREE.Box3();
  }

  clear() { this.free.push(...this.items); this.items.length = 0; this.mesh.count = 0; this.arrows.count = 0; }

  emit(owner, move) {
    const it = this.free.pop(); if (!it) return;
    it.owner = owner; it.move = move; it.context=owner.hitContext;
    const source = owner.equipment?.muzzle || owner.character.bone('mixamorigRightHand');
    source.getWorldPosition(it.position);
    const target = owner.target?.alive ? owner.target : owner._nearestEnemy()?.c;
    const heading = new THREE.Vector3(Math.sin(owner.mover.facing), 0, Math.cos(owner.mover.facing));
    if (owner.castTarget) heading.copy(owner.castTarget).sub(it.position).normalize();
    else if (target && target.position.distanceTo(owner.position) <= move.range && !owner.move) {
      const direction = target.position.clone().sub(owner.position).normalize();
      if (direction.dot(heading) > 0.5) heading.copy(target.position).add(new THREE.Vector3(0, 1, 0)).sub(it.position).normalize();
    }
    it.velocity.copy(heading).multiplyScalar(move.projectileSpeed);
    it.position.addScaledVector(heading, 0.08);
    it.life = move.range / move.projectileSpeed; it.trailT = 0;
    this.items.push(it);
    this.effects.spark(it.position, move.color, owner.profile?.id === 'soldier' ? 3 : 5, 1.4);
  }

  area(owner, move) {
    const center = move.targeted ? owner.castPoint : owner.position;
    if (!center || (move.targeted && !this.world.arena.hasLineOfSight(owner.position, center))) return;
    const airborne=move.environment?.surface==='air'||center.y>(this.world.arena.groundHeight?.(center.x,center.z)??0)+.25;
    if(airborne)this.effects.cast(center.clone().add(new THREE.Vector3(0,Math.max(.9,(owner.height||1.7)*.52),0)),move.color,'pulse');else this.effects.pulse(center.clone().setY(this.world.arena.groundHeight?.(center.x,center.z)??0),move.color,move.range);
    this.world.destruction?.area(owner,move,center);
    for (const target of this.world.combatants) {
      if (target === owner || target.team === owner.team || !target.alive) continue;
      if (target.position.distanceTo(center) > move.range + target.radius || Math.abs(target.position.y - center.y) > 1) continue;
      if (!this.world.arena.hasLineOfSight(center, target.position)) continue;
      const dir = target.position.clone().sub(center).setY(0).normalize();
      if (dir.lengthSq() < 0.001) dir.set(Math.sin(owner.mover.facing), 0, Math.cos(owner.mover.facing));
      const point = target.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      const result = target.takeHit({ damage: move.damage, knock: move.knock, power: move.power, dir, attacker: owner, point, move, context:owner.hitContext });
      if (result !== 'miss') this.world.onHit(owner, target, result, move, point);
    }
  }

  update(dt) {
    for(let i=this.items.length-1;i>=0;i--){
      const it=this.items[i],from=it.position.clone();it.position.addScaledVector(it.velocity,dt);it.life-=dt;it.trailT+=dt;
      if(['magic','archer'].includes(it.owner.profile?.id)&&it.trailT>=.05){it.trailT=0;this.effects.projectileTrail?.(it.position,it.move.color,it.move.projectileStyle);}
      const delta=it.position.clone().sub(from),distance=delta.length(),direction=delta.clone().normalize(),ray=new THREE.Ray(from,direction);
      let surfaceDistance=Infinity,surfaceBox=null;
      for(const box of this.world.arena.cameraBlockers||this.world.arena.obstacles){
        this.expandedBox.copy(box).expandByScalar(it.move.projectileRadius);
        const hit=this.expandedBox.containsPoint(from)?from:ray.intersectBox(this.expandedBox,this.point);
        if(hit){const d=from.distanceTo(hit);if(d<surfaceDistance){surfaceDistance=d;surfaceBox=box;}}
      }
      const terrainHit=this.world.arena.terrain.intersectSegment(from,it.position,it.move.projectileRadius);
      if(terrainHit&&terrainHit.distance<surfaceDistance){surfaceDistance=terrainHit.distance;surfaceBox=null;}
      // Resolve the nearest actual contact first; a victim in front of a wall
      // must not also spawn a wall/floor impact behind them.
      const candidates=[];
      for(const target of this.world.combatants){
        if(target===it.owner||target.team===it.owner.team||!target.alive)continue;
        if(!sweepHurtCapsule(from,it.position,target,it.move.projectileRadius,this.point))continue;
        const d=from.distanceTo(this.point);if(d<=surfaceDistance+.001)candidates.push({target,point:this.point.clone(),distance:d});
      }
      candidates.sort((a,b)=>a.distance-b.distance);let spent=false;
      for(const candidate of candidates){
        const result=candidate.target.takeHit({damage:it.move.damage,knock:it.move.knock,power:it.move.power,dir:it.velocity.clone().setY(0).normalize(),attacker:it.owner,point:candidate.point,move:it.move,context:it.context});
        if(result==='miss')continue;
        this.world.onHit(it.owner,candidate.target,result,it.move,candidate.point);spent=true;break;
      }
      if(!spent&&surfaceDistance<=distance){
        const point=from.clone().addScaledVector(direction,surfaceDistance),normal=surfaceBox?boxSurfaceNormal(point,surfaceBox):terrainHit.normal;
        if(surfaceBox)point.addScaledVector(normal,-it.move.projectileRadius);else point.copy(terrainHit.point);
        if(this.world.destruction)this.world.destruction.surface(it.owner,it.move,point,surfaceBox,normal);else this.effects.impact(point,it.move.color);
        spent=true;
      }
      if(spent||it.life<=0){this.free.push(it);this.items[i]=this.items[this.items.length-1];this.items.pop();}
    }
    this.sync();
  }

  sync() {
    let arrows = 0, particles = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i], bullet = it.owner.profile?.id === 'soldier';
      this.dummy.position.copy(it.position);
      this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), it.velocity.clone().normalize());
      if (it.move.projectileStyle === 'arrow') {
        this.dummy.scale.setScalar(1); this.dummy.updateMatrix(); this.arrows.setMatrixAt(arrows++, this.dummy.matrix); continue;
      }
      if (bullet) this.dummy.scale.set(0.5, 0.5, 3);
      else this.dummy.scale.setScalar(it.move.projectileRadius / 0.07);
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(particles, this.dummy.matrix); this.mesh.setColorAt(particles++, new THREE.Color(it.move.color));
    }
    this.mesh.count = particles; this.mesh.instanceMatrix.needsUpdate = true;
    this.arrows.count = arrows; this.arrows.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
