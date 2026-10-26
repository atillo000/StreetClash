import * as THREE from 'three';

import { AttachedStatusVisuals, statusIcon, statusVisual } from './StatusVisuals.js';
import { barrierMaterial, vfxTextures } from '../combat/TexturedVFX.js';

// Defense is a continuous textured energy membrane. Other statuses use small
// wisps, not shields: an attack/speed buff must not imply damage protection.
function makeStatusOrbit(scene,positive){
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),barrierMaterial());
  shell.name=positive?'Protective energy barrier':'Debuff mist';shell.visible=false;scene.add(shell);
  const panels=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.4,toneMapped:false,depthWrite:false,blending:THREE.AdditiveBlending}),3);
  panels.name=positive?'Buff light wisps':'Debuff smoke wisps';panels.visible=false;panels.frustumCulled=false;panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(panels);
  return{shell,panels};
}


export class StatusPresentation{
  constructor(scene,combatants){
    this.dummy=new THREE.Object3D();this.attached=new AttachedStatusVisuals(scene,combatants);
    this.time=0;this.entries=combatants.map((c,i)=>{
      const meshes=[true,false].map(positive=>{
        const geometry=new THREE.PlaneGeometry(1.7,1.7).rotateX(-Math.PI/2);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));
        mesh.visible=false;mesh.name=positive?'Buff aura':'Debuff aura';scene.add(mesh);return mesh;
      });
      const list=document.createElement('div');list.className='status-list';list.setAttribute('aria-label',i===0?'Your active effects':'Enemy active effects');
      if(i<2)document.getElementById(i===0?'barP':'barE').appendChild(list);
      const orbits=[makeStatusOrbit(scene,true),makeStatusOrbit(scene,false)];
      const guard=new THREE.Mesh(new THREE.SphereGeometry(1,32,18,0,Math.PI,.15,Math.PI-.3),barrierMaterial());guard.visible=false;guard.name='Forward guard energy barrier';scene.add(guard);
      return{c,meshes,orbits,guard,list,chips:new Map()};
    });
  }
  setBudget(count){this.attached.setBudget(count);}
  updateHud(){
    for(const entry of this.entries){
      const active=entry.c.statuses.entries;
      for(const[id,chip]of entry.chips)if(!active.has(id)){chip.remove();entry.chips.delete(id);}
      for(const[id,e]of active){
        let chip=entry.chips.get(id);
        if(!chip){chip=document.createElement('span');chip.className='status-chip';chip.innerHTML='<span class="status-symbol">'+statusIcon(statusVisual(e).icon)+'</span><span class="status-label"></span><small></small><i class="status-time"></i>';entry.chips.set(id,chip);entry.list.appendChild(chip);}
        chip.className='status-chip '+(e.type.positive?'buff':'debuff')+(e.empowered?' empowered':'')+(e.type.shield?' shield':'');
        chip.children[1].textContent=e.type.label;chip.children[2].textContent=(e.type.shield?Math.ceil(e.shield)+' HP / ':'')+Math.max(.1,e.remaining).toFixed(1)+'s';
        chip.style.setProperty('--status-color','#'+new THREE.Color(e.type.color).getHexString());chip.children[3].style.width=(100*Math.min(1,e.remaining/e.duration))+'%';
        chip.title=e.type.description;chip.setAttribute('aria-label',chip.textContent+'. '+e.type.description);
      }
    }
    const feedback=document.getElementById('combatFeedback'),panel=document.getElementById('barP');const layoutKey=innerWidth+':'+innerHeight+':'+[...this.entries[0].chips.keys()].join(',');if(feedback&&panel&&layoutKey!==this.layoutKey){this.layoutKey=layoutKey;feedback.style.setProperty('--notice-top',(panel.getBoundingClientRect().bottom+8)+'px');}
  }

  render(dt,active,camera){
    this.time+=dt;this.attached.render(dt,active,camera);
    for(const entry of this.entries){
      const {c,guard}=entry;guard.visible=active&&c.alive&&!c.inactive&&c.state==='block';
      if(guard.visible){
        guard.position.copy(c.position);guard.position.y+=c.height*.5;guard.rotation.y=c.mover.facing;
        guard.scale.set(c.radius*2.1,c.height*.53,c.radius*1.8);
        const u=guard.material.uniforms;u.uSmoke.value=vfxTextures.smoke_04;u.uTime.value=this.time;u.uColor.value.set(c.profile.id==='paladin'?0xffda87:0x8dcfff);u.uOpacity.value=.8;u.uProgress.value=0;
      }
    }
    for(const{c,meshes,orbits}of this.entries)for(let i=0;i<2;i++){
      const effects=[...c.statuses.entries.values()].filter(e=>e.type.positive===(i===0));
      const mesh=meshes[i];mesh.visible=active&&c.alive&&!c.inactive&&effects.length>0;
      const {shell,panels}=orbits[i];panels.visible=false;
      shell.visible=mesh.visible&&i===0&&effects.some(e=>(e.type.defense??1)<1||(e.type.knockTaken??1)<1||(e.shield||0)>0);
      if(!mesh.visible)continue;
      const color=(effects.find(e=>e.shield>0)||effects[0]).type.color;
      shell.position.copy(c.position);shell.position.y+=c.height*.5;
      shell.scale.set(c.radius*(i===0?1.85:2.1),c.height*.56,c.radius*(i===0?1.85:2.1));
      shell.material.uniforms.uColor.value.set(color);shell.material.uniforms.uTime.value=this.time;shell.material.uniforms.uSmoke.value=vfxTextures.smoke_04;shell.material.uniforms.uOpacity.value=.48;
      panels.position.copy(c.position);panels.material.color.set(color);
      const map=i===0?vfxTextures.flare_01:vfxTextures.smoke_04;if(panels.material.map!==map){panels.material.map=map;panels.material.needsUpdate=true;}
      for(let n=0;n<3;n++){
        const theta=this.time*(i===0?.85:-1.05)+n*Math.PI*2/3,radius=c.radius*(i===0?2.05:2.45);
        this.dummy.position.set(Math.cos(theta)*radius,c.height*(.48+.08*Math.sin(theta*2)),Math.sin(theta)*radius);
        if(camera)this.dummy.quaternion.copy(camera.quaternion);this.dummy.rotateZ(theta*.3);
        this.dummy.scale.setScalar((i===0?.22:.48)*(c.height/1.8));this.dummy.updateMatrix();panels.setMatrixAt(n,this.dummy.matrix);
      }
      panels.instanceMatrix.needsUpdate=true;
      mesh.position.set(c.position.x,(c.world.arena.groundHeight?.(c.position.x,c.position.z)??0)+.026+i*.007,c.position.z);
      mesh.scale.setScalar((c.radius/.38)*(1+i*.18));mesh.rotation.y=this.time*(i===0?.45:-.8);
      if(mesh.material.map!==vfxTextures.twirl_01){mesh.material.map=vfxTextures.twirl_01;mesh.material.needsUpdate=true;}
      mesh.material.color.set(effects[0].type.color);mesh.material.opacity=.38+Math.sin(this.time*5)*.1;
    }
  }
}
