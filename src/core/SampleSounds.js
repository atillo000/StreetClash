// CC0 Kenney Impact Sounds. Fetch once; decode after the browser's audio unlock.
// Synthesized cues remain the fallback while samples load or if loading fails.
const variants=(stem,n=3)=>Array.from({length:n},(_,i)=>stem+'_'+String(i).padStart(3,'0')+'.ogg');
const FILES={hit:variants('impactPunch_medium'),heavy:variants('impactPunch_heavy'),block:variants('impactMetal_light'),stone:variants('impactMining'),wood:variants('impactWood_heavy'),metal:variants('impactMetal_heavy'),step:variants('footstep_concrete')};
export class SampleSounds {
  constructor(){this.buffers=new Map();this.sequence=0;this.loading=null;this.failed=[];}
  load(context){
    if(this.loading)return this.loading;
    this.loading=Promise.all(Object.entries(FILES).map(async([kind,files])=>{
      const buffers=[];for(const file of files){try{const r=await fetch('assets/audio/kenney-impact/'+file);if(!r.ok)throw Error(r.status);buffers.push(await context.decodeAudioData(await r.arrayBuffer()));}catch{this.failed.push(file);}}
      if(buffers.length)this.buffers.set(kind,buffers);
    }));return this.loading;
  }
  play(sound,kind,{volume=1,pan=0,intensity=1}={}) {
    const key=kind==='critical'?'heavy':kind==='land'?'stone':kind;
    const bank=this.buffers.get(key),ctx=sound.context;
    if(!bank?.length||ctx?.state!=='running'||sound.muted||sound.voices>=sound.maxVoices)return false;
    const now=ctx.currentTime,gate=kind==='step'?.075:.025;if(now-(sound.last.get(kind)??-1)<gate)return true;
    sound.last.set(kind,now);sound.voices++;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),stereo=ctx.createStereoPanner();
    source.buffer=bank[this.sequence++%bank.length];source.playbackRate.value=(kind==='critical'?.88:1)*(.97+(this.sequence%5)*.015);
    gain.gain.value=(kind==='step'?.35:kind==='block'?.48:.65)*Math.min(1.3,Math.max(0,volume))*Math.min(1.3,Math.max(.2,intensity));
    stereo.pan.value=Math.max(-1,Math.min(1,pan));source.connect(gain);gain.connect(stereo);stereo.connect(sound.master);source.start();
    source.onended=()=>{source.disconnect();gain.disconnect();stereo.disconnect();sound.voices=Math.max(0,sound.voices-1);};return true;
  }
}
