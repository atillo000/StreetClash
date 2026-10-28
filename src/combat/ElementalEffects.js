import * as THREE from 'three';
import { DragonVFX as DragonApparition, loadDragonAsset } from './DragonVFX.js';
export { DragonApparition };
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COMBAT_ART } from './CombatArt.js';
import { vfxTextures } from './TexturedVFX.js';
export const elementalTextures={};
let guardianModel;
export async function loadElementalAssets(){
 const[atlas,sword]=await Promise.all([new THREE.TextureLoader().loadAsync('assets/textures/combat/elemental-atlas-v1.png'),new GLTFLoader().loadAsync('assets/Weapons/generated/great-sword.glb'),loadDragonAsset()]);atlas.colorSpace=THREE.SRGBColorSpace;guardianModel=sword.scene;
 for(const[name,x,y]of [['fire',0,.5],['dragon',.5,.5],['slash',0,0],['mist',.5,0]]){
  const texture=atlas.clone();texture.repeat.set(.5,.5);texture.offset.set(x,y);texture.needsUpdate=true;elementalTextures[name]=texture;
 }
 elementalTextures.atlas=atlas;
}
function arcGeometry(){
 const p=[],uv=[],idx=[];
 for(let i=0;i<=64;i++)for(let j=0;j<2;j++){const t=i/64,a=-2.45+t*4.9,r=j?1:.62;p.push(Math.sin(a)*r,Math.sin(t*Math.PI)*.1,Math.cos(a)*r);uv.push(t,j);if(i<64&&j===0){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function crystalGeometry(){
 const p=[],n=5,top=new THREE.Vector3(.07,1,0),bottom=new THREE.Vector3(0,0,0),ring=[];
 for(let i=0;i<n;i++){const a=i/n*Math.PI*2;ring.push(new THREE.Vector3(Math.cos(a)*.17,.2+(i%2)*.08,Math.sin(a)*.17));}
 for(let i=0;i<n;i++)for(const tri of [[ring[i],ring[(i+1)%n],top],[ring[(i+1)%n],ring[i],bottom]])for(const v of tri)p.push(v.x,v.y,v.z);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`varying vec2 vUv;uniform sampler2D uAtlas,uNoise;uniform vec3 uColor;uniform float uTime,uProgress,uFire,uWall;
void main(){
 vec2 uv=vUv;
 float distortion=texture2D(uNoise,fract(uv*vec2(2.,1.)+vec2(-uTime*.28,uTime*.12))).a;
 vec2 tile=uFire>.5?vec2(0.,.5):vec2(0.,0.);
 vec2 texuv=vec2(clamp(uv.x+(distortion-.5)*.06,0.01,.99),clamp(uv.y,0.01,.99));
 vec4 ink=texture2D(uAtlas,tile+texuv*.5);
 float fade=smoothstep(0.,.07,uProgress)*(1.-smoothstep(.45,1.,uProgress));
 float lead=smoothstep(uProgress-.65,uProgress-.13,uv.x)*(1.-smoothstep(uProgress+.20,uProgress+.5,uv.x));
 float alpha=ink.a*fade*(uWall>.5?.52:1.15)*mix(lead,1.,uWall);
 if(uWall>.5){
  vec2 flow=vec2(fract(uv.x*1.5-uTime*.25),clamp(uv.y+(distortion-.5)*.12,.01,.99));
  ink=texture2D(uAtlas,(uFire>.5?vec2(0.,.5):vec2(.5,0.))+flow*.5);
  float edge=smoothstep(0.,.16,uv.y)*(1.-smoothstep(.45+distortion*.35,1.,uv.y));
  alpha=ink.a*fade*edge*(uFire>.5?.95:.45);
 }
 if(alpha<.008)discard;
 vec3 color=uFire>.5?mix(ink.rgb,uColor,.16):mix(uColor,vec3(1.),ink.r*.65);
 gl_FragColor=vec4(color,min(alpha,.9));
 #include <colorspace_fragment>
}`;
function energyMaterial(){return new THREE.ShaderMaterial({uniforms:{uAtlas:{value:null},uNoise:{value:null},uColor:{value:new THREE.Color()},uTime:{value:0},uProgress:{value:0},uFire:{value:0},uWall:{value:0}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});}

// Bounded layered effects. Every release is cosmetic and uses the exact cast,
// active-window or confirmed-contact event supplied by the combat simulation.
export class ElementalEffects{
 constructor(scene){
  this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.entries=[];this.limit=6;this.dummy=new THREE.Object3D();this.temp=new THREE.Vector3();
  const arc=arcGeometry(),wall=new THREE.CylinderGeometry(1,1,.9,48,1,true),crystal=crystalGeometry(),plane=new THREE.PlaneGeometry(1,1);
  for(let i=0;i<12;i++){
   const group=new THREE.Group();group.visible=false;scene.add(group);const material=energyMaterial();
   const ribbons=[];for(let j=0;j<3;j++){const mesh=new THREE.Mesh(arc,material);mesh.position.y=j*.1;mesh.rotation.set(j===1?.22:-.08,j*.5,0);mesh.scale.setScalar(1-j*.09);group.add(mesh);ribbons.push(mesh);}
   const veil=new THREE.Mesh(wall,material);veil.position.y=.46;group.add(veil);
   const shards=new THREE.InstancedMesh(crystal,new THREE.MeshPhysicalMaterial({color:0x9be6ff,emissive:0x3f8eae,emissiveIntensity:.5,roughness:.17,metalness:.1,transparent:true,opacity:.8,clearcoat:1,flatShading:true}),24);shards.frustumCulled=false;shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(shards);
   const motes=new THREE.InstancedMesh(plane,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),20);motes.frustumCulled=false;motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(motes);
   this.entries.push({group,material,ribbons,veil,shards,motes,life:0,max:1,time:0,follow:null,position:new THREE.Vector3(),scale:1,kind:'sweep',element:'wind',angle:0,height:0});
  }
  this.lights=Array.from({length:2},()=>{const light=new THREE.PointLight(0xffffff,0,5,2);light.visible=true;scene.add(light);return{light,life:0,max:.16};});
  this.screen=document.createElement('div');this.screen.id='combat-screen-flash';this.screen.setAttribute('aria-hidden','true');this.screen.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2;opacity:0;background:radial-gradient(ellipse at center,transparent 35%,var(--hit-color,#8cdbff));mix-blend-mode:screen;';document.body.appendChild(this.screen);this.screenLife=0;
 }
 setBudget(count){this.limit=count<64?4:count<128?8:12;this.moteCount=count<64?8:count<128?14:20;}
 emit(kind,point,move,owner,radius=1,life=.45){
  const entry=this.entries.slice(0,this.limit).find(e=>e.life<=0);if(!entry)return null;
  const art=COMBAT_ART[owner?.profile?.id]||COMBAT_ART.capoeira;
  Object.assign(entry,{kind,life,max:life,time:0,follow:null,owner,move,scale:radius,element:move?.element||art.element,angle:owner?.mover.facing||0,height:0});entry.position.copy(point);entry.group.visible=true;
  entry.material.uniforms.uColor.value.set(({arcaneField:0xbba3e8,holyField:0xffe3a0,toxinCloud:0x9cbd64,shadowPulse:0x987dbb,gust:0xc1d6d7,frostMist:0xb7edff,discharge:0x8bdfff})[kind]??move?.artColor??art.color);entry.material.uniforms.uFire.value=entry.element==='fire'&&['heat','sweep','nova','burst','powerMode','ultimateAura'].includes(kind)?1:0;entry.material.uniforms.uWall.value=kind==='sweep'?0:1;
  return entry;
 }
 empower(fighter,move){
  const e=this.emit('powerMode',fighter.position,move,fighter,.85,4);if(e){e.follow=fighter;e.height=.025;}
 }
 charge(fighter,move){
  if(!move.skill||!fighter.attackSequence||fighter.attackSequence.index>0||move.kind==='mobility')return;
  const ultimate=!!fighter.attackSequence;
  const entry=this.emit(ultimate?'ultimateAura':'charge',fighter.position,move,fighter,ultimate?1.05:.6,ultimate?3.5:.38);if(entry){entry.follow=fighter;entry.height=.05;}
 }
 sweep(fighter,move){
  if(!move.skill&&!move.sequenceOnly)return; // Basic attacks use the actual hand/blade trail.
  const entry=this.emit('sweep',fighter.position,move,fighter,Math.min(1.8,Math.max(.7,(move.range||1.2)*.75)),move.power==='heavy'?.34:.24);
  if(entry){entry.height=fighter.height*(fighter.profile.id==='capoeira'?.28:.52);entry.follow=fighter;entry.angle+=fighter.comboStage===2?.6:-.5;}
 }
 release(fighter,move){
  if(move.kind!=='area'||move.specialPower)return;
  const point=(move.targeted?fighter.castPoint:fighter.position);if(!point)return;
  if(move.targeted&&!fighter.world.arena.hasLineOfSight(fighter.position,point))return;
  const floor=fighter.world.arena.groundHeight(point.x,point.z),air=move.environment?.surface==='air'||point.y>floor+.25;
  this.temp.copy(point);this.temp.y=air?point.y+fighter.height*.5:floor+.035;
  this.emit(air?'burst':'nova',this.temp,move,fighter,move.range||1.5,.65);this.flash(this.temp,move.artColor||move.color,false);
 }
 contact(attacker,target,result,move,point){
  if(result==='blocked')return;
  const heavy=move.power==='heavy',critical=target.lastHitInfo?.critical;
  if(heavy||critical||move.skill)this.emit('burst',point,move,attacker,heavy?.7:.4,.32);
  this.flash(point,move.artColor||move.color||0xffcd94,target.team==='p'||critical);
 }
 flash(point,color,screen){
  const slot=this.lights.find(s=>s.life<=0)||this.lights[0];slot.life=slot.max;slot.light.position.copy(point);slot.light.color.set(color);slot.light.intensity=8;slot.light.visible=true;
  if(screen&&!this.reduced){this.screenLife=.12;this.screen.style.setProperty('--hit-color',new THREE.Color(color).getStyle());}
 }
 strike(point,move,fighter){
  const top=point.clone();top.y+=4.5;
  const bolt=fighter.world.effects.special.spawn('lightning',top,new THREE.Vector3(0,-1,0),move.artColor||move.color,.2);
  if(bolt){bolt.end.copy(point);bolt.held=false;bolt.life=.22;}
  this.flash(point,move.artColor||move.color,false);
 }
 landing(fighter,velocity){
  if(velocity<2)return;
  fighter.world.effects.contacts.dust(fighter.position,Math.min(1.2,.4+velocity*.07),.7);
 }
 clear(){for(const e of this.entries){e.life=0;e.group.visible=false;e.follow=null;}for(const s of this.lights){s.life=0;s.light.intensity=0;}this.screenLife=0;this.screen.style.opacity=0;}
 update(dt){
  for(const e of this.entries){if(e.life<=0)continue;e.life=Math.max(0,e.life-dt);e.time+=dt;e.group.visible=e.life>0;if(!e.group.visible)continue;
   if(e.follow){if(e.follow.character&&(!e.follow.alive||e.follow.inactive)){e.life=0;e.group.visible=false;continue;}if(e.kind==='powerMode'&&![...e.follow.statuses.entries.values()].some(s=>s.empowered)){e.follow=null;e.life=Math.min(e.life,.12);continue;}if(e.kind==='ultimateAura'&&!e.follow.attackSequence){e.follow=null;e.life=Math.min(e.life,.12);continue;}if(e.kind==='charge'&&(e.follow.state!=='attack'||e.follow.move!==e.move)){e.life=0;e.group.visible=false;continue;}e.position.copy(e.follow.position);}
   const t=1-e.life/e.max,u=e.material.uniforms;u.uTime.value=e.time;u.uProgress.value=t;u.uAtlas.value=elementalTextures.atlas;u.uNoise.value=vfxTextures.smoke_04;
   e.group.position.copy(e.position);e.group.position.y+=e.height;e.group.rotation.set(0,e.angle+(e.kind==='sweep'?t*1.5:e.time*2),0);e.group.scale.setScalar(e.scale*(e.kind==='burst'?.6+t*.5:e.kind==='sweep'?1:.75+t*.25));
   for(const mesh of e.ribbons)mesh.visible=e.kind==='sweep'||e.kind==='nova'||e.kind==='charge'||e.kind==='frostWave'||e.kind==='ultimateAura'||e.kind==='powerMode';
   e.veil.visible=!['sweep','ultimateAura','powerMode','landing','gust','frostMist'].includes(e.kind);e.veil.scale.y=['frostMist','holyField','arcaneField'].includes(e.kind)?.18:['gust','landing'].includes(e.kind)?.35:['toxinCloud','shadowPulse'].includes(e.kind)?.7:e.kind==='charge'?.7:e.kind==='burst'?.6:1;
   e.shards.visible=e.element==='frost'&&['nova','burst','frostWave','frostMist'].includes(e.kind);
   if(e.shards.visible){e.shards.count=e.kind==='burst'?8:24;for(let i=0;i<e.shards.count;i++){const a=i*2.4,r=e.kind!=='burst'?.88:.2+(i%3)*.18;this.dummy.position.set(Math.cos(a)*r,0,Math.sin(a)*r);this.dummy.rotation.set(Math.sin(a)*.25,a,Math.cos(a)*.25);this.dummy.scale.setScalar((.35+(i%4)*.16)*Math.sin(Math.PI*t));this.dummy.updateMatrix();e.shards.setMatrixAt(i,this.dummy.matrix);}e.shards.instanceMatrix.needsUpdate=true;}
   const map=['landing','gust','frostMist','toxinCloud','shadowPulse'].includes(e.kind)?vfxTextures.smoke_04:vfxTextures.flare_01;if(e.motes.material.map!==map){e.motes.material.map=map;e.motes.material.needsUpdate=true;}e.motes.material.color.copy(u.uColor.value);e.motes.material.opacity=(['landing','gust','frostMist','toxinCloud','shadowPulse'].includes(e.kind)?.22:.65)*(1-t);
  }
  for(const s of this.lights){s.life=Math.max(0,s.life-dt);s.light.intensity=8*s.life/s.max;}
  this.screenLife=Math.max(0,this.screenLife-dt);this.screen.style.opacity=(this.screenLife/.12*.12).toFixed(3);
 }
 render(camera){
  for(const e of this.entries){if(e.life<=0)continue;const t=1-e.life/e.max;e.group.getWorldQuaternion(this.dummy.quaternion);const q=this.dummy.quaternion.clone().invert().multiply(camera.quaternion);e.motes.count=this.moteCount||14;
   for(let i=0;i<e.motes.count;i++){const a=i*2.4+t*3,r=(e.kind==='sweep'?.75:.3)+t*.6;this.dummy.position.set(Math.cos(a)*r,(i%4)*.12+t*.6,Math.sin(a)*r);this.dummy.quaternion.copy(q);this.dummy.scale.setScalar(['landing','gust','frostMist','toxinCloud','shadowPulse'].includes(e.kind)?.65:.025+(i%3)*.015);this.dummy.updateMatrix();e.motes.setMatrixAt(i,this.dummy.matrix);}e.motes.instanceMatrix.needsUpdate=true;
  }
 }
}

export class GuardianWards{
 constructor(parent){this.group=new THREE.Group();parent.add(this.group);this.swords=[];}
 update(s){
  this.group.visible=s.kind==='guardians';if(!this.group.visible||!guardianModel)return;
  if(!this.swords.length)for(let i=0;i<2;i++){
   const holder=new THREE.Group(),model=guardianModel.clone(true);model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const axis=size.x>size.y&&size.x>size.z?new THREE.Vector3(1,0,0):size.z>size.y?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
   model.position.sub(center);holder.add(model);const wrapper=new THREE.Group();wrapper.add(holder);holder.quaternion.setFromUnitVectors(axis,new THREE.Vector3(0,1,0));holder.scale.setScalar(1/Math.max(size.x,size.y,size.z));
   model.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of [].concat(o.material)){if(m.emissive){m.emissive.set(0xd6a94d);m.emissiveIntensity=.3;}}}});
   this.group.add(wrapper);this.swords.push(wrapper);
  }
  for(let i=0;i<2;i++){const a=i*Math.PI+s.time*1.5;this.swords[i].position.set(Math.cos(a)*s.radius*.48,1.1+Math.sin(s.time*3+i)*.1,Math.sin(a)*s.radius*.48);this.swords[i].rotation.y=a;}
 }
}

// Two small rigged familiars share the cached dragon geometry and texture.
export class FamiliarOrbit{
 constructor(parent){this.group=new THREE.Group();parent.add(this.group);this.items=Array.from({length:2},()=>{const pivot=new THREE.Group();pivot.scale.setScalar(.3);this.group.add(pivot);return{pivot,apparition:new DragonApparition(pivot),state:{kind:'dragon',time:0,direction:new THREE.Vector3()}};});}
 update(s,fade){this.group.visible=s.kind==='spirits';if(!this.group.visible)return;for(let i=0;i<2;i++){const e=this.items[i],a=s.time*1.5+i*Math.PI;e.pivot.position.set(Math.cos(a)*.85,1.15+Math.sin(s.time*3+i)*.1,Math.sin(a)*.85);e.state.time=s.time;e.state.direction.set(-Math.sin(a),0,Math.cos(a));e.state.material=s.material;e.pivot.rotation.y=Math.atan2(e.state.direction.x,e.state.direction.z);e.apparition.update(e.state,fade);}}
 render(camera){if(this.group.visible)for(const e of this.items)e.apparition.render(camera);}
}
