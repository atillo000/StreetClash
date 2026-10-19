import * as THREE from 'three';

// One original painted-industrial palette. The court is quiet and cool;
// warm edge accents guide the eye without competing with fighters or attacks.
export const ART = {
  sky: 0xc4dfe3, fog: 0xc4dfe3, ink: 0x405c75, concrete: 0xdfd6b8,
  amber: 0xf0ad50, coral: 0xda846b, teal: 0x6caaa8, wall: 0xcbd2bf,
  apron: 0x829b9d, floor: 0x608f93, court: 0x78aaa3, paint: 0xe6cf94,
};

export function createArcadeLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xd9f2ff,0x8999a4,1.05));
  const key=new THREE.DirectionalLight(0xffe5be,2.8);key.position.set(5,9,4);key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:30});
  key.shadow.bias=-0.00035;key.shadow.normalBias=.015;key.shadow.radius=2;
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xb8c6ff,1.1);rim.position.set(-5,5,-6);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xe2f6ef,.25);fill.position.set(1,4,8);scene.add(fill);
  const portraitFill=new THREE.DirectionalLight(0xfff4df,.8);scene.add(portraitFill,portraitFill.target);
  return{key,portraitFill};
}

const converted=new WeakMap();
// Downsample and simplify existing prop albedo. Keep the supplied silhouettes
// and UVs, but discard photographic grain and baked shiny/noisy normal detail.
export function paintedTexture(source,factory=false) {
  if(!source?.image)return null;
  if(converted.has(source))return converted.get(source);
  const size=factory?64:128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(source.image,0,0,size,size);
  const pixels=g.getImageData(0,0,size,size),color=new THREE.Color(),hsl={};
  const ink=new THREE.Color(ART.ink),cream=new THREE.Color(0xe3d7b5),slate=new THREE.Color(0x8ca7ac);
  const warm=new THREE.Color(0xd6a463),blue=new THREE.Color(0x689cba),green=new THREE.Color(0x83b4a1);
  for(let i=0;i<pixels.data.length;i+=4){
    color.setRGB(pixels.data[i]/255,pixels.data[i+1]/255,pixels.data[i+2]/255,THREE.SRGBColorSpace).getHSL(hsl);
    const light=Math.round(hsl.l*5)/5;
    if(hsl.s<.12)color.copy(light<.16?ink:light<.5?slate:cream);
    else color.copy(hsl.h<.15||hsl.h>.93?warm:hsl.h>.46&&hsl.h<.79?blue:green);
    color.multiplyScalar(.75+light*.4);
    color.convertLinearToSRGB();pixels.data[i]=Math.round(color.r*255);pixels.data[i+1]=Math.round(color.g*255);pixels.data[i+2]=Math.round(color.b*255);
  }
  g.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;texture.flipY=source.flipY;
  texture.repeat.copy(source.repeat);texture.offset.copy(source.offset);texture.anisotropy=2;
  converted.set(source,texture);return texture;
}

export function styleFighterMaterial(material,accent) {
  if(!material.isMeshStandardMaterial)return;
  material.roughness=Math.max(.62,material.roughness);material.metalness=Math.min(.12,material.metalness);
  material.normalScale?.multiplyScalar(.5);
  // A small, neutral lift keeps dark clothing readable. Existing hit flashes
  // still own emissive temporarily and restore this material's baseline.
  material.emissive.set(0xe6f0f0);material.emissiveIntensity=.018;
  const rim=new THREE.Color(accent).lerp(new THREE.Color(0xf3f4da),.45);
  material.onBeforeCompile=shader=>{
    shader.uniforms.scRim={value:rim};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 scRim;')
      .replace('#include <opaque_fragment>',`float scEdge = smoothstep(0.45, 0.95, 1.0 - max(dot(normalize(vViewPosition), normal), 0.0));
        outgoingLight += scRim * scEdge * 0.11;
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=> 'streetclash-painted-fighter-v1';material.needsUpdate=true;
}

// Pooled, soft contact shadows also work when the low preset disables shadow maps.
// This is a visual cue only; no animation, collision or gameplay state is changed.
export class FighterPresentation {
  constructor(scene,combatants) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const g=canvas.getContext('2d');
    const glow=g.createRadialGradient(32,32,5,32,32,31);glow.addColorStop(0,'rgba(35,57,77,.5)');glow.addColorStop(1,'rgba(35,57,77,0)');
    g.fillStyle=glow;g.fillRect(0,0,64,64);const map=new THREE.CanvasTexture(canvas);
    const geometry=new THREE.PlaneGeometry(1.8,1.45).rotateX(-Math.PI/2);
    this.entries=combatants.map(c=>{const material=new THREE.MeshBasicMaterial({map,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
      const mesh=new THREE.Mesh(geometry,material);mesh.name='fighter contact shadow';scene.add(mesh);return{c,mesh};});
  }
  update(){for(const{c,mesh}of this.entries){const height=Math.max(0,c.position.y);mesh.visible=c.character.root.visible;
    mesh.position.set(c.position.x,.009,c.position.z);mesh.scale.setScalar((c.profile.height||1.85)/1.85*(1+height*.2));mesh.material.opacity=.55*Math.max(.1,1-height/3);}}
}
