// Synthesized prototype cues: no external audio assets or dependencies.
export class Sound {
  constructor() { this.context = null; this.muted = false; this.last = -1; }

  unlock() {
    if (this.muted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio is optional on unsupported devices. */ }
  }

  play(kind) {
    const ctx = this.context;
    if (this.muted || ctx?.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - this.last < 0.035) return;
    this.last = now;
    const heavy = kind === 'heavy'||kind==='critical', block = kind === 'block', swoosh = kind === 'swing' || kind === 'dodge';
    const rifle = kind === 'rifle', magic = kind === 'magic', charge = kind === 'charge';
    // Short filtered-noise transient adds air/crackle to the tonal cue.
    if(['heavy','critical','hit','rifle','fire','electric','swing'].includes(kind)){
      if(!this.noise){this.noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.3),ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=ctx.createGain();source.buffer=this.noise;filter.type=kind==='swing'?'highpass':'bandpass';filter.frequency.value=kind==='electric'?2400:kind==='rifle'?3200:heavy?250:900;filter.Q.value=.7;
      volume.gain.setValueAtTime(kind==='swing'?.035:heavy?.12:.055,now);volume.gain.exponentialRampToValueAtTime(.001,now+(heavy?.2:.12));source.connect(filter);filter.connect(volume);volume.connect(ctx.destination);source.start(now);source.stop(now+.25);source.onended=()=>{source.disconnect();filter.disconnect();volume.disconnect();};
    }
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = rifle ? 'square' : magic || block ? 'triangle' : swoosh || charge ? 'sine' : 'sawtooth';
    oscillator.frequency.setValueAtTime(rifle ? 900 : magic ? 620 : charge ? 180 : block ? 720 : heavy ? 120 : swoosh ? 350 : 210, now);
    oscillator.frequency.exponentialRampToValueAtTime(charge ? 520 : magic ? 210 : block ? 300 : 35, now + 0.12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(swoosh ? 0.035 : 0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.2 : 0.12));
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(now); oscillator.stop(now + 0.22);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
