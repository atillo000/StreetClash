import * as THREE from 'three';

const vertex=`
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
uniform float uProgress;
uniform float uShell;
void main(){
  vUv=uv;
  vec3 displaced=position+normal*sin(uv.y*34.0-uProgress*22.0)*0.018*uShell*(1.0-uProgress);
  vec4 mv=modelViewMatrix*vec4(displaced,1.0);
  vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}`;
const fragment=`
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uColor;
uniform float uProgress;
uniform float uShell;
uniform float uArc;
uniform float uStrength;
void main(){
  float alpha=0.0;
  float core=0.0;
  if(uShell>0.5){
    float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.5);
    float wave=pow(0.5+0.5*cos(vUv.y*56.0-uProgress*28.0),18.0);
    vec2 cell=abs(fract(vUv*vec2(18.0,10.0))-.5);
    float grid=smoothstep(.45,.49,max(cell.x,cell.y));
    alpha=(rim*.88+wave*.27+grid*.055)*(1.0-uProgress);
    core=rim*.75;
  }else{
    vec2 p=vUv*2.0-1.0;float r=length(p);
    float angle=atan(p.y,p.x);
    if(uArc>.5){
      float sweep=-1.1+uProgress*3.0;
      float delta=atan(sin(angle-sweep),cos(angle-sweep));
      float crescent=smoothstep(.54,.76,r)*(1.0-smoothstep(.86,1.0,r));
      float tip=pow(max(0.0,cos(delta*.78)),4.0)*step(abs(delta),1.8);
      alpha=crescent*tip*(1.0-uProgress)*1.4;core=crescent*tip;
    }else{
      float radius=.12+uProgress*.82;
      float ring=1.0-smoothstep(.018,.08,abs(r-radius));
      float inner=exp(-r*11.0)*(1.0-uProgress);
      float rays=pow(abs(cos(angle*4.0)),18.0)*exp(-r*3.0)*(1.0-uProgress);
      alpha=(ring*.85+inner+rays*.9)*(1.0-uProgress);core=inner+ring*.55;
    }
  }
  alpha=clamp(alpha*uStrength,0.0,.92);
  if(alpha<.008)discard;
  gl_FragColor=vec4(mix(uColor,vec3(1.0),clamp(core*.65,0.0,.8)),alpha);
}`;

// Fixed pools: no runtime texture downloads or per-hit geometry/material allocation.
// This is a local energy shimmer, not a full-screen refraction/postprocessing pass.
export class ArcadeVFX {
  constructor(scene){
    this.limit=6;this.entries=[];
    const sphere=new THREE.SphereGeometry(1,24,16),plane=new THREE.PlaneGeometry(2,2);
    for(const kind of ['shell','impact','arc'])for(let i=0;i<8;i++){
      const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,
        uniforms:{uColor:{value:new THREE.Color()},uProgress:{value:0},uShell:{value:kind==='shell'?1:0},uArc:{value:kind==='arc'?1:0},uStrength:{value:1}},
        transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
      const mesh=new THREE.Mesh(kind==='shell'?sphere:plane,material);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
      this.entries.push({kind,mesh,remaining:0,life:1,follow:null,position:new THREE.Vector3(),scale:new THREE.Vector3(),forward:new THREE.Vector3()});
    }
    this.direction=new THREE.Vector3();
  }
  setBudget(count){this.limit=Math.min(8,Math.max(2,Math.floor(count/16)));}
  get activeCount(){return this.entries.filter(e=>e.remaining>0).length;}
  emit(kind,position,color,life){
    const pool=this.entries.filter(e=>e.kind===kind).slice(0,this.limit);
    const slot=pool.find(e=>e.remaining<=0)||pool.reduce((a,b)=>a.remaining<b.remaining?a:b);
    slot.position.copy(position);slot.remaining=slot.life=life;slot.follow=null;slot.forward.set(0,0,0);
    slot.mesh.position.copy(position);slot.mesh.quaternion.identity();slot.mesh.visible=true;
    slot.mesh.material.uniforms.uColor.value.set(color);slot.mesh.material.uniforms.uProgress.value=0;slot.mesh.material.uniforms.uStrength.value=1;
    return slot;
  }
  contact(attacker,target,result,move,point){
    const blocked=result==='blocked',heavy=move.power==='heavy',critical=!!target.lastHitInfo?.critical;
    const color=blocked?0x8ddcff:critical?0xffc34e:heavy?0xffc57c:0xffe4b5;
    const shell=this.emit('shell',target.position,color,blocked?.38:heavy?.28:.2);
    shell.follow=target;shell.scale.set(target.radius*1.75,target.height*.51,target.radius*1.75);
    shell.mesh.material.uniforms.uStrength.value=blocked?1.2:critical?.7:.55;
    const impact=this.emit('impact',point,blocked?0xc0eeff:color,heavy?.32:.22);
    impact.scale.setScalar(blocked?.72:critical?1.15:heavy?.9:.52);
    this.direction.subVectors(attacker.position,target.position).setY(0).normalize();
    impact.position.addScaledVector(this.direction,.12);impact.mesh.position.copy(impact.position);
  }
  swing(fighter,move){
    const slot=this.emit('arc',fighter.position,move.color??fighter.profile.color,.22);
    slot.follow=fighter;slot.forward.set(Math.sin(fighter.mover.facing),0,Math.cos(fighter.mover.facing)).multiplyScalar(.55);
    const radius=fighter.profile.weapon?1.15: .85;
    slot.scale.set(radius,radius,1);
    if(move.vfx==='sweep')slot.mesh.rotation.set(-Math.PI/2,0,-fighter.mover.facing);
    else slot.mesh.rotation.set(-.25,fighter.mover.facing,-.5);
  }
  clear(){for(const e of this.entries){e.remaining=0;e.follow=null;e.mesh.visible=false;}}
  update(dt){
    for(const e of this.entries){
      if(e.remaining<=0)continue;e.remaining=Math.max(0,e.remaining-dt);
      e.mesh.visible=e.remaining>0;if(!e.mesh.visible){e.follow=null;continue;}
      const t=1-e.remaining/e.life;e.mesh.material.uniforms.uProgress.value=t;
      if(e.follow){
        e.mesh.position.copy(e.follow.position).add(e.forward);
        e.mesh.position.y+=e.kind==='shell'?e.follow.height*.49:e.follow.height*.52;
      }else e.mesh.position.copy(e.position);
      e.mesh.scale.copy(e.scale).multiplyScalar(e.kind==='shell'?1+t*.15:1);
    }
  }
  render(camera){for(const e of this.entries)if(e.remaining>0&&e.kind==='impact')e.mesh.quaternion.copy(camera.quaternion);}
}
