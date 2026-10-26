import * as THREE from 'three';
import { GROUND_WRECK_LIFETIME, GROUND_RESTORE_DURATION } from '../core/DeformableGround.js';

function markTexture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const g=canvas.getContext('2d');
  const glow=g.createRadialGradient(256,256,12,256,256,245);
  glow.addColorStop(0,kind==='scorch'?'rgba(28,24,25,.68)':'rgba(30,29,26,.32)');glow.addColorStop(.55,'rgba(35,31,27,.14)');glow.addColorStop(1,'rgba(35,31,27,0)');g.fillStyle=glow;g.fillRect(0,0,512,512);
  let seed=kind==='chip'?29:91;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='frost'){g.clearRect(0,0,512,512);const ice=g.createRadialGradient(256,256,10,256,256,245);ice.addColorStop(0,'rgba(186,232,244,.4)');ice.addColorStop(1,'rgba(186,232,244,0)');g.fillStyle=ice;g.fillRect(0,0,512,512);}
  if(kind!=='scorch')for(let i=0;i<(kind==='chip'?5:9);i++){
    const angle=i*Math.PI*2/(kind==='chip'?5:11)+random()*.25;let x=256,y=256;
    g.beginPath();g.moveTo(x,y);
    for(let j=0;j<5;j++){const r=(j+1)*(30+random()*13),a=angle+(random()-.5)*.25;x=256+Math.cos(a)*r;y=256+Math.sin(a)*r;g.lineTo(x,y);
      if(j===2){g.moveTo(x,y);g.lineTo(x+Math.cos(a+.55)*45,y+Math.sin(a+.55)*45);g.moveTo(x,y);}}
    g.strokeStyle=kind==='frost'?'rgba(196,239,255,.7)':'rgba(20,21,19,.78)';g.lineWidth=kind==='chip'?3:2+random()*3;g.lineJoin='round';g.stroke();
    g.strokeStyle='rgba(179,171,149,.35)';g.lineWidth=1;g.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export class WreckEffects{
  constructor(scene){
    this.budget=72;this.markLimit=12;this.debris=[];this.free=[];this.dummy=new THREE.Object3D();this.bodyRotation=new THREE.Quaternion();
    for(let i=0;i<128;i++)this.free.push({p:new THREE.Vector3(),v:new THREE.Vector3(),rotation:new THREE.Euler(),spin:new THREE.Vector3(),scale:new THREE.Vector3(),color:new THREE.Color(),life:0});
    this.mesh=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.7,0),new THREE.MeshStandardMaterial({roughness:.94,metalness:.06}),128);
    this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
    this.batches=['crack','scorch','chip','frost'].map(kind=>{
      const geometry=new THREE.PlaneGeometry(2,2),opacity=new THREE.InstancedBufferAttribute(new Float32Array(16),1);geometry.setAttribute('markOpacity',opacity);
      const material=new THREE.MeshBasicMaterial({map:markTexture(kind),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      material.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float markOpacity; varying float vMarkOpacity;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMarkOpacity=markOpacity;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vMarkOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vMarkOpacity;');
      };material.customProgramCacheKey=()=> 'streetclash-wreck-mark-v1';
      const mesh=new THREE.InstancedMesh(geometry,material,16);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=1;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      return{kind,mesh,opacity,slots:Array.from({length:16},()=>({life:0,p:new THREE.Vector3(),q:new THREE.Quaternion(),radius:1}))};
    });
  }
  setBudget(count){this.budget=this.physics?this.physics.setBudget(count):Math.min(128,Math.max(24,Math.floor(count*.75)));this.markLimit=count<64?6:count<128?12:16;}
  mark(point,normal,kind='crack',damage=20,radius){
    const batch=this.batches.find(b=>b.kind===kind)||this.batches[0],slots=batch.slots.slice(0,this.markLimit);
    const slot=slots.find(s=>s.life<=0)||slots.reduce((a,b)=>a.life<b.life?a:b);
    slot.ground=normal.y>.25&&Math.abs(point.y-(this.groundHeight?.(point.x,point.z)??0))<.08;
    slot.life=slot.max=slot.ground?GROUND_WRECK_LIFETIME:kind==='chip'?12:22;slot.p.copy(point).addScaledVector(normal,.022);
    slot.q.setFromUnitVectors(new THREE.Vector3(0,0,1),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.random()*Math.PI*2));
    slot.radius=radius??(kind==='chip'?.1+Math.sqrt(Math.max(1,damage))*.015:Math.min(2.4,.55+Math.sqrt(Math.max(1,damage))*.13));
    this.syncMarks();
  }
  fragments(point,material='stone',damage=20,broken=false){
    const count=Math.min(broken?22:8,Math.ceil(damage/(broken?2:5))+3);
    for(let i=0;i<count&&this.free.length&&this.debris.length<this.budget;i++){
      const d=this.free.pop(),angle=Math.random()*Math.PI*2,speed=(broken?2:1)+Math.sqrt(damage)*.35;
      d.p.copy(point);d.p.y=Math.max((this.groundHeight?.(d.p.x,d.p.z)??0)+.08,d.p.y);d.v.set(Math.cos(angle)*speed*(.4+Math.random()*.6),1.2+Math.random()*speed,Math.sin(angle)*speed*(.4+Math.random()*.6));
      d.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);d.spin.set(Math.random()*4,Math.random()*5,Math.random()*4);
      d.scale.set(material==='wood'?.18+Math.random()*.18:.055+Math.random()*.07,.025+Math.random()*.04,material==='metal'?.16:.045+Math.random()*.08);
      if(material==='rubble'){
        const width=.24+Math.random()*.38;
        d.scale.set(width,.14+Math.random()*.25,width*(.65+Math.random()*.6));
        d.v.multiplyScalar(1.15);d.v.y=3+Math.random()*3;
      }
      d.color.set(material==='wood'?0x967047:material==='metal'?0x626964:0x8e8b7e);d.life=d.max=material==='rubble'?GROUND_WRECK_LIFETIME:broken?3:1.6;
      if(this.physics&&!this.physics.spawnFragment(d)){this.free.push(d);break;}this.debris.push(d);
    }
  }
  clear(){for(const d of this.debris)this.physics?.removeFragment(d);this.free.push(...this.debris);this.debris.length=0;this.mesh.count=0;for(const b of this.batches){for(const s of b.slots)s.life=0;b.mesh.count=0;}}
  syncMarks(){
    for(const b of this.batches){let count=0;
      b.slots.forEach((s,i)=>{if(s.ground&&s.life>0)s.p.y=(this.groundHeight?.(s.p.x,s.p.z)??0)+.022;const visible=s.life>0&&i<this.markLimit;this.dummy.position.copy(s.p);this.dummy.quaternion.copy(s.q);this.dummy.scale.setScalar(visible?s.radius:0);this.dummy.updateMatrix();b.mesh.setMatrixAt(i,this.dummy.matrix);b.opacity.setX(i,visible?Math.min(1,s.life/(s.ground?GROUND_RESTORE_DURATION:4)):0);if(visible)count=i+1;});
      b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;b.opacity.needsUpdate=true;
    }
  }
  update(dt){
    for(const b of this.batches)for(const s of b.slots)s.life=Math.max(0,s.life-dt);this.syncMarks();
    for(let i=this.debris.length-1;i>=0;i--){const d=this.debris[i];d.life-=dt;
      if(d.life<=0||i>=this.budget){this.physics?.removeFragment(d);this.free.push(d);this.debris.splice(i,1);continue;}
      if(d.body){d.p.copy(d.body.translation());this.bodyRotation.copy(d.body.rotation());d.rotation.setFromQuaternion(this.bodyRotation);continue;}
      d.v.y-=10*dt;d.p.addScaledVector(d.v,dt);
      const floor=(this.groundHeight?.(d.p.x,d.p.z)??0)+Math.max(.035,d.scale.y*.5);
      if(d.p.y<floor){d.p.y=floor;d.v.y=Math.abs(d.v.y)*.18;d.v.x*=.6;d.v.z*=.6;d.spin.multiplyScalar(.5);}
      d.rotation.x+=d.spin.x*dt;d.rotation.y+=d.spin.y*dt;d.rotation.z+=d.spin.z*dt;
    }
    this.debris.forEach((d,i)=>{this.dummy.position.copy(d.p);this.dummy.rotation.copy(d.rotation);this.dummy.scale.copy(d.scale).multiplyScalar(Math.min(1,d.life/.4));this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.mesh.setColorAt(i,d.color);});
    this.mesh.count=this.debris.length;this.mesh.instanceMatrix.needsUpdate=true;if(this.mesh.instanceColor)this.mesh.instanceColor.needsUpdate=true;
  }
}
