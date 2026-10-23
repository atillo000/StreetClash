import * as THREE from 'three';

// One fixed heightfield is shared by rendering, feet and projectile contacts.
// Damage changes vertices in place: repeated impacts never allocate new floors.
export class DeformableGround {
  constructor(group, floor, decorations) {
    this.group=group;this.floor=floor;this.decorations=decorations;
    this.floorTint=floor.material.color.clone();this.courtTint=floor.userData.courtColor.clone();floor.material.color.set(0xffffff);
    this.size=18.1;this.steps=144;this.cell=this.size/this.steps;
    this.vertices=floor.geometry.attributes.position;this.vertices.setUsage(THREE.DynamicDrawUsage);
    this.heights=new Float32Array(this.vertices.count);this.burnt=new Uint8Array(this.vertices.count);
    this.originals=new Map(decorations.map(mesh=>[mesh,new Float32Array(mesh.geometry.attributes.position.array)]));
    this.color=new THREE.Color();this.slabs=[];this.serial=0;
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
      const distance=Math.hypot(dx,dz),angle=Math.atan2(dz,dx),jagged=1+.065*Math.sin(angle*7+phase)+.04*Math.sin(angle*13-phase),q=distance/(radius*jagged);
      if(q>1.45||Math.max(Math.abs(x),Math.abs(z))>8.5)continue;
      let y=this.heights[i];
      if(q<1){const wall=THREE.MathUtils.clamp((q-.48)/.52,0,1);y=Math.min(y,-depth*(1-wall*wall*(3-2*wall)));}
      // Narrow depressed radial seams split the surrounding concrete into slabs.
      const seam=Math.pow(Math.max(0,Math.cos(angle*9+phase)),12)*Math.max(0,1-Math.abs(q-1)/.45);
      if(q>.72)y=Math.min(y,-.15*seam);
      if(q>1&&q<1.17&&seam<.1&&y>=0)y=Math.max(y,.075*Math.sin((q-1)/.17*Math.PI));
      this.heights[i]=Math.max(-.95,y);this.vertices.setY(i,this.heights[i]);
      if(scorched&&q<1.2)this.burnt[i]=1;
    }
    this.refresh();
    for(let i=0;i<9;i++){
      const angle=i*Math.PI*2/9+phase*.12,r=radius*(.94+(i%3)*.065),x=point.x+Math.cos(angle)*r,z=point.z+Math.sin(angle)*r;
      if(Math.max(Math.abs(x),Math.abs(z))>8.5)continue;
      const slab={x,z,yaw:angle+Math.sin(i*7+phase)*.65,tilt:.14+(i%3)*.07,scale:(.3+radius*.13)*(.7+.5*Math.abs(Math.sin(i*11+phase)))};
      if(this.slabs.length<64)this.slabs.push(slab);else this.slabs[(this.serial*9+i)%64]=slab;
    }
    this.syncSlabs();return {depth,radius};
  }
  refresh() {
    for(let i=0;i<this.vertices.count;i++){
      const x=this.vertices.getX(i),z=this.vertices.getZ(i),y=this.heights[i];
      this.color.copy(Math.abs(x)<6&&Math.abs(z)<6?this.courtTint:this.floorTint);
      // Dark exposed aggregate at depth, with a bright fractured concrete lip.
      const shade=y<-.035?.34+Math.max(0,1+y)*.22:1;
      this.color.multiplyScalar(shade*(this.burnt[i]?.8:1));this.floor.geometry.attributes.color.setXYZ(i,this.color.r,this.color.g,this.color.b);
    }
    this.vertices.needsUpdate=true;this.floor.geometry.attributes.color.needsUpdate=true;
    this.floor.geometry.computeVertexNormals();this.floor.geometry.computeBoundingSphere();this.floor.geometry.computeBoundingBox();
    for(const mesh of this.decorations){
      const attr=mesh.geometry.attributes.position,base=this.originals.get(mesh);
      for(let i=0;i<attr.count;i++){
        const p=new THREE.Vector3(base[i*3],base[i*3+1],base[i*3+2]).applyMatrix4(mesh.matrixWorld);
        const height=this.heightAt(p.x,p.z);p.y+=height;
        mesh.worldToLocal(p);attr.setXYZ(i,p.x,p.y,p.z);
      }
      attr.needsUpdate=true;if(mesh.geometry.attributes.color)mesh.geometry.attributes.color.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();mesh.geometry.computeBoundingBox();
    }
    this.syncSlabs();
  }
  syncSlabs() {
    this.slabs.forEach((s,i)=>{this.dummy.position.set(s.x,this.heightAt(s.x,s.z)+.04,s.z);this.dummy.rotation.set(s.tilt,s.yaw,-s.tilt*.6);this.dummy.scale.set(s.scale,1,s.scale*.85);this.dummy.updateMatrix();this.rubble.setMatrixAt(i,this.dummy.matrix);});
    this.rubble.count=this.slabs.length;this.rubble.instanceMatrix.needsUpdate=true;
  }
  reset() {
    this.heights.fill(0);this.burnt.fill(0);for(let i=0;i<this.vertices.count;i++)this.vertices.setY(i,0);
    this.floor.geometry.attributes.color.array.fill(1);this.slabs.length=0;this.serial=0;this.refresh();
  }
}
