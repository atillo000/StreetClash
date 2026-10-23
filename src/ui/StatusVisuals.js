import * as THREE from 'three';
import { vfxTextures } from '../combat/TexturedVFX.js';

// Original stroke icons shared by HUD chips and world sprites; no emoji/fonts
// or remote assets are needed. Edit mappings here without touching combat.
const paths={
 shield:'M5 4L12 2L19 4V11Q19 17 12 22Q5 17 5 11Z M8 11L11 14L16 8',
 stun:'M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z',
 poison:'M6 17V13Q2 4 12 3Q22 4 18 13V17Z M9 17V21M15 17V21 M8 9L10 11M10 9L8 11M14 9L16 11M16 9L14 11',
 bleed:'M12 2Q10 7 5 13Q1 23 12 23Q23 23 19 13Z',
 speed:'M3 7H16Q22 7 19 3M2 12H21M4 17H15Q21 17 18 21',
 power:'M4 20L18 3L21 6L6 21 M3 14L10 21M14 4L21 11',
 slow:'M4 3H20M4 21H20M6 3Q6 9 12 12Q18 15 18 21M18 3Q18 9 12 12Q6 15 6 21',
 focus:'M3 9V3H9M15 3H21V9M21 15V21H15M9 21H3V15 M12 7V17M7 12H17',
 orbit:'M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8 M2 14Q10 0 22 9Q15 24 2 14',
 weak:'M3 4L21 22M7 5L12 3L19 5V12L16 17M12 21Q5 17 5 10',
 heal:'M9 3H15V9H21V15H15V21H9V15H3V9H9Z',
 aura:'M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z'
};
export function statusVisual(entry){
 const e=entry.type||entry,id=entry.id||'';
 if(e.control)return{icon:'stun',anchor:'head',priority:100};
 if(e.shield)return{icon:'shield',anchor:'chest',priority:90};
 if(id==='familiars'||id==='guardians')return{icon:'orbit',anchor:'chest',priority:80};
 if(e.dot)return{icon:id==='bleeding'?'bleed':'poison',anchor:'chest',priority:75};
 if((e.moveSpeed||1)<1)return{icon:'slow',anchor:'feet',priority:65};
 if((e.moveSpeed||1)>1)return{icon:'speed',anchor:'feet',priority:45};
 if((e.defense||1)<1||(e.knockTaken||1)<1)return{icon:'shield',anchor:'chest',priority:60};
 if(id==='focus')return{icon:'focus',anchor:'hand',priority:50};
 return{icon:e.positive?'power':'weak',anchor:e.positive?'hand':'chest',priority:40};
}
export function statusIcon(icon){return `<svg viewBox="0 0 24 26" aria-hidden="true"><path d="${paths[icon]||paths.aura}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
const iconTextures=new Map();
function iconTexture(icon){
 if(iconTextures.has(icon))return iconTextures.get(icon);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d');ctx.scale(3.3,3.3);ctx.translate(2,1);ctx.strokeStyle='white';ctx.lineWidth=1.7;ctx.lineJoin=ctx.lineCap='round';ctx.shadowColor='white';ctx.shadowBlur=3;ctx.stroke(new Path2D(paths[icon]||paths.aura));const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;iconTextures.set(icon,t);return t;
}
function sprite(scene,name){const mesh=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,toneMapped:false}));mesh.name=name;mesh.visible=false;scene.add(mesh);return mesh;}

// Fixed attachment slots for every pooled actor. Bone positions are read after
// animation; replacing a fighter invalidates its bone cache automatically.
export class AttachedStatusVisuals{
 constructor(scene,combatants){this.time=0;this.right=new THREE.Vector3(1,0,0);this.iconLimit=3;this.entries=combatants.map(c=>({c,character:null,bones:{},point:new THREE.Vector3(),icons:Array.from({length:4},()=>sprite(scene,'Status icon')),attachments:Array.from({length:3},()=>sprite(scene,'Attached status mist')),orbitals:Array.from({length:3},()=>sprite(scene,'Status orbital'))}));}
 setBudget(count){this.iconLimit=count<64?2:count<128?3:4;}
 anchor(entry,name,out){
  const c=entry.c;if(entry.character!==c.character){entry.character=c.character;entry.bones={};}
  const boneName={head:'mixamorigHead',chest:'mixamorigSpine2',hand:'mixamorigRightHand',leftHand:'mixamorigLeftHand'}[name];
  if(boneName){const bone=entry.bones[boneName]??=c.character.bone(boneName);if(bone)return bone.getWorldPosition(out);}
  out.copy(c.position);out.y+=name==='head'?c.height:name==='feet'?.09:c.height*.55;return out;
 }
 configure(mesh,map,color,opacity=1){if(mesh.material.map!==map){mesh.material.map=map;mesh.material.needsUpdate=true;}mesh.material.color.set(color);mesh.material.opacity=opacity;mesh.visible=true;}
 render(dt,active,camera){
  this.time+=dt;if(camera)this.right.set(1,0,0).applyQuaternion(camera.quaternion);
  for(const entry of this.entries){
   const c=entry.c;for(const mesh of [...entry.icons,...entry.attachments,...entry.orbitals])mesh.visible=false;
   if(!active||!c.alive||c.inactive)continue;
   const effects=[...c.statuses.entries.values()].sort((a,b)=>statusVisual(b).priority-statusVisual(a).priority),count=Math.min(this.iconLimit,effects.length),scale=c.height/1.8;
   this.anchor(entry,'head',entry.point);entry.point.y+=.3*scale;
   for(let i=0;i<count;i++){
    const e=effects[i],visual=statusVisual(e),mesh=entry.icons[i];this.configure(mesh,iconTexture(visual.icon),e.type.color,Math.min(1,e.remaining/.3));mesh.position.copy(entry.point);mesh.position.addScaledVector(this.right,(i-(count-1)/2)*.24*scale);mesh.scale.setScalar(.22*scale);
   }
   for(let i=0;i<Math.min(3,effects.length);i++){
    const e=effects[i],visual=statusVisual(e),mesh=entry.attachments[i];if(e.type.control)continue;
    const mist=!!e.type.dot||!e.type.positive;
    this.configure(mesh,mist?vfxTextures.smoke_04:vfxTextures.flare_01,e.type.color,(mist?.28:.28)*(1+Math.sin(this.time*5+i)*.15));this.anchor(entry,visual.anchor,mesh.position);mesh.position.y+=Math.sin(this.time*2+i)*.035;mesh.scale.setScalar((mist?.55:visual.anchor==='hand'?.25:.32)*scale);
   }
   const stun=effects.find(e=>e.type.control),empowered=effects.find(e=>e.empowered),orbital=stun||empowered||effects.find(e=>e.type.shield);
   if(orbital){this.anchor(entry,stun?'head':'chest',entry.point);const radius=(stun?.28:.6)*scale;
    for(let i=0;i<3;i++){const mesh=entry.orbitals[i],angle=this.time*(stun?3:1.4)+i*Math.PI*2/3;this.configure(mesh,stun?iconTexture('stun'):vfxTextures.flare_01,orbital.type.color,.85);mesh.position.copy(entry.point).add(new THREE.Vector3(Math.cos(angle)*radius,stun?.2*scale:Math.sin(angle*2)*.12*scale,Math.sin(angle)*radius));mesh.scale.setScalar((stun?.12:.12)*scale);}
   }
  }
 }
}
