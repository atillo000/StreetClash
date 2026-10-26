import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Reuse the loaded actor and renderer; no duplicate rig, assets or WebGL context.
export class HeroPreview {
 constructor({renderer,scene,world,player}){
  Object.assign(this,{renderer,scene,world,player});
  const el=this.el=document.createElement('section');el.id='heroPreview';el.setAttribute('aria-label','360 degree fighter preview');
  el.innerHTML='<div class="hero-stage" tabindex="0" role="region" aria-label="Drag to rotate fighter. Arrow keys rotate; plus and minus zoom."></div><div class="hero-preview-caption"><small>INSPECT FIGHTER / 360°</small><strong></strong><span>Drag to rotate · Scroll / pinch to zoom</span><div><button type="button" data-turn="-1" aria-label="Rotate left">↶</button><button type="button" data-reset>Reset view</button><button type="button" data-turn="1" aria-label="Rotate right">↷</button></div></div>';
  document.getElementById('lobby').appendChild(el);this.stage=el.querySelector('.hero-stage');
  this.camera=new THREE.PerspectiveCamera(40,1,.08,60);
  this.controls=new OrbitControls(this.camera,this.stage);Object.assign(this.controls,{enableDamping:true,dampingFactor:.09,enablePan:false,minDistance:2.1,maxDistance:5.2,minPolarAngle:.25,maxPolarAngle:Math.PI-.25,rotateSpeed:.65});
  this.stage.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Equal','Minus'].includes(e.code)){e.preventDefault();e.stopPropagation();this.rotate(e.code==='ArrowLeft'?-.3:e.code==='ArrowRight'?.3:0,e.code==='ArrowUp'?-.12:e.code==='ArrowDown'?.12:0,e.code==='Equal'?.9:e.code==='Minus'?1.1:1);}});
  el.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>this.rotate(Number(b.dataset.turn)*.4));el.querySelector('[data-reset]').onclick=()=>this.reset();
  this.viewport=new THREE.Vector4();this.scissor=new THREE.Vector4();this.reset();
 }
 reset(){const p=this.player.position;this.controls.target.copy(p).add(new THREE.Vector3(0,this.player.height*.52,0));this.camera.position.copy(this.controls.target).add(new THREE.Vector3(-.55,.22,-3.4));this.controls.update();}
 rotate(yaw=0,pitch=0,zoom=1){const v=this.camera.position.clone().sub(this.controls.target),s=new THREE.Spherical().setFromVector3(v);s.theta+=yaw;s.phi=THREE.MathUtils.clamp(s.phi+pitch,.25,Math.PI-.25);s.radius=THREE.MathUtils.clamp(s.radius*zoom,2.1,5.2);this.camera.position.copy(this.controls.target).add(v.setFromSpherical(s));this.controls.update();}
 render(){
  const active=this.world.match.state==='lobby'&&!this.world.online?.playing;this.el.hidden=!active;this.controls.enabled=active;if(!active)return;
  if(this.fighter!==this.player.profile.id){this.fighter=this.player.profile.id;this.reset();this.el.querySelector('strong').textContent=this.player.profile.name+' / '+this.player.profile.role;}
  this.controls.update();const r=this.stage.getBoundingClientRect();if(r.width<1||r.height<1)return;
  const renderer=this.renderer;renderer.getViewport(this.viewport);renderer.getScissor(this.scissor);const scissorTest=renderer.getScissorTest();
  const others=this.world.combatants.filter(c=>c!==this.player).map(c=>[c.character.root,c.character.root.visible]);for(const[o]of others)o.visible=false;
  this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();renderer.setViewport(r.left,innerHeight-r.bottom,r.width,r.height);renderer.setScissor(r.left,innerHeight-r.bottom,r.width,r.height);renderer.setScissorTest(true);
  const shadowAuto=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
  try{renderer.render(this.scene,this.camera);}finally{renderer.shadowMap.autoUpdate=shadowAuto;for(const[o,v]of others)o.visible=v;renderer.setViewport(this.viewport);renderer.setScissor(this.scissor);renderer.setScissorTest(scissorTest);}
 }
}
