import { batchStatic } from '../core/WarehouseArena.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Shares the loaded fighter and renderer. A separate portrait scene keeps arena
// walls/props out of the selection view; the actor is restored synchronously.
export class HeroPreview {
 constructor({renderer,scene,world,player}){
  Object.assign(this,{renderer,world,player});this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xc8d6d1);this.scene.environment=scene.environment;this.scene.environmentIntensity=.3;const workshop=world.arena.details.workshop(world.arena.floorMaterial);batchStatic(workshop);this.scene.add(workshop);
  this.scene.add(new THREE.HemisphereLight(0xe7f0f3,0x7d8b80,1.3));
  for(const[color,intensity,pos]of [[0xffe5c8,1.05,[-3,5,-4]],[0x91bccb,.8,[3,3,2]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);this.scene.add(l);}
  const heroSpot=new THREE.SpotLight(0xffe4bf,34,12,.55,.75,2);heroSpot.position.set(-1.3,4,2.8);heroSpot.target.position.set(0,.9,0);this.scene.add(heroSpot,heroSpot.target);
  const stand=new THREE.Mesh(new THREE.CylinderGeometry(.93,1.02,.12,64),new THREE.MeshStandardMaterial({color:0xb2ac94,roughness:.9,map:world.arena.floorMaterial.map,normalMap:world.arena.floorMaterial.normalMap}));stand.position.y=-.07;this.scene.add(stand);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.93,.012,5,64).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0xbaa57c}));rim.position.y=.002;this.scene.add(rim);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const g=canvas.getContext('2d'),fade=g.createRadialGradient(32,32,2,32,32,31);fade.addColorStop(0,'rgba(0,0,0,.4)');fade.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fade;g.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.position.y=.005;this.scene.add(shadow);
  const el=this.el=document.createElement('section');el.id='heroPreview';el.setAttribute('aria-label','Animated hero preview');
  el.innerHTML='<div class="hero-stage" tabindex="0" role="region" aria-label="Drag to rotate hero. Arrow keys rotate; plus and minus zoom."></div><div class="hero-preview-caption"><small>YOUR CONTENDER</small><strong></strong><span>Drag to inspect in 360° · Scroll / pinch to zoom</span><div><button type="button" data-turn="-1" aria-label="Rotate left">↶</button><button type="button" data-reset>Reset view</button><button type="button" data-turn="1" aria-label="Rotate right">↷</button></div></div>';
  document.getElementById('lobby').appendChild(el);this.stage=el.querySelector('.hero-stage');
  this.camera=new THREE.PerspectiveCamera(36,1,.08,30);this.orbitCamera=this.camera.clone();this.controls=new OrbitControls(this.orbitCamera,this.stage);
  Object.assign(this.controls,{enableDamping:true,dampingFactor:.09,enablePan:false,minDistance:2.8,maxDistance:5.8,minPolarAngle:.35,maxPolarAngle:Math.PI*.65,rotateSpeed:.65});
  this.stage.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Equal','Minus'].includes(e.code)){e.preventDefault();e.stopPropagation();this.rotate(e.code==='ArrowLeft'?-.3:e.code==='ArrowRight'?.3:0,e.code==='ArrowUp'?-.12:e.code==='ArrowDown'?.12:0,e.code==='Equal'?.9:e.code==='Minus'?1.1:1);}});
  el.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>this.rotate(Number(b.dataset.turn)*.4));el.querySelector('[data-reset]').onclick=()=>this.reset();
  this.viewport=new THREE.Vector4();this.scissor=new THREE.Vector4();this.position=new THREE.Vector3();this.rotation=new THREE.Euler();this.reset();
 }
 reset(){this.controls.target.set(0,this.player.height*.5,0);this.orbitCamera.position.copy(this.controls.target).add(new THREE.Vector3(-.35,.15,3.9));this.controls.update();}
 rotate(yaw=0,pitch=0,zoom=1){const v=this.orbitCamera.position.clone().sub(this.controls.target),s=new THREE.Spherical().setFromVector3(v);s.theta+=yaw;s.phi=THREE.MathUtils.clamp(s.phi+pitch,.35,Math.PI*.65);s.radius=THREE.MathUtils.clamp(s.radius*zoom,2.8,5.8);this.orbitCamera.position.copy(this.controls.target).add(v.setFromSpherical(s));this.controls.update();}
 render(){
  const active=this.world.match.state==='lobby'&&!this.world.online?.playing;this.el.hidden=!active;this.controls.enabled=active;if(!active)return;
  if(this.fighter!==this.player.profile.id){this.fighter=this.player.profile.id;this.reset();this.el.querySelector('strong').textContent=this.player.profile.name+' / '+this.player.profile.role;}
  this.controls.update();const polar=this.controls.getPolarAngle(),distance=this.controls.getDistance();this.viewYaw=Math.atan2(-.35,3.9)-this.controls.getAzimuthalAngle();
  // Rotate the hero on the stand; keep the workshop stationary and readable.
  this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance,polar,Math.atan2(-.35,3.9))));this.camera.lookAt(this.controls.target);
  const r=this.stage.getBoundingClientRect();if(r.width<1||r.height<1)return;
  const renderer=this.renderer,actor=this.player.character.root,parent=actor.parent;this.position.copy(actor.position);this.rotation.copy(actor.rotation);
  renderer.getViewport(this.viewport);renderer.getScissor(this.scissor);const test=renderer.getScissorTest(),shadowAuto=renderer.shadowMap.autoUpdate;
  this.scene.add(actor);actor.position.set(0,0,0);actor.rotation.set(0,this.viewYaw,0);actor.updateMatrixWorld(true);
  // The same skeleton can have been uploaded by the main scene this frame.
  // Refresh its texture explicitly after moving it to portrait coordinates.
  actor.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();if(o.skeleton.boneTexture)o.skeleton.boneTexture.needsUpdate=true;}});
  const mobile=innerWidth<=700;this.camera.aspect=innerWidth/innerHeight;
  this.camera.clearViewOffset();if(!mobile)this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*.22,0,innerWidth,innerHeight);
  else this.camera.setViewOffset(innerWidth,350,0,0,innerWidth,350);
  this.camera.updateProjectionMatrix();renderer.setViewport(0,mobile?innerHeight-350:0,innerWidth,mobile?350:innerHeight);renderer.setScissor(0,0,innerWidth,innerHeight);renderer.setScissorTest(true);renderer.shadowMap.autoUpdate=false;
  try{renderer.render(this.scene,this.camera);}finally{parent.add(actor);actor.position.copy(this.position);actor.rotation.copy(this.rotation);actor.updateMatrixWorld(true);actor.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});renderer.shadowMap.autoUpdate=shadowAuto;renderer.setViewport(this.viewport);renderer.setScissor(this.scissor);renderer.setScissorTest(test);}
 }
}
