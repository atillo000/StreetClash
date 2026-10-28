// Source-only name normalization. Shared runtime characters are never renamed.
const quaternius={root:'Root',defhips:'Hips',defspine001:'Spine',defspine002:'Spine1',defspine003:'Spine2',defneck:'Neck',defhead:'Head'};
for(const [suffix,side]of [['l','Left'],['r','Right']]){
 for(const [source,target]of Object.entries({shoulder:'Shoulder',upperarm:'Arm',forearm:'ForeArm',hand:'Hand',thigh:'UpLeg',shin:'Leg',foot:'Foot',toe:'ToeBase'}))quaternius['def'+source+suffix]=side+target;
 for(const[source,target]of Object.entries({findex:'Index',fmiddle:'Middle',fring:'Ring',fpinky:'Pinky',thumb:'Thumb'}))for(let i=1;i<=3;i++)quaternius['def'+source+'0'+i+suffix]=side+'Hand'+target+i;
}
export function normalizeSourceRig(root,{quaterniusRig=false}={}){
 const renamed=new Map();root.traverse(node=>{if(!node.isBone)return;const original=node.name;let name=original;
  if(quaterniusRig){const short=original.replace(/[^a-z0-9]/gi,'').toLowerCase();const match=quaternius[short];if(!match)return;name=match==='Root'?'Root':'mixamorig'+match;}
  else if(!name.startsWith('mixamorig')&&!['root','Root'].includes(name))name='mixamorig'+name;
  renamed.set(original,name);node.name=name;
 });
 for(const clip of root.animations||[])for(const track of clip.tracks){const dot=track.name.lastIndexOf('.'),name=track.name.slice(0,dot);if(renamed.has(name))track.name=renamed.get(name)+track.name.slice(dot);}
 return renamed;
}
