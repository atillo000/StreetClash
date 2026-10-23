import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Ragdolls } from './Ragdolls.js';

// Physics owns loose fragments. Fighters remain animation/controller driven;
// their kinematic capsules can push rubble without rubble moving their feet.
const ENVIRONMENT=(1<<16)|12, FIGHTER=(2<<16)|4, FRAGMENT=(4<<16)|15;
export class RapierPhysics {
  static async create(arena,combatants){await RAPIER.init();return new RapierPhysics(arena,combatants);}
  constructor(arena,combatants){
    this.engine='Rapier';this.version=RAPIER.version();this.arena=arena;this.combatants=combatants;
    this.world=new RAPIER.World({x:0,y:-10,z:0});this.world.timestep=1/60;
    this.fragments=new Set();this.covers=new Map();this.fighters=new Map();this.limit=48;
    this.center=new THREE.Vector3();this.size=new THREE.Vector3();this.rotation=new THREE.Quaternion();
    // 25 cm sampling is sufficient for loose debris. Fighter feet and weapons
    // continue using the original, finer 12.5 cm terrain and swept hit tests.
    this.groundSteps=72;this.heights=new Float32Array((this.groundSteps+1)**2);this.groundVersion=-1;
    const h=arena.halfSize;
    for(const [x,y,z,hx,hy,hz]of [[-h-.2,2,0,.2,4,h],[h+.2,2,0,.2,4,h],[0,2,-h-.2,h,4,.2],[0,2,h+.2,h,4,.2]]){
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z).setCollisionGroups(ENVIRONMENT).setFriction(.8));
    }
    this.syncGround();this.syncEnvironment();this.teleportFighters=true;this.ragdolls=new Ragdolls(this);
  }
  setBudget(count){this.ragdolls?.setBudget(count);return this.limit=count<64?24:count<128?48:72;}
  syncGround(){
    const terrain=this.arena.terrain,version=terrain.physicsRevision??0;
    if(version===this.groundVersion)return;
    const n=this.groundSteps,size=terrain.size;
    for(let x=0;x<=n;x++)for(let z=0;z<=n;z++)this.heights[x*(n+1)+z]=this.arena.groundHeight((x/n-.5)*size,(z/n-.5)*size);
    const shape=new RAPIER.Heightfield(n,n,this.heights,{x:size,y:1,z:size});
    if(this.ground)this.ground.setShape(shape);
    else this.ground=this.world.createCollider(new RAPIER.ColliderDesc(shape).setCollisionGroups(ENVIRONMENT).setFriction(.85).setRestitution(.12));
    this.groundVersion=version;
    // Ground restoration can rise beneath sleeping pieces. Wake only when the
    // collider changes; ordinary settled debris otherwise stays asleep.
    for(const d of this.fragments){
      const p=d.body.translation(),floor=this.arena.groundHeight(p.x,p.z),q=d.body.rotation();
      // A heightfield is one-sided. Lift pieces swept through by a rising floor
      // instead of leaving them underneath the newly restored surface.
      const hx=Math.max(.012,d.scale.x*.65),hy=Math.max(.012,d.scale.y*.65),hz=Math.max(.012,d.scale.z*.65);
      const bottomOffset=Math.abs(2*(q.x*q.y+q.z*q.w))*hx+Math.abs(1-2*(q.x*q.x+q.z*q.z))*hy+Math.abs(2*(q.y*q.z-q.x*q.w))*hz;
      if(floor>(d.groundY??floor)+.00001&&p.y-bottomOffset<floor){
        d.body.setTranslation({x:p.x,y:floor+bottomOffset+.005,z:p.z},true);
        const v=d.body.linvel();d.body.setLinvel({x:v.x,y:Math.max(0,v.y),z:v.z},true);
      }
      d.groundY=floor;d.body.wakeUp();
    }
  }
  syncEnvironment(){
    const active=new Set([...this.arena.obstacles,...this.arena.cameraBlockers]);
    for(const box of active){
      let entry=this.covers.get(box);box.getCenter(this.center);box.getSize(this.size);
      if(!entry){
        const collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(Math.max(.01,this.size.x/2),Math.max(.01,this.size.y/2),Math.max(.01,this.size.z/2)).setTranslation(this.center.x,this.center.y,this.center.z).setCollisionGroups(ENVIRONMENT).setFriction(.75));
        entry={collider,position:this.center.clone(),size:this.size.clone(),enabled:true};this.covers.set(box,entry);
      }else{
        if(!entry.enabled){entry.collider.setEnabled(true);entry.enabled=true;}
        if(!entry.size.equals(this.size)){entry.collider.setShape(new RAPIER.Cuboid(Math.max(.01,this.size.x/2),Math.max(.01,this.size.y/2),Math.max(.01,this.size.z/2)));entry.size.copy(this.size);}
        if(!entry.position.equals(this.center)){entry.collider.setTranslation(this.center);entry.position.copy(this.center);}
      }
    }
    for(const[box,entry]of this.covers)if(entry.enabled&&!active.has(box)){entry.collider.setEnabled(false);entry.enabled=false;}
  }
  syncFighters(){
    for(const fighter of this.combatants){
      let entry=this.fighters.get(fighter);
      if(!entry){const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setEnabled(false));entry={body,collider:null,radius:0,height:0,active:false};this.fighters.set(fighter,entry);}
      const active=fighter.alive&&!fighter.inactive;
      if(!active){if(entry.active)entry.body.setEnabled(false);entry.active=false;continue;}
      const radius=fighter.radius,height=Math.max(radius*2,fighter.height);
      if(radius!==entry.radius||height!==entry.height){
        if(entry.collider)this.world.removeCollider(entry.collider,false);
        entry.collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0,height/2-radius),radius).setCollisionGroups(FIGHTER).setFriction(.4),entry.body);
        entry.radius=radius;entry.height=height;
      }
      this.center.copy(fighter.position);this.center.y+=height/2;
      const old=entry.body.translation(),teleport=this.teleportFighters||!entry.active||this.center.distanceToSquared(old)>4;
      entry.body.setEnabled(true);
      if(teleport)entry.body.setTranslation(this.center,true);
      entry.body.setNextKinematicTranslation(this.center);entry.active=true;
    }
    this.teleportFighters=false;
  }
  spawnFragment(d){
    if(this.fragments.size>=this.limit)return null;
    this.rotation.setFromEuler(d.rotation);
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(d.p.x,d.p.y,d.p.z).setRotation(this.rotation).setLinvel(d.v.x,d.v.y,d.v.z).setAngvel(d.spin).setLinearDamping(.15).setAngularDamping(.45).setCanSleep(true).setCcdEnabled(true));
    // The visible fragment geometry is radius .7, so physical half-extents
    // follow its scaled dimensions rather than a generic full-size box.
    const collider=RAPIER.ColliderDesc.cuboid(Math.max(.012,d.scale.x*.65),Math.max(.012,d.scale.y*.65),Math.max(.012,d.scale.z*.65)).setCollisionGroups(FRAGMENT).setDensity(80).setFriction(.78).setRestitution(.18);
    this.world.createCollider(collider,body);d.groundY=this.arena.groundHeight(d.p.x,d.p.z);d.body=body;this.fragments.add(d);return body;
  }
  removeFragment(d){if(d.body){this.world.removeRigidBody(d.body);d.body=null;}this.fragments.delete(d);}
  step(dt){
    if(!(dt>0))return;
    this.syncGround();this.syncEnvironment();this.syncFighters();
    this.ragdolls.beforeStep(dt);this.world.timestep=dt;this.world.step();this.ragdolls.apply();
    for(const d of this.fragments){const p=d.body.translation();d.groundY=this.arena.groundHeight(p.x,p.z);}
  }
  reset(){this.ragdolls?.clear();for(const d of this.fragments)this.removeFragment(d);this.teleportFighters=true;this.syncGround();this.syncEnvironment();}
  get stats(){let sleeping=0;for(const d of this.fragments)if(d.body.isSleeping())sleeping++;return{engine:this.engine,version:this.version,dynamic:this.fragments.size,limit:this.limit,sleeping,ragdolls:this.ragdolls.activeCount,colliders:this.world.colliders.len()};}
  dispose(){this.reset();this.world.free();}
}
