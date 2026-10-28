import * as THREE from 'three';
import { vfxTextures } from './TexturedVFX.js';

// Contact art, not hitboxes. Three shared textured batches, fixed storage and
// animation-driven charge anchors keep the cost independent of match length.
export class ImpactPresentation {
  constructor(scene) {
    this.limit=96; this.serial=0; this.anchors=[];
    this.entries=Array.from({length:160},()=>({life:0,max:1,p:new THREE.Vector3(),v:new THREE.Vector3(),color:new THREE.Color(),size:1,aspect:1,angle:0,grow:0,opacity:1,drag:5,gravity:0,kind:'flash'}));
    this.dummy=new THREE.Object3D();this.spin=new THREE.Quaternion();this.axis=new THREE.Vector3(0,0,1);this.point=new THREE.Vector3();this.direction=new THREE.Vector3();
    this.batches=['flash','streak','dust'].map(kind=>{
      const geometry=new THREE.PlaneGeometry(1,1),alpha=new THREE.InstancedBufferAttribute(new Float32Array(160),1);
      geometry.setAttribute('effectOpacity',alpha);
      const material=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:kind==='dust',blending:kind==='dust'?THREE.NormalBlending:THREE.AdditiveBlending});
      material.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float effectOpacity;varying float vEffectOpacity;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEffectOpacity=effectOpacity;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vEffectOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vEffectOpacity;');
      };
      material.customProgramCacheKey=()=> 'contact-art-v1';
      const mesh=new THREE.InstancedMesh(geometry,material,160);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      return {kind,mesh,alpha,count:0};
    });
  }
  setBudget(count){this.limit=count<64?48:count<128?96:160;for(let i=this.limit;i<this.entries.length;i++)this.entries[i].life=0;}
  get activeCount(){let n=0;for(const e of this.entries)if(e.life>0)n++;return n;}
  emit(kind,point,color,size,life,options={}) {
    let e=null;for(let i=0;i<this.limit;i++)if(this.entries[i].life<=0){e=this.entries[i];break;}if(!e&&kind!=='dust'){for(let i=0;i<this.limit;i++){const slot=this.entries[i];if(slot.kind==='dust'&&(!e||slot.life<e.life))e=slot;}}if(!e)return null;
    e.kind=kind;e.p.copy(point);e.v.set(0,0,0);e.color.set(color);e.size=size;e.life=e.max=life;
    e.aspect=1;e.angle=(this.serial++*2.39996)%(Math.PI*2);e.grow=0;e.opacity=1;e.drag=5;e.gravity=0;
    Object.assign(e,options);return e;
  }
  contact(attacker,target,result,move,point) {
    if(result==='miss')return;
    const blocked=result==='blocked'||target.lastHitInfo?.absorbed>0&&target.lastDamage===0;
    const heavy=move.power==='heavy',critical=!!target.lastHitInfo?.critical;
    const strength=THREE.MathUtils.clamp(Math.sqrt(Math.max(1,target.lastDamage||move.damage||1)/12),.6,1.6);
    const color=blocked?0xb9eaff:critical?0xffd06d:0xffedcf;
    this.direction.subVectors(target.position,attacker.position).setY(.2).normalize();
    this.point.copy(point).addScaledVector(this.direction,-.08);
    // Very short white contact core, followed by longer outward streaks and dust.
    this.emit('flash',this.point,0xfff5e4,(blocked?.36:heavy?.75:.48)*strength,.085,{grow:.35});
    this.emit('streak',this.point,color,(heavy?.95:.6)*strength,.18,{aspect:.65,grow:.4});
    const count=this.limit<64?3:heavy||critical?7:4;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+this.serial*.17,e=this.emit('streak',this.point,color,.18*strength,.18+i*.012,{aspect:.25,grow:-.45,angle:a});
      if(e)e.v.set(Math.cos(a)*1.7,Math.sin(a)*1.5+.5,0).addScaledVector(this.direction,1.4);
    }
    if(!blocked){const puff=this.emit('dust',this.point,0xc7bcaa,heavy?.42:.25,.35,{grow:1.8,opacity:.24});if(puff)puff.v.copy(this.direction).multiplyScalar(.8);}
  }
  sparks(point,color,count=6,speed=3) {
    for(let i=0;i<Math.min(count,this.limit<64?4:8);i++){
      const a=this.serial*2.39996,e=this.emit('streak',point,color,.12,.2+(i%3)*.04,{aspect:.3,grow:-.6,angle:a,gravity:3});
      if(e)e.v.set(Math.cos(a)*speed*.5,.6+(i%3)*.4,Math.sin(a)*speed*.5);
    }
  }
  dust(point,radius=1,strength=1) {
    const count=this.limit<64?5:9;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2,e=this.emit('dust',point,0xb6aa94,.35+radius*.2,.55+(i%3)*.12,{grow:2.1,opacity:.3,drag:2});
      if(e){e.p.x+=Math.cos(a)*radius*.18;e.p.z+=Math.sin(a)*radius*.18;e.p.y+=.12;e.v.set(Math.cos(a)*radius*strength,.4+strength*.2,Math.sin(a)*radius*strength);}
    }
  }
  anticipate(fighter,move) {
    if((!move.skill&&!move.sequenceOnly&&move.power!=='heavy')||move.kind==='mobility')return;
    const release=move.events?.[0]??move.windows?.[0]?.[0];if(!(release>0))return;
    this.anchors=this.anchors.filter(a=>a.fighter!==fighter);
    if(this.anchors.length>=12)return;
    const bone=fighter.strikers?.[0]?.obj||fighter.equipment?.muzzle||fighter.character.bone('mixamorigRightHand');
    if(bone)this.anchors.push({fighter,move,bone,release,tick:0});
  }
  release(fighter,move) {
    this.anchors=this.anchors.filter(a=>a.fighter!==fighter);
    if(!move.skill&&!move.sequenceOnly)return;
    const source=fighter.strikers?.[0]?.obj||fighter.equipment?.muzzle||fighter.character.bone('mixamorigRightHand');
    if(source){source.getWorldPosition(this.point);this.emit('flash',this.point,move.artColor||move.color||0xffe7b2,.42,.1,{grow:.4});}
  }
  update(dt) {
    for(let i=this.anchors.length-1;i>=0;i--){
      const a=this.anchors[i],c=a.fighter,p=c.character.actionProgress();
      if(!c.alive||c.inactive||c.state!=='attack'||c.move!==a.move||p>=a.release){this.anchors.splice(i,1);continue;}
      a.tick-=dt;if(a.tick>0)continue;a.tick=.045;
      a.bone.getWorldPosition(this.point);const charge=Math.min(1,p/a.release);
      this.emit('flash',this.point,a.move.artColor||a.move.color||0xffe3b8,.12+charge*.23,.07,{opacity:.25+charge*.35});
    }
    for(const e of this.entries){if(e.life<=0)continue;e.life=Math.max(0,e.life-dt);e.v.y-=e.gravity*dt;e.p.addScaledVector(e.v,dt);e.v.multiplyScalar(Math.exp(-e.drag*dt));}
  }
  render(camera) {
    for(const b of this.batches){b.count=0;const map=vfxTextures[b.kind==='dust'?'smoke_04':b.kind==='streak'?'slash_02':'flare_01'];if(b.mesh.material.map!==map){b.mesh.material.map=map;b.mesh.material.needsUpdate=true;}}
    for(let i=0;i<this.limit;i++){
      const e=this.entries[i];if(e.life<=0)continue;const b=this.batches[e.kind==='flash'?0:e.kind==='streak'?1:2],t=1-e.life/e.max;
      this.dummy.position.copy(e.p);this.spin.setFromAxisAngle(this.axis,e.angle);this.dummy.quaternion.copy(camera.quaternion).multiply(this.spin);
      const size=e.size*(1+e.grow*t);this.dummy.scale.set(size,size*e.aspect,1);this.dummy.updateMatrix();
      b.mesh.setMatrixAt(b.count,this.dummy.matrix);b.mesh.setColorAt(b.count,e.color);
      b.alpha.setX(b.count++,e.opacity*Math.pow(1-t,e.kind==='dust'?1.2:.7));
    }
    for(const b of this.batches){b.mesh.count=b.count;b.mesh.instanceMatrix.needsUpdate=true;b.alpha.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}
  }
  clear(){this.anchors.length=0;for(const e of this.entries)e.life=0;for(const b of this.batches)b.mesh.count=0;}
}
