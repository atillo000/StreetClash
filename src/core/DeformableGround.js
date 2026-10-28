import * as THREE from 'three';

export const GROUND_WRECK_LIFETIME=9;
export const GROUND_RESTORE_DURATION=2;
const recovery=life=>{const t=THREE.MathUtils.clamp(life/GROUND_RESTORE_DURATION,0,1);return t*t*(3-2*t);};

// One fixed heightfield is shared by rendering, feet and projectile contacts.
// Damage changes vertices in place: repeated impacts never allocate new floors.
export class DeformableGround {
  constructor(group, floor, decorations) {
    this.group=group;this.floor=floor;this.decorations=decorations;
    this.floorTint=floor.material.color.clone();this.courtTint=floor.userData.courtColor.clone();floor.material.color.set(0xffffff);
    this.size=floor.geometry.parameters.width;this.steps=floor.geometry.parameters.widthSegments;this.cell=this.size/this.steps;
    this.vertices=floor.geometry.attributes.position;this.vertices.setUsage(THREE.DynamicDrawUsage);
    this.baseHeights=Float32Array.from({length:this.vertices.count},(_,i)=>this.vertices.getY(i));this.heights=new Float32Array(this.baseHeights);this.burnt=new Float32Array(this.vertices.count);
    this.remaining=new Float32Array(this.vertices.count);this.damageHeights=new Float32Array(this.vertices.count);this.damageBurnt=new Float32Array(this.vertices.count);this.updateTime=0;this.damaged=false;
    this.originals=new Map(decorations.map(mesh=>[mesh,new Float32Array(mesh.geometry.attributes.position.array)]));
    this.color=new THREE.Color();this.slabs=[];this.serial=0;this.dirtyVertices=new Set();this.normalVertices=new Set();
    const outline=new THREE.Shape();outline.moveTo(-.55,-.42);outline.lineTo(.28,-.54);outline.lineTo(.62,.1);outline.lineTo(.14,.5);outline.lineTo(-.5,.28);outline.closePath();
    const slabGeometry=new THREE.ExtrudeGeometry(outline,{depth:.18,bevelEnabled:false}).rotateX(-Math.PI/2);
    this.rubble=new THREE.InstancedMesh(slabGeometry,new THREE.MeshStandardMaterial({map:floor.material.map,color:0x989586,roughness:1,flatShading:true}),64);
    this.rubble.count=0;this.rubble.castShadow=true;this.rubble.receiveShadow=true;this.rubble.frustumCulled=false;
    this.rubble.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(this.rubble);this.dummy=new THREE.Object3D();
    floor.material.vertexColors=true;floor.material.needsUpdate=true;
    floor.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(this.vertices.count*3).fill(1),3));
    floor.geometry.attributes.color.setUsage(THREE.DynamicDrawUsage);
    for(const mesh of decorations)mesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.refresh();
  }
  heightAt(x,z) {
    const gx=THREE.MathUtils.clamp((x+this.size/2)/this.cell,0,this.steps-.000001),gz=THREE.MathUtils.clamp((z+this.size/2)/this.cell,0,this.steps-.000001);
    const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz,i=iz*(this.steps+1)+ix;
    const a=this.heights[i],b=this.heights[i+1],c=this.heights[i+this.steps+1],d=this.heights[i+this.steps+2];
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  normalAt(x,z) {
    const e=this.cell*.5;
    return new THREE.Vector3(this.heightAt(x-e,z)-this.heightAt(x+e,z),e*2,this.heightAt(x,z-e)-this.heightAt(x,z+e)).normalize();
  }
  // Swept sphere-bottom contact, including a horizontal shot crossing a crater lip.
  intersectSegment(from,to,radius=0) {
    const length=from.distanceTo(to),steps=Math.max(1,Math.ceil(length/(this.cell*.45))),p=new THREE.Vector3();let previous=0;
    const gap=t=>{p.copy(from).lerp(to,t);return p.y-radius-.015-this.heightAt(p.x,p.z);};
    if(gap(0)<=0)return {distance:0,point:from.clone().setY(this.heightAt(from.x,from.z)),normal:this.normalAt(from.x,from.z)};
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      if(gap(t)<=0){let lo=previous,hi=t;for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(gap(mid)>0)lo=mid;else hi=mid;}
        p.copy(from).lerp(to,hi);p.y=this.heightAt(p.x,p.z);return {distance:length*hi,point:p.clone(),normal:this.normalAt(p.x,p.z)};}
      previous=t;
    }
    return null;
  }
  impact(point,damage,radius,scorched=false) {
    radius=THREE.MathUtils.clamp(radius,.65,2.25);
    const depth=THREE.MathUtils.clamp(.38+Math.sqrt(damage)*.07,.48,.86),phase=++this.serial*1.71;
    for(let i=0;i<this.vertices.count;i++){
      const x=this.vertices.getX(i),z=this.vertices.getZ(i),dx=x-point.x,dz=z-point.z;
      const distance=Math.hypot(dx,dz);if(distance>radius*1.61)continue;const angle=Math.atan2(dz,dx),jagged=1+.065*Math.sin(angle*7+phase)+.04*Math.sin(angle*13-phase),q=distance/(radius*jagged);
      if(q>1.45||Math.max(Math.abs(x),Math.abs(z))>this.size/2-.6)continue;
      const base=this.baseHeights[i];let y=this.heights[i]-base;
      if(q<1){const wall=THREE.MathUtils.clamp((q-.48)/.52,0,1);y=Math.min(y,-depth*(1-wall*wall*(3-2*wall)));}
      // Narrow depressed radial seams split the surrounding concrete into slabs.
      const seam=Math.pow(Math.max(0,Math.cos(angle*9+phase)),12)*Math.max(0,1-Math.abs(q-1)/.45);
      if(q>.72)y=Math.min(y,-.15*seam);
      if(q>1&&q<1.17&&seam<.1&&y>=0)y=Math.max(y,.075*Math.sin((q-1)/.17*Math.PI));
      this.heights[i]=base+Math.max(-.95,y);this.vertices.setY(i,this.heights[i]);this.dirtyVertices.add(i);
      if(scorched&&q<1.2)this.burnt[i]=1;
      this.remaining[i]=GROUND_WRECK_LIFETIME;this.damageHeights[i]=this.heights[i]-base;this.damageBurnt[i]=this.burnt[i];
    }
    this.damaged=true;this.refresh();
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9+phase*.12,r=radius*(.94+(i%3)*.065),x=point.x+Math.cos(angle)*r,z=point.z+Math.sin(angle)*r;
      if(Math.max(Math.abs(x),Math.abs(z))>this.size/2-.6)continue;
      const slab={life:GROUND_WRECK_LIFETIME,x,z,yaw:angle+Math.sin(i*7+phase)*.65,tilt:.14+(i%3)*.07,scale:(.3+radius*.13)*(.7+.5*Math.abs(Math.sin(i*11+phase)))};
      if(this.slabs.length<64)this.slabs.push(slab);else this.slabs[(this.serial*9+i)%64]=slab;
    }
    this.syncSlabs();return {depth,radius};
  }
  refresh(retint=false) {
    const first=!this.baseColors,dirty=this.dirtyVertices;if(!first&&!retint&&!dirty.size)return;
    if(first||dirty.size)this.physicsRevision=(this.physicsRevision??0)+1;
    if(first||retint){this.baseColors=new Float32Array(this.vertices.count*3);for(let i=0;i<this.vertices.count;i++){
      const x=this.vertices.getX(i),z=this.vertices.getZ(i);if(this.floor.userData.colorAt)this.floor.userData.colorAt(x,z,this.color);else this.color.copy(Math.abs(x)<6&&Math.abs(z)<6?this.courtTint:this.floorTint);
      this.baseColors.set([this.color.r,this.color.g,this.color.b],i*3);
    }}
    const recolor=i=>{
      const y=this.heights[i]-this.baseHeights[i];
      // Dark exposed aggregate at depth, with a bright fractured concrete lip.
      const shade=y<-.035?.34+Math.max(0,1+y)*.22:1;
      const value=shade*(1-this.burnt[i]*.2),k=i*3;this.floor.geometry.attributes.color.setXYZ(i,this.baseColors[k]*value,this.baseColors[k+1]*value,this.baseColors[k+2]*value);
    };
    if(first||retint)for(let i=0;i<this.vertices.count;i++)recolor(i);else for(const i of dirty)recolor(i);
    if(dirty.size){this.vertices.needsUpdate=true;this.refreshNormals();}this.floor.geometry.attributes.color.needsUpdate=true;
    if(first){this.floor.geometry.computeBoundingBox();this.floor.geometry.boundingBox.min.y-=1.05;this.floor.geometry.boundingBox.max.y+=.12;this.floor.geometry.boundingBox.getBoundingSphere(this.floor.geometry.boundingSphere??=new THREE.Sphere());}
    let minX=-Infinity,maxX=Infinity,minZ=-Infinity,maxZ=Infinity;
    if(!first){minX=minZ=Infinity;maxX=maxZ=-Infinity;for(const i of dirty){const x=this.vertices.getX(i),z=this.vertices.getZ(i);minX=Math.min(minX,x-this.cell);maxX=Math.max(maxX,x+this.cell);minZ=Math.min(minZ,z-this.cell);maxZ=Math.max(maxZ,z+this.cell);}}
    const p=this.refreshPoint??=new THREE.Vector3(),inverse=this.refreshInverse??=new THREE.Matrix4();
    for(const mesh of this.decorations){
      const attr=mesh.geometry.attributes.position,base=this.originals.get(mesh);
      inverse.copy(mesh.matrixWorld).invert();
      let changed=false;
      for(let i=0;i<attr.count;i++){
        p.set(base[i*3],base[i*3+1],base[i*3+2]).applyMatrix4(mesh.matrixWorld);
        if(p.x<minX||p.x>maxX||p.z<minZ||p.z>maxZ)continue;changed=true;
        const height=this.heightAt(p.x,p.z);p.y+=height;
        p.applyMatrix4(inverse);attr.setXYZ(i,p.x,p.y,p.z);
      }
      if(changed){attr.needsUpdate=true;mesh.geometry.computeVertexNormals();if(first){mesh.geometry.computeBoundingBox();mesh.geometry.boundingBox.min.y-=1.05;mesh.geometry.boundingBox.max.y+=1.4;mesh.geometry.boundingBox.getBoundingSphere(mesh.geometry.boundingSphere??=new THREE.Sphere());}}
    }
    dirty.clear();
    this.syncSlabs();
  }
  refreshNormals(){
    // Recompute exactly the same adjacent triangle normals as Three.js, only
    // around changed vertices. Do not rebuild the entire district for one hole.
    const width=this.steps+1,indices=this.floor.geometry.index.array,p=this.vertices.array,n=this.floor.geometry.attributes.normal,near=this.normalVertices;near.clear();
    for(const i of this.dirtyVertices){const x=i%width,z=Math.floor(i/width);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<width&&z+dz>=0&&z+dz<width)near.add((z+dz)*width+x+dx);}
    for(const i of near){let nx=0,ny=0,nz=0;const x=i%width,z=Math.floor(i/width);
      for(let cz=Math.max(0,z-1);cz<=Math.min(this.steps-1,z);cz++)for(let cx=Math.max(0,x-1);cx<=Math.min(this.steps-1,x);cx++)for(let t=0;t<6;t+=3){const k=(cz*this.steps+cx)*6+t,a=indices[k],b=indices[k+1],c=indices[k+2];if(a!==i&&b!==i&&c!==i)continue;const ax=p[a*3]-p[b*3],ay=p[a*3+1]-p[b*3+1],az=p[a*3+2]-p[b*3+2],cxp=p[c*3]-p[b*3],cy=p[c*3+1]-p[b*3+1],czp=p[c*3+2]-p[b*3+2];nx+=cy*az-czp*ay;ny+=czp*ax-cxp*az;nz+=cxp*ay-cy*ax;}
      const length=Math.hypot(nx,ny,nz)||1;n.setXYZ(i,nx/length,ny/length,nz/length);
    }n.needsUpdate=true;
  }
  syncSlabs() {
    this.slabs.forEach((s,i)=>{this.dummy.position.set(s.x,this.heightAt(s.x,s.z)+.04,s.z);this.dummy.rotation.set(s.tilt,s.yaw,-s.tilt*.6);const fade=recovery(s.life);this.dummy.scale.set(s.scale*fade,fade,s.scale*.85*fade);this.dummy.updateMatrix();this.rubble.setMatrixAt(i,this.dummy.matrix);});
    this.rubble.count=this.slabs.length;this.rubble.instanceMatrix.needsUpdate=true;
  }
  update(dt) {
    if(!this.damaged||!(dt>0))return;
    // Rebuild normals/decorations only while restoring, at most 20 times/sec.
    this.updateTime+=dt;if(this.updateTime<.05)return;
    const elapsed=this.updateTime;this.updateTime=0;let changed=false,active=false;
    for(let i=0;i<this.remaining.length;i++){
      if(this.remaining[i]<=0)continue;
      const life=this.remaining[i]=Math.max(0,this.remaining[i]-elapsed),fade=recovery(life);
      active ||= life>0;
      const height=Math.fround(this.baseHeights[i]+this.damageHeights[i]*fade),burnt=Math.fround(this.damageBurnt[i]*fade);
      if(height!==this.heights[i]||burnt!==this.burnt[i]){this.heights[i]=height;this.burnt[i]=burnt;this.vertices.setY(i,height);this.dirtyVertices.add(i);changed=true;}
    }
    for(let i=this.slabs.length-1;i>=0;i--){const slab=this.slabs[i];slab.life=Math.max(0,slab.life-elapsed);if(slab.life<1e-6)this.slabs.splice(i,1);}
    this.damaged=active||this.slabs.length>0;
    if(changed)this.refresh();else this.syncSlabs();
  }
  reset() {
    this.remaining.fill(0);this.damageHeights.fill(0);this.damageBurnt.fill(0);this.updateTime=0;this.damaged=false;
    for(let i=0;i<this.vertices.count;i++)if(this.heights[i]!==this.baseHeights[i]||this.burnt[i])this.dirtyVertices.add(i);
    this.heights.set(this.baseHeights);this.burnt.fill(0);for(let i=0;i<this.vertices.count;i++)this.vertices.setY(i,this.baseHeights[i]);
    this.slabs.length=0;this.serial=0;this.refresh();this.syncSlabs();
  }
}
