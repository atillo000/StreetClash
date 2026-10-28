import * as THREE from 'three';

// Muted urban freight yard with warm directional light and preserved surface detail.
export const ART = {
  sky: 0x969c9d, fog: 0x969c9d, ink: 0x353d40, concrete: 0x9e9889,
  amber: 0xa78543, coral: 0x785149, teal: 0x52635f, wall: 0xa59e8e,
  apron: 0x646563, floor: 0x999992, court: 0x92968e, paint: 0xb9ad82,
};

export function createArcadeLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xc6d3de,0x758073,.95));
  const key=new THREE.DirectionalLight(0xffe3bd,2.05);key.position.set(5,9,4);key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:30});
  key.shadow.bias=-0.00035;key.shadow.normalBias=.015;key.shadow.radius=2;
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xa9c7d3,.6);rim.position.set(-5,5,-6);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xe2e4dd,.3);fill.position.set(1,4,8);scene.add(fill);
  const portraitFill=new THREE.DirectionalLight(0xffebd0,1.1);scene.add(portraitFill,portraitFill.target);
  return{key,portraitFill};
}

const converted=new WeakMap();
// Keep UV texture detail. Only the flat factory palette is gently desaturated.
export function paintedTexture(source,factory=false) {
  if(!source?.image)return null;
  if(!factory)return source;
  if(converted.has(source))return converted.get(source);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const g=canvas.getContext('2d');g.filter='saturate(58%) brightness(102%)';g.drawImage(source.image,0,0,256,256);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=source.wrapS;texture.wrapT=source.wrapT;texture.flipY=source.flipY;
  texture.repeat.copy(source.repeat);texture.offset.copy(source.offset);texture.anisotropy=4;
  converted.set(source,texture);return texture;
}

export function styleFighterMaterial(material) {
  if(!material.isMeshStandardMaterial)return;
  // Preserve the supplied skin, fabric, armor textures and normal strength.
  material.roughness=Math.max(.48,material.roughness);
  material.metalness=Math.min(.65,material.metalness);
  material.emissive.set(0xdde3e7);material.emissiveIntensity=.008;
  material.needsUpdate=true;
}

// Pooled, soft contact shadows also work when the low preset disables shadow maps.
// This is a visual cue only; no animation, collision or gameplay state is changed.
export class FighterPresentation {
  constructor(scene,combatants) {
    this.contactPoint=new THREE.Vector3();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const g=canvas.getContext('2d');
    const glow=g.createRadialGradient(32,32,5,32,32,31);glow.addColorStop(0,'rgba(35,57,77,.5)');glow.addColorStop(1,'rgba(35,57,77,0)');
    g.fillStyle=glow;g.fillRect(0,0,64,64);const map=new THREE.CanvasTexture(canvas);
    const geometry=new THREE.PlaneGeometry(1.8,1.45).rotateX(-Math.PI/2);
    this.entries=combatants.map(c=>{const material=new THREE.MeshBasicMaterial({map,transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
      const mesh=new THREE.Mesh(geometry,material);mesh.name='fighter contact shadow';scene.add(mesh);return{c,mesh};});
  }
  update(){for(const{c,mesh}of this.entries){const point=c.character.ragdoll?c.character.bone('mixamorigHips').getWorldPosition(this.contactPoint):c.position;const ground=c.world.arena.groundHeight?.(point.x,point.z)??0,height=Math.max(0,point.y-ground);mesh.visible=c.character.root.visible;
    mesh.position.set(point.x,ground+.009,point.z);mesh.scale.setScalar((c.profile.height||1.85)/1.85*(1+height*.2));mesh.material.opacity=.55*Math.max(.1,1-height/3);}}
}
