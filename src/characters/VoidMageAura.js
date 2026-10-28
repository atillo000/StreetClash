import * as THREE from 'three';
import { vfxTextures } from '../combat/TexturedVFX.js';

// The aura is a cosmetic attachment, never a hitbox or a substitute for a rig.
const vertex=`varying vec2 vUv;varying vec3 vN,vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
function material(orb=false){return new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uMist:{value:null},uFade:{value:1},uCyan:{value:0}},vertexShader:vertex,
 fragmentShader:`varying vec2 vUv;varying vec3 vN,vV;uniform sampler2D uMist;uniform float uTime,uFade,uCyan;
 void main(){vec2 uv=vUv;float n=texture2D(uMist,fract(uv*vec2(3.,1.5)+vec2(uTime*.09,-uTime*.16))).a;
 float n2=texture2D(uMist,fract(uv*vec2(5.,2.)-vec2(uTime*.13,uTime*.07))).a;
 vec3 violet=vec3(.46,.06,1.),cyan=vec3(.15,.88,1.);vec3 color=mix(violet,cyan,uCyan);
 ${orb?`float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);float vein=pow(max(0.,1.-abs(sin(uv.x*24.+uv.y*17.+n*8.-uTime*2.))),18.);vec3 core=vec3(.018,.003,.035);gl_FragColor=vec4(mix(core,color*1.8,clamp(rim*.9+vein*.7,0.,1.)),uFade);`:
 `float edge=pow(max(0.,1.-abs(uv.y*2.-1.)),2.);float fibers=smoothstep(.07,.45,n*.7+n2*.5);float ends=smoothstep(0.,.12,uv.x)*(1.-smoothstep(.8,1.,uv.x));float a=edge*fibers*ends*uFade*.48;if(a<.006)discard;gl_FragColor=vec4(mix(color,vec3(.85,.65,1.),pow(edge,9.)*.4),a);`}
 #include <colorspace_fragment>}`,
 transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:orb?THREE.NormalBlending:THREE.AdditiveBlending});}
function ribbonGeometry(){const g=new THREE.BufferGeometry(),p=new Float32Array(73*2*3),uv=[],index=[];for(let i=0;i<=72;i++){uv.push(i/72,0,i/72,1);if(i<72){const k=i*2;index.push(k,k+2,k+1,k+1,k+2,k+3);}}g.setAttribute('position',new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);return g;}
export class VoidMageAura{
 constructor(character){this.character=character;this.time=0;this.root=new THREE.Group();this.root.name='Void Mage cosmetic aura';character.root.add(this.root);
  this.hand=character.bone('mixamorigLeftHand');this.point=new THREE.Vector3();this.worldRotation=new THREE.Quaternion();
  this.orbMaterial=material(true);this.orb=new THREE.Mesh(new THREE.SphereGeometry(.105,24,16),this.orbMaterial);this.orb.frustumCulled=false;this.root.add(this.orb);
  this.halo=new THREE.Sprite(new THREE.SpriteMaterial({color:0x8b37f1,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));this.halo.scale.setScalar(.48);this.root.add(this.halo);
  this.ribbons=[0,1].map(i=>{const mesh=new THREE.Mesh(ribbonGeometry(),material());mesh.material.uniforms.uCyan.value=i*.8;mesh.frustumCulled=false;this.root.add(mesh);return mesh;});
 }
 update(dt){
  this.time+=Math.min(dt,.1);const c=this.character,name=c.actionName||'',dead=/Defeat|Death|Down|GetUp/i.test(name);this.root.visible=!dead&&!!this.hand;if(!this.root.visible)return;
  const attacking=!!c.actionName,fade=attacking?.45:.85;
  this.hand.getWorldPosition(this.point);c.root.worldToLocal(this.point);this.orb.position.copy(this.point).add(new THREE.Vector3(0,.075,.025));this.halo.position.copy(this.orb.position);
  this.orbMaterial.uniforms.uTime.value=this.time;this.orbMaterial.uniforms.uMist.value=vfxTextures.smoke_04;this.orbMaterial.uniforms.uFade.value=fade;
  if(this.halo.material.map!==vfxTextures.flare_01){this.halo.material.map=vfxTextures.flare_01;this.halo.material.needsUpdate=true;}this.halo.material.opacity=fade*.42;
  this.orb.rotation.y=this.time*.6;
  this.ribbons.forEach((mesh,j)=>{const p=mesh.geometry.attributes.position;mesh.material.uniforms.uTime.value=this.time+j;mesh.material.uniforms.uMist.value=vfxTextures.smoke_04;mesh.material.uniforms.uFade.value=fade;
   for(let i=0;i<=72;i++){const t=i/72,a=t*Math.PI*3.3+this.time*(j?-.35:.45)+j*Math.PI,y=.08+t*1.65+Math.sin(a*1.4+this.time)*.045,r=.4+Math.sin(t*Math.PI)*.16,width=(.025+Math.sin(t*Math.PI)*.035)*(j?.6:1);
    for(let side=0;side<2;side++){const s=side?1:-1;p.setXYZ(i*2+side,Math.cos(a)*r,y+s*width,Math.sin(a)*r);}}
   p.needsUpdate=true;mesh.geometry.computeVertexNormals();
  });
 }
 dispose(){this.root.removeFromParent();for(const mesh of [this.orb,...this.ribbons]){mesh.geometry.dispose();mesh.material.dispose();}this.halo.material.dispose();}
}
