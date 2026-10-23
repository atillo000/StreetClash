import * as THREE from 'three';

// Authored CC0 artwork from the supplied Kenney Particle Pack. One shared set
// of GPU textures; the meshes below are surfaces carrying that artwork.
const loader = new THREE.TextureLoader();
const cornerB = [false,true,false,true,true,false];
const cornerSigns = [-1,-1,1,-1,1,1];
export const vfxTextures = {};
export async function loadVFXTextures() {
  await Promise.all(['smoke_04','twirl_01','flare_01','slash_02'].map(async name => {
    const texture = await loader.loadAsync(`assets/textures/kenney/${name}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    vfxTextures[name] = texture;
  }));
}

const surfaceVertex = `varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}`;

export function barrierMaterial() {
  return new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color(0x8dcfff)},uTime:{value:0},uProgress:{value:0},uOpacity:{value:.6},uStrength:{value:1},uShell:{value:1},uArc:{value:0},uSmoke:{value:null}},
    vertexShader:surfaceVertex,
    fragmentShader:`varying vec2 vUv;varying vec3 vN;varying vec3 vV;
uniform sampler2D uSmoke;uniform vec3 uColor;uniform float uTime,uProgress,uOpacity,uStrength;
float hex(vec2 p){p=abs(p);return max(dot(p,normalize(vec2(1.,1.732))),p.x);}
void main(){
  vec2 uv=vUv*vec2(12.,7.);vec2 repeat=vec2(1.,1.732);
  vec2 a=mod(uv,repeat)-repeat*.5,b=mod(uv-repeat*.5,repeat)-repeat*.5;
  vec2 cell=dot(a,a)<dot(b,b)?a:b;
  float edge=smoothstep(.40,.48,hex(cell));
  float mist=texture2D(uSmoke,fract(vUv*vec2(2.,1.)+vec2(uTime*.027,-uTime*.04))).a;
  float rim=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.6);
  float ripple=exp(-pow((length((vUv-vec2(.5,.5))*vec2(2.,1.))-(uProgress*.9)),2.)*160.);
  float fade=1.-uProgress;
  float alpha=(rim*.55+edge*.17+mist*.09+ripple*.2)*uOpacity*uStrength*fade;
  if(alpha<.008)discard;
  gl_FragColor=vec4(mix(uColor,vec3(.9,1.,1.),rim*.5+ripple*.25),min(alpha,.75));
  #include <colorspace_fragment>
}`,
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
  });
}

// Shared lightning geometry is a set of camera-facing textured ribbons, not
// platform-dependent one-pixel WebGL lines. No cosmetic segment does damage.
export class StormVFX {
  constructor(parent) {
    this.group=new THREE.Group();parent.add(this.group);
    this.tornado=new THREE.Group();this.group.add(this.tornado);
    this.layers=[];this.dummy=new THREE.Object3D();this.cameraQ=new THREE.Quaternion();
    for(let i=0;i<2;i++){
      const material=new THREE.ShaderMaterial({
        uniforms:{uSmoke:{value:null},uTime:{value:0},uFade:{value:0},uLayer:{value:i}},
        vertexShader:surfaceVertex,
        fragmentShader:`varying vec2 vUv;varying vec3 vN;varying vec3 vV;
uniform sampler2D uSmoke;uniform float uTime,uFade,uLayer;
void main(){
  vec2 uv=vec2(vUv.x*3.+uTime*(.85+uLayer*.15)-vUv.y*2.8,vUv.y*1.2-uTime*.18);
  vec4 smoke=texture2D(uSmoke,fract(uv));
  float grain=texture2D(uSmoke,fract(uv*1.7+vec2(-uTime*.2,.3))).a;
  float edge=smoothstep(0.,.10,vUv.y)*(1.-smoothstep(.80,1.,vUv.y));
  float density=smoothstep(.04,.7,smoke.a*.8+grain*.4);
  float shade=.45+.55*abs(dot(normalize(vN),normalize(vec3(-.4,.8,.3))));
  vec3 color=mix(vec3(.15,.18,.21),vec3(.44,.48,.52),shade);
  gl_FragColor=vec4(color,density*edge*uFade*.52);
  #include <colorspace_fragment>
}`,
        transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:true
      });
      const funnel=new THREE.Mesh(new THREE.CylinderGeometry(.95-i*.12,.13+i*.06,2.7,36,16,true),material);
      funnel.position.y=1.35;funnel.rotation.y=i*1.4;this.tornado.add(funnel);this.layers.push(funnel);
    }
    this.cloudMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.32,depthWrite:false,color:0x677582,toneMapped:true});
    this.clouds=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),this.cloudMaterial,24);
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.clouds.frustumCulled=false;this.tornado.add(this.clouds);
    this.dust=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({transparent:true,opacity:.55,depthWrite:false,color:0x9b8c78,side:THREE.DoubleSide}));
    this.dust.rotation.x=-Math.PI/2;this.dust.position.y=.035;this.tornado.add(this.dust);
    this.stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.07,0),new THREE.MeshStandardMaterial({color:0x646461,roughness:.95}),10);
    this.stones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.stones.frustumCulled=false;this.tornado.add(this.stones);
    this.boltGeometry=new THREE.BufferGeometry();
    this.boltGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*6*3),3).setUsage(THREE.DynamicDrawUsage));
    const uv=[];for(let i=0;i<64;i++)uv.push(0,0,1,0,0,1,1,0,1,1,0,1);
    this.boltGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    this.boltMaterial=new THREE.ShaderMaterial({
      uniforms:{uColor:{value:new THREE.Color()},uFade:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uFade;void main(){float d=abs(vUv.y*2.-1.);float glow=exp(-d*4.);float core=1.-smoothstep(.025,.13,d);gl_FragColor=vec4(mix(uColor,vec3(1.),core),max(core,glow*.65)*uFade);\n#include <colorspace_fragment>\n}`,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
    });
    this.bolt=new THREE.Mesh(this.boltGeometry,this.boltMaterial);this.bolt.frustumCulled=false;this.group.add(this.bolt);
    this.flash=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
    this.group.add(this.flash);
    this.a=new THREE.Vector3();this.b=new THREE.Vector3();this.delta=new THREE.Vector3();this.side=new THREE.Vector3();this.view=new THREE.Vector3();
    this.branchEnd=new THREE.Vector3();this.points=Array.from({length:65},()=>new THREE.Vector3());
    this.segments=[];for(let i=0;i<64;i++)this.segments.push({a:new THREE.Vector3(),b:new THREE.Vector3(),width:.08});
    this.count=0;this.seed=-1;this.fade=0;this.state=null;this.cloudCount=24;
  }
  setBudget(count){this.cloudCount=count<64?12:count<128?18:24;}
  update(s,fade){
    this.state=s;this.fade=fade;this.group.visible=['tornado','lightning'].includes(s.kind);
    if(!this.group.visible)return;
    this.tornado.visible=s.kind==='tornado';this.bolt.visible=this.flash.visible=s.kind==='lightning';
    if(this.tornado.visible){
      this.tornado.scale.set(s.radius,1,s.radius);
      for(const layer of this.layers){Object.assign(layer.material.uniforms.uSmoke,{value:vfxTextures.smoke_04});layer.material.uniforms.uTime.value=s.time;layer.material.uniforms.uFade.value=fade;}
      this.cloudMaterial.map=vfxTextures.smoke_04;this.cloudMaterial.opacity=.62*fade;
      this.dust.material.map=vfxTextures.twirl_01;this.dust.material.opacity=.55*fade;this.dust.rotation.z=-s.time*5;this.dust.scale.setScalar(1.15);
      for(let i=0;i<10;i++){const a=i*2.4+s.time*(7+i*.15),h=((i*.19+s.time*.6)%1);this.dummy.position.set(Math.cos(a)*(.22+h*.65),.12+h*1.7,Math.sin(a)*(.22+h*.65));this.dummy.rotation.set(a,a*.7,a*.4);this.dummy.scale.setScalar(.5+(i%3)*.3);this.dummy.updateMatrix();this.stones.setMatrixAt(i,this.dummy.matrix);}
      this.stones.instanceMatrix.needsUpdate=true;
    }else{
      // The authoritative hit endpoint comes from PowerSystem.trace, including walls.
      this.boltMaterial.uniforms.uColor.value.copy(s.material.color);this.boltMaterial.uniforms.uFade.value=fade;
      this.flash.material.map=vfxTextures.flare_01;this.flash.material.color.copy(s.material.color);this.flash.material.opacity=.8*fade;
      this.flash.position.subVectors(s.end,s.position);this.flash.scale.setScalar(.65+fade*.45);
      const seed=Math.floor(s.time*25);
      if(seed!==this.seed||s.time<.03){this.seed=seed;this.makeBolt(s,seed);}
    }
  }
  makeBolt(s,seed){
    this.delta.subVectors(s.end,s.position);this.count=0;
    const point=(out,t,amount)=>out.copy(this.delta).multiplyScalar(t).add(this.a.set(Math.sin(t*139+seed*7)*amount,Math.cos(t*97+seed*11)*amount,Math.sin(t*183+seed*3)*amount));
    for(let j=0;j<=24;j++)point(this.points[j],j/24,j===0||j===24?0:.14);
    for(let j=0;j<24;j++){const seg=this.segments[this.count++];seg.a.copy(this.points[j]);seg.b.copy(this.points[j+1]);seg.width=.10;}
    for(let branch=0;branch<4;branch++){
      const start=this.points[5+branch*4];this.branchEnd.copy(start).addScaledVector(this.delta,.12).add(this.a.set(Math.sin(branch*6+seed)*.55,-.25+Math.cos(branch*4+seed)*.4,Math.cos(branch*7+seed)*.55));
      this.a.copy(start);
      for(let j=1;j<=8;j++){this.b.copy(start).lerp(this.branchEnd,j/8);if(j<8){this.b.x+=Math.sin(j*11+seed)*.06;this.b.y+=Math.cos(j*13+seed)*.06;}const seg=this.segments[this.count++];seg.a.copy(this.a);seg.b.copy(this.b);seg.width=.045*(1-j/11);this.a.copy(this.b);}
    }
    this.boltGeometry.setDrawRange(0,this.count*6);
  }
  render(camera){
    if(!this.group.visible||!this.state)return;
    const s=this.state;
    if(this.tornado.visible){
      this.tornado.getWorldQuaternion(this.cameraQ).invert().multiply(camera.quaternion);
      this.clouds.count=this.cloudCount;
      for(let i=0;i<this.cloudCount;i++){
        const t=(i/this.cloudCount+s.time*.22)%1,a=i*2.4+s.time*(5-t*2),r=.14+t*.75;
        this.dummy.position.set(Math.cos(a)*r,.15+t*2.35,Math.sin(a)*r);this.dummy.quaternion.copy(this.cameraQ);this.dummy.rotateZ(i*1.7+s.time*.3);this.dummy.scale.setScalar(.5+t*.95);this.dummy.updateMatrix();this.clouds.setMatrixAt(i,this.dummy.matrix);
      }
      this.clouds.instanceMatrix.needsUpdate=true;
    }else{
      const attr=this.boltGeometry.attributes.position;
      for(let i=0;i<this.count;i++){
        const seg=this.segments[i];this.delta.subVectors(seg.b,seg.a);this.view.copy(camera.position).sub(s.position).sub(seg.a);this.side.crossVectors(this.delta,this.view).normalize().multiplyScalar(seg.width);
        for(let n=0;n<6;n++){const corner=cornerB[n]?seg.b:seg.a,sign=cornerSigns[n];attr.setXYZ(i*6+n,corner.x+this.side.x*sign,corner.y+this.side.y*sign,corner.z+this.side.z*sign);}
      }
      attr.needsUpdate=true;
    }
  }
}
