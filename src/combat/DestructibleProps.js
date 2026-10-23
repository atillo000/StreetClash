import * as THREE from 'three';

const UP=new THREE.Vector3(0,1,0);
function remove(array,item){const i=array.indexOf(item);if(i>=0)array.splice(i,1);}
export function boxSurfaceNormal(point,box){
  let best=Infinity,axis='y',sign=1;
  for(const key of ['x','y','z'])for(const side of ['min','max']){const d=Math.abs(point[key]-box[side][key]);if(d<best){best=d;axis=key;sign=side==='min'?-1:1;}}
  const n=new THREE.Vector3();n[axis]=sign;return n;
}

export class DestructibleProps{
  constructor(world,effects){
    this.world=world;this.arena=world.arena;this.effects=effects;this.props=this.arena.breakables;
    this.effects.wreck.groundHeight=(x,z)=>this.arena.groundHeight(x,z);
    this.byBounds=new Map(this.props.map(p=>[p.bounds,p]));this.arena.revision=0;
  }
  visible(origin,point,ignore){
    const delta=point.clone().sub(origin),length=delta.length();if(length<.001)return true;
    const ray=new THREE.Ray(origin,delta.normalize()),hit=new THREE.Vector3();
    for(const box of this.arena.cameraBlockers){if(box===ignore)continue;if(box.containsPoint(origin))return false;if(ray.intersectBox(box,hit)&&hit.distanceTo(origin)<length-.035)return false;}
    return true;
  }
  damage(prop,owner,move,point){
    if(!prop.alive||!this.world.combatEnabled)return false;
    const factor=move.environment?.propDamage??1;if(factor<=0)return false;
    const amount=Math.max(0,move.damage||0)*factor*(owner.statuses?.multiplier('damage')??1);
    if(amount<=0)return false;
    const damage=Math.min(prop.hp,amount);prop.hp=Math.max(0,prop.hp-amount);
    this.effects.wreck.fragments(point,prop.material,amount,prop.hp<=0);
    this.effects.impact(point,move.color??0xbda57f,prop.hp<=0);
    for(const {material,base}of prop.materials)material.color.copy(base).multiplyScalar(.7+.3*prop.hp/prop.maxHp);
    if(prop.hp<=0){prop.alive=false;prop.root.visible=false;remove(this.arena.obstacles,prop.bounds);remove(this.arena.cameraBlockers,prop.bounds);this.arena.revision++;}
    this.arena.syncBreakables();
    this.world.onPropImpact?.(owner,prop,damage,!prop.alive);return true;
  }
  sweep(owner,move,from,to,radius,seen){
    const delta=to.clone().sub(from),length=delta.length();if(length<.00001)return;
    const ray=new THREE.Ray(from,delta.clone().normalize());let closest=null,closestPoint=null,distance=Infinity;
    for(const box of this.arena.cameraBlockers){
      const expanded=box.clone().expandByScalar(radius),hit=expanded.containsPoint(from)?from.clone():ray.intersectBox(expanded,new THREE.Vector3());
      if(!hit)continue;const d=hit.distanceTo(from);if(d<=length+.001&&d<distance){distance=d;closest=box;closestPoint=hit;}
    }
    const prop=this.byBounds.get(closest),key=prop||closest;
    if(closest&&!seen.has(key)){
      const eye=owner.position.clone().add(new THREE.Vector3(0,.8,0));
      if(this.visible(eye,closestPoint,closest)){
        seen.add(key);const normal=boxSurfaceNormal(closestPoint,closest),point=closestPoint.clone().addScaledVector(normal,-radius);
        if(prop)this.damage(prop,owner,move,point);else this.surface(owner,move,point,closest,normal);
      }
    }
    // A heavy sword/axe cut only scars the floor if the active weapon reaches it.
    const floor=this.arena.groundHeight(to.x,to.z);
    if(move.environment?.groundContact&&!seen.has('ground')&&Math.min(from.y,to.y)<=floor+.14&&owner.position.y<=this.arena.groundHeight(owner.position.x,owner.position.z)+.15){
      const t=Math.abs(to.y-from.y)>.0001?THREE.MathUtils.clamp((floor+.06-from.y)/(to.y-from.y),0,1):1;
      const point=from.clone().lerp(to,t);point.y=this.arena.groundHeight(point.x,point.z);
      if(this.visible(owner.position.clone().add(new THREE.Vector3(0,.5,0)),point,null)){
        seen.add('ground');this.groundImpact(owner,move,point,.65);
      }
    }
  }
  groundImpact(owner,move,point,scale=1){
    if(Math.abs(point.x)>this.arena.halfSize||Math.abs(point.z)>this.arena.halfSize)return;
    const floorPoint=point.clone();floorPoint.y=this.arena.groundHeight(point.x,point.z);
    const damage=(move.damage||0)*(owner.statuses?.multiplier('damage')??1),kind=move.environment?.groundStyle||'chip';
    const excavates=kind==='crack'||kind==='scorch'&&(damage>=18||move.environment?.surface==='ground');
    if(excavates){
      const radius=Math.min(2.25,(.65+Math.sqrt(damage)*.15)*scale);
      this.arena.terrain.impact(floorPoint,damage,radius,kind==='scorch');
      floorPoint.y=this.arena.groundHeight(point.x,point.z);
      this.effects.wreck.fragments(floorPoint,'rubble',damage,true);
    }else{
      this.effects.wreck.mark(floorPoint,this.arena.terrain.normalAt(point.x,point.z),kind,damage);
      this.effects.wreck.fragments(floorPoint,'stone',damage*.25);
    }
    if(kind!=='chip')this.effects.cast(floorPoint.clone().add(new THREE.Vector3(0,.12,0)),0xaaa28e,'smoke');
  }
  area(owner,move,center){
    const air=move.environment?.surface==='air'||center.y>this.arena.groundHeight(center.x,center.z)+.25;
    if(!air)this.groundImpact(owner,move,center,Math.min(1.4,move.range/2));
    if((move.environment?.propDamage??1)<=0)return;
    const origin=center.clone().add(new THREE.Vector3(0,air?.8:.25));
    const targets=this.props.filter(p=>p.alive&&p.bounds.distanceToPoint(origin)<=move.range).sort((a,b)=>a.bounds.distanceToPoint(origin)-b.bounds.distanceToPoint(origin));
    for(const prop of targets){const point=prop.bounds.clampPoint(origin,new THREE.Vector3());if(this.visible(origin,point,prop.bounds))this.damage(prop,owner,move,point);}
  }
  surface(owner,move,point,box,normal){
    const prop=this.byBounds.get(box);
    if(prop?.alive){this.damage(prop,owner,move,point);return;}
    this.effects.impact(point,move.color);
    if(!box&&normal.y>.25&&point.y<=this.arena.groundHeight(point.x,point.z)+.08)this.groundImpact(owner,move,point,.5);
    else{const magic=move.environment?.groundStyle==='scorch';this.effects.wreck.mark(point,normal,magic?'scorch':'chip',move.damage,magic?.18+Math.sqrt(move.damage||1)*.035:undefined);this.effects.wreck.fragments(point,box?.surfaceMaterial||'stone',(move.damage||5)*.25);}
  }
  update(dt){
    this.arena.terrain.update(dt);
    // Settle surviving stacked props when their support is destroyed. No floating
    // upper crates; collider and visual bounds move together. Debris is cosmetic.
    const alive=this.props.filter(p=>p.alive).sort((a,b)=>a.bounds.min.y-b.bounds.min.y);
    for(const prop of alive){const b=prop.bounds;
      // Sample the footprint corners as well as its center: a wide crate bridges
      // a narrow crack instead of sinking through the intact lip.
      let support=-Infinity;
      for(const x of [b.min.x,(b.min.x+b.max.x)/2,b.max.x])for(const z of [b.min.z,(b.min.z+b.max.z)/2,b.max.z])support=Math.max(support,this.arena.groundHeight(x,z));
      for(const other of this.arena.obstacles){if(other===b||other.max.y>b.min.y+.025)continue;
        if(Math.min(b.max.x,other.max.x)-Math.max(b.min.x,other.min.x)>.08&&Math.min(b.max.z,other.max.z)-Math.max(b.min.z,other.min.z)>.08)support=Math.max(support,other.max.y);
      }
      if(b.min.y>support+.002){prop.fallSpeed+=10*dt;const dy=-Math.min(prop.fallSpeed*dt,b.min.y-support);prop.root.position.y+=dy;b.translate(new THREE.Vector3(0,dy,0));}
      else {prop.fallSpeed=0;if(b.min.y<support-.002){const rise=support-b.min.y;prop.root.position.y+=rise;b.translate(new THREE.Vector3(0,rise,0));}}
    }
    this.arena.syncBreakables();
  }
  reset(){
    this.arena.terrain.reset();
    for(const prop of this.props){prop.alive=true;prop.hp=prop.maxHp;prop.fallSpeed=0;prop.root.visible=true;prop.root.position.copy(prop.initialPosition);prop.bounds.copy(prop.initialBounds);
      if(!this.arena.obstacles.includes(prop.bounds))this.arena.obstacles.push(prop.bounds);if(!this.arena.cameraBlockers.includes(prop.bounds))this.arena.cameraBlockers.push(prop.bounds);
      for(const{material,base}of prop.materials)material.color.copy(base);
    }
    this.arena.revision++;this.arena.syncBreakables();this.effects.wreck.clear();
  }
}
