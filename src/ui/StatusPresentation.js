import * as THREE from 'three';

// Persistent, lightweight energy shell. The stronger brief hit/block flash is
// still owned by ArcadeVFX; these softer surfaces indicate ongoing statuses.
const auraVertex=`varying vec2 vUv;varying vec3 vN;varying vec3 vV;
void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const auraFragment=`varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform vec3 uColor;uniform float uTime;uniform float uPositive;
void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);
float wave=pow(.5+.5*cos(vUv.y*42.0-uTime*3.0+sin(vUv.x*36.0)*(1.0-uPositive)),16.0);
float gaps=uPositive>.5?1.0:step(.25,fract(vUv.x*12.0+uTime*.1));
float a=(rim*.25+wave*.055)*gaps;if(a<.008)discard;gl_FragColor=vec4(uColor,a);}`;
function makeStatusOrbit(scene,positive){
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.ShaderMaterial({vertexShader:auraVertex,fragmentShader:auraFragment,
    uniforms:{uColor:{value:new THREE.Color()},uTime:{value:0},uPositive:{value:positive?1:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}));
  shell.name=positive?'Persistent buff shell':'Persistent debuff shell';shell.visible=false;scene.add(shell);
  const shape=new THREE.Shape();shape.moveTo(0,.19);shape.lineTo(.14,.11);shape.lineTo(.11,-.08);shape.lineTo(0,-.2);shape.lineTo(-.11,-.08);shape.lineTo(-.14,.11);shape.closePath();
  const shard=new THREE.Shape();shard.moveTo(.025,.21);shard.lineTo(-.09,.015);shard.lineTo(-.015,-.02);shard.lineTo(-.035,-.21);shard.lineTo(.09,.02);shard.lineTo(.015,.04);shard.closePath();
  const geometry=new THREE.ShapeGeometry(positive?shape:shard);
  const panels=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:positive?.3:.38,toneMapped:false,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),3);
  panels.name=positive?'Orbiting buff shields':'Orbiting debuff shards';panels.visible=false;panels.frustumCulled=false;panels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(panels);
  return{shell,panels};
}


export class StatusPresentation{
  constructor(scene,combatants){
    this.dummy=new THREE.Object3D();
    this.time=0;this.entries=combatants.map((c,i)=>{
      const meshes=[true,false].map(positive=>{
        const geometry=new THREE.RingGeometry(.65,.7,48,1,0,positive?Math.PI*2:Math.PI*1.55).rotateX(-Math.PI/2);
        const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));
        mesh.visible=false;mesh.name=positive?'Buff aura':'Debuff aura';scene.add(mesh);return mesh;
      });
      const list=document.createElement('div');list.className='status-list';list.setAttribute('aria-label',i===0?'Your active effects':'Enemy active effects');
      if(i<2)document.getElementById(i===0?'barP':'barE').appendChild(list);
      const orbits=[makeStatusOrbit(scene,true),makeStatusOrbit(scene,false)];
      return{c,meshes,orbits,list,chips:new Map()};
    });
  }
  updateHud(){
    for(const entry of this.entries){
      const active=entry.c.statuses.entries;
      for(const[id,chip]of entry.chips)if(!active.has(id)){chip.remove();entry.chips.delete(id);}
      for(const[id,e]of active){
        let chip=entry.chips.get(id);
        if(!chip){chip=document.createElement('span');chip.className='status-chip '+(e.type.positive?'buff':'debuff');entry.chips.set(id,chip);entry.list.appendChild(chip);}
        chip.textContent=`${e.type.positive?'+':'−'} ${e.type.label} ${Math.max(.1,e.remaining).toFixed(1)}s`;
        chip.title=e.type.description;chip.setAttribute('aria-label',chip.textContent+'. '+e.type.description);
      }
    }
  }
  render(dt,active){
    this.time+=dt;
    for(const{c,meshes,orbits}of this.entries)for(let i=0;i<2;i++){
      const effects=[...c.statuses.entries.values()].filter(e=>e.type.positive===(i===0));
      const mesh=meshes[i];mesh.visible=active&&c.alive&&effects.length>0;
      const {shell,panels}=orbits[i];shell.visible=panels.visible=mesh.visible;
      if(!mesh.visible)continue;
      const color=effects[0].type.color;
      shell.position.copy(c.position);shell.position.y+=c.height*.5;
      shell.scale.set(c.radius*(i===0?1.85:2.1),c.height*.56,c.radius*(i===0?1.85:2.1));
      shell.material.uniforms.uColor.value.set(color);shell.material.uniforms.uTime.value=this.time;
      panels.position.copy(c.position);panels.material.color.set(color);
      for(let n=0;n<3;n++){
        const theta=this.time*(i===0?.85:-1.05)+n*Math.PI*2/3,radius=c.radius*(i===0?2.05:2.45);
        this.dummy.position.set(Math.cos(theta)*radius,c.height*(.48+.08*Math.sin(theta*2)),Math.sin(theta)*radius);
        this.dummy.rotation.set(i===0?0:theta,Math.PI/2-theta,i===0?0:theta*.5);
        this.dummy.scale.setScalar(i===0?1.2:1);this.dummy.updateMatrix();panels.setMatrixAt(n,this.dummy.matrix);
      }
      panels.instanceMatrix.needsUpdate=true;
      mesh.position.set(c.position.x,(c.world.arena.groundHeight?.(c.position.x,c.position.z)??0)+.026+i*.007,c.position.z);
      mesh.scale.setScalar((c.radius/.38)*(1+i*.18));mesh.rotation.y=this.time*(i===0?.45:-.8);
      mesh.material.color.set(effects[0].type.color);mesh.material.opacity=.38+Math.sin(this.time*5)*.1;
    }
  }
}
