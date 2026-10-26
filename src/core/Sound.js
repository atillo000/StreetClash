// Layered Web Audio cues with reusable noise, per-cue cooldowns and bounded
// polyphony. Short attacks and impacts can coexist instead of muting each other.
const PRESETS={
 intent:{tone:320,end:180,noise:1800,level:.018,life:.035},
 hit:{tone:145,end:48,noise:950,level:.14,life:.13},heavy:{tone:90,end:27,noise:420,level:.23,life:.23},critical:{tone:125,end:38,noise:1650,level:.23,life:.24,ring:980},
 block:{tone:760,end:330,noise:2900,level:.11,life:.16,ring:1280},swing:{tone:280,end:60,noise:1800,level:.045,life:.14,high:true},dodge:{tone:200,end:65,noise:1200,level:.04,life:.18,high:true},
 rifle:{tone:155,end:45,noise:3100,level:.18,life:.13},magic:{tone:540,end:180,noise:1500,level:.09,life:.23,ring:1080},charge:{tone:160,end:620,noise:900,level:.035,life:.22,ring:320},
 fire:{tone:115,end:42,noise:650,level:.09,life:.2},electric:{tone:470,end:95,noise:2700,level:.12,life:.16,ring:1400},step:{tone:70,end:35,noise:550,level:.045,life:.065},land:{tone:88,end:30,noise:400,level:.15,life:.16},heal:{tone:480,end:760,noise:1400,level:.04,life:.18,ring:960}
};
export class Sound{
 constructor(){this.context=null;this.muted=false;this.last=new Map();this.voices=0;this.maxVoices=16;this.sequence=0;}
 unlock(){if(this.muted)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!this.context){const ctx=this.context=new Audio({latencyHint:'interactive'});this.master=ctx.createGain();this.master.gain.value=.65;this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-15;this.compressor.ratio.value=5;this.master.connect(this.compressor);this.compressor.connect(ctx.destination);this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{}}
 play(kind,{volume=1,pan=0,intensity=1}={}){const ctx=this.context;if(this.muted||ctx?.state!=='running'||this.voices>=this.maxVoices)return false;const p=PRESETS[kind]||PRESETS.hit,t=ctx.currentTime,gate=kind==='step'?.075:kind==='swing'?.025:.018;if(t-(this.last.get(kind)??-1)<gate)return false;this.last.set(kind,t);this.voices++;
  const variation=.94+(this.sequence++%7)*.02,life=p.life,amp=p.level*Math.min(1.3,Math.max(0,volume))*Math.min(1.3,Math.max(.2,intensity));
  const out=ctx.createGain(),stereo=ctx.createStereoPanner();out.gain.setValueAtTime(amp,t);out.gain.exponentialRampToValueAtTime(.0001,t+life);stereo.pan.value=Math.max(-1,Math.min(1,pan));out.connect(stereo);stereo.connect(this.master);
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();noise.buffer=this.noise;filter.type=p.high?'highpass':'bandpass';filter.frequency.value=p.noise*variation;filter.Q.value=.7;noise.connect(filter);filter.connect(out);noise.start(t,(this.sequence%5)*.015);noise.stop(t+life);
  const tone=ctx.createOscillator(),toneGain=ctx.createGain();tone.type=['magic','charge','block','heal'].includes(kind)?'sine':'triangle';tone.frequency.setValueAtTime(p.tone*variation,t);tone.frequency.exponentialRampToValueAtTime(p.end*variation,t+life);toneGain.gain.value=p.high?.12:.55;tone.connect(toneGain);toneGain.connect(out);tone.start(t);tone.stop(t+life);
  let ring,ringGain;if(p.ring){ring=ctx.createOscillator();ringGain=ctx.createGain();ring.type='sine';ring.frequency.value=p.ring*variation;ringGain.gain.value=.15;ring.connect(ringGain);ringGain.connect(out);ring.start(t);ring.stop(t+life);}
  noise.onended=()=>{for(const node of [noise,filter,tone,toneGain,ring,ringGain,out,stereo])node?.disconnect();this.voices=Math.max(0,this.voices-1);};return true;
 }
}
