import * as THREE from 'three';
import { StormVFX } from './TexturedVFX.js';
import { DragonApparition, GuardianWards, FamiliarOrbit } from './ElementalEffects.js';

function ribbon(){const positions=[],indices=[];for(let i=0;i<=64;i++){const t=i/64,a=t*Math.PI*5,r=.28+t*.72;for(const width of [-.075,.075])positions.push(Math.cos(a)*(r+width),t*2.4,Math.sin(a)*(r+width));if(i<64){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;}
function wing(){const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.25,.28,.45,.65,.7,.75);shape.lineTo(1.5,.35);shape.quadraticCurveTo(1.02,.38,.95,.05);shape.quadraticCurveTo(.64,.35,.55,-.12);shape.quadraticCurveTo(.3,.11,.15,-.2);shape.closePath();return new THREE.ShapeGeometry(shape);}

// Eight reusable visual slots with authored smoke/vortex surfaces,
// no per-cast geometry or textures, no physics bodies for cosmetic geometry.
export class PowerVFX{
 constructor(scene){
  this.limit=6;this.entries=[];this.direction=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);
  this.geometry={ribbon:ribbon(),orb:new THREE.SphereGeometry(.16,8,6),cone:new THREE.ConeGeometry(.2,.65,8).rotateX(Math.PI/2),ring:new THREE.RingGeometry(.94,1,48).rotateX(-Math.PI/2),wing:wing(),blade:new THREE.ConeGeometry(.1,.95,4),body:new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,-1.5),new THREE.Vector3(.14,.05,-.8),new THREE.Vector3(-.1,.12,0),new THREE.Vector3(0,.1,.8)]),20,.18,7,false)};
  for(let i=0;i<8;i++){
   const material=new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color()},uOpacity:{value:.5},uTime:{value:0}},
    vertexShader:'varying vec3 vNormalWorld;varying vec3 vView;varying vec3 vLocal;void main(){vec4 world=modelMatrix*vec4(position,1.0);vNormalWorld=normalize(mat3(modelMatrix)*normal);vView=cameraPosition-world.xyz;vLocal=position;gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader:'uniform vec3 uColor;uniform float uOpacity;uniform float uTime;varying vec3 vNormalWorld;varying vec3 vView;varying vec3 vLocal;void main(){float rim=pow(1.0-abs(dot(normalize(vNormalWorld),normalize(vView))),1.6);float flow=.5+.5*sin(vLocal.y*25.0-vLocal.z*5.0-uTime*9.0);float alpha=uOpacity*(.15+.7*rim+.15*flow);gl_FragColor=vec4(uColor*(.8+rim*.8),alpha);\n#include <colorspace_fragment>\n}',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
   });material.color=material.uniforms.uColor.value;
   const group=new THREE.Group();group.visible=false;scene.add(group);const parts={};
   const mesh=(name,geometry,parent=group)=>{const m=new THREE.Mesh(geometry,material);parent.add(m);parts[name]=m;return m;};
   const tornado=new THREE.Group();group.add(tornado);for(let j=0;j<3;j++){const m=mesh('spiral'+j,this.geometry.ribbon,tornado);m.rotation.y=j*Math.PI*2/3;m.scale.setScalar(1-j*.14);}
   const dragon=new THREE.Group();group.add(dragon);mesh('body',this.geometry.body,dragon);const head=mesh('head',this.geometry.orb,dragon);head.position.set(0,.15,.88);head.scale.set(1.6,1.3,2.3);const jaw=mesh('jaw',this.geometry.cone,dragon);jaw.position.set(0,.05,1.16);jaw.scale.set(.7,.7,.7);
   for(const side of [-1,1]){const w=mesh('wing'+side,this.geometry.wing,dragon);w.rotation.y=0;w.rotation.z=side*.2;w.scale.set(side*.8,.8,.8);w.position.set(side*.13,.15,.15);const horn=mesh('horn'+side,this.geometry.cone,dragon);horn.position.set(side*.18,.38,.7);horn.rotation.x=-.7;horn.scale.set(.4,.7,.4);}
   const wards=new THREE.Group();group.add(wards);for(let j=0;j<2;j++){mesh('spirit'+j,this.geometry.orb,wards);mesh('sword'+j,this.geometry.blade,wards);}const ring=mesh('ring',this.geometry.ring,wards);for(let j=0;j<2;j++){const tail=mesh('tail'+j,this.geometry.cone,wards);tail.rotation.x=Math.PI/2;tail.scale.set(.4,.4,1.3);}
   const wave=new THREE.Group();group.add(wave);for(let j=0;j<3;j++){const arc=mesh('wave'+j,this.geometry.ring,wave);arc.rotation.x=Math.PI/2;arc.scale.set(1-j*.18,.7-j*.08,1);arc.position.z=-j*.22;}
   const lightningGeometry=new THREE.BufferGeometry();lightningGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(32*2*3),3));lightningGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
   const boltMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});const lightning=new THREE.LineSegments(lightningGeometry,boltMaterial);lightning.frustumCulled=false;group.add(lightning);
   this.entries.push({familiars:new FamiliarOrbit(group),guardians:new GuardianWards(group),apparition:new DragonApparition(group),storm:new StormVFX(group),group,material,boltMaterial,tornado,dragon,wards,wave,lightning,parts,position:new THREE.Vector3(),direction:new THREE.Vector3(0,0,1),end:new THREE.Vector3(),life:0,held:false,time:0});
  }
 }
 setBudget(count){this.limit=count<64?4:count<128?6:8;for(const s of this.entries)s.storm.setBudget(count);}
 render(camera){for(const s of this.entries)if(s.life>0){s.storm.render(camera);s.apparition.render(camera);s.familiars.render(camera);} }
 spawn(kind,position,direction,color,radius=1){
  const s=this.entries.slice(0,this.limit).find(s=>s.life<=0);if(!s)return null;
  Object.assign(s,{kind,life:1,held:true,time:0,radius});s.position.copy(position);s.direction.copy(direction);s.end.copy(position).addScaledVector(direction,5);s.material.color.set(color);s.boltMaterial.color.set(color);s.group.visible=true;return s;
 }
 finish(s){if(s){s.held=false;s.life=.22;}}
 clear(){for(const s of this.entries){s.held=false;s.life=0;s.group.visible=false;}}
 update(dt){
  for(const s of this.entries){if(s.life<=0)continue;s.time+=dt;if(!s.held)s.life=Math.max(0,s.life-dt);s.group.visible=s.life>0;if(!s.group.visible)continue;
   const fade=s.held?Math.min(1,s.time/.1):s.life/.22;s.material.blending=s.kind==='dragon'?THREE.NormalBlending:THREE.AdditiveBlending;s.material.opacity=(s.kind==='dragon'?.65:.42)*fade;s.material.uniforms.uOpacity.value=s.material.opacity;s.material.uniforms.uTime.value=s.time;s.boltMaterial.opacity=fade;
   s.group.position.copy(s.position);s.group.rotation.set(0,Math.atan2(s.direction.x,s.direction.z),0);s.group.scale.setScalar(1);
   s.tornado.visible=s.kind==='tornado';s.dragon.visible=s.kind==='dragon';s.wards.visible=['spirits','guardians'].includes(s.kind);s.wave.visible=['fissure','windArrow'].includes(s.kind);s.lightning.visible=false;
   s.dragon.visible=false;s.apparition.update(s,fade);s.guardians.update(s);s.familiars.update(s,fade);
   s.tornado.visible=false;if(s.kind==='lightning')s.group.rotation.set(0,0,0);s.storm.update(s,fade);if(s.kind==='lightning'||s.kind==='tornado')continue;
   if(s.tornado.visible){s.tornado.rotation.y=s.time*12;s.tornado.scale.set(s.radius,1,s.radius);}
   if(s.dragon.visible){s.dragon.position.y=Math.sin(s.time*14)*.07;for(const side of [-1,1])s.parts['wing'+side].rotation.z=side*(.3+Math.sin(s.time*15)*.45);}
   if(s.wards.visible){s.parts.ring.scale.setScalar(s.radius);s.parts.ring.position.y=.045;s.wards.rotation.y=s.time*.6;for(let j=0;j<2;j++){const angle=j*Math.PI+s.time*1.5,x=Math.cos(angle)*s.radius*.48,z=Math.sin(angle)*s.radius*.48;const orb=s.parts['spirit'+j],sword=s.parts['sword'+j];orb.visible=false;sword.visible=false;const tail=s.parts['tail'+j];tail.visible=false;tail.position.set(x,.65+Math.sin(s.time*3+j)*.12,z);orb.position.set(x,1+Math.sin(s.time*3+j)*.12,z);sword.position.set(x,1.15,z);sword.rotation.z=Math.sin(s.time*3)*.1;}}
   if(s.wave.visible){s.wave.rotation.z=s.time*4;s.wave.scale.setScalar(s.kind==='windArrow'?.28:1);s.wave.position.y=s.kind==='fissure'?.5:0;}
   if(s.lightning.visible){s.group.rotation.set(0,0,0);const a=s.lightning.geometry.attributes.position;this.direction.subVectors(s.end,s.position);for(let j=0;j<32;j++)for(let k=0;k<2;k++){const t=(j+k)/32,offset=t===0||t===1?0:Math.sin((j+k)*23.7+Math.floor(s.time*24)*8)*.16;a.setXYZ(j*2+k,this.direction.x*t+offset,this.direction.y*t+offset*.7,this.direction.z*t-offset);}a.needsUpdate=true;}
  }
 }
}
