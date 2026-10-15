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
    const heavy = kind === 'heavy', block = kind === 'block', swoosh = kind === 'swing' || kind === 'dodge';
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = block ? 'triangle' : swoosh ? 'sine' : 'sawtooth';
    oscillator.frequency.setValueAtTime(block ? 720 : heavy ? 120 : swoosh ? 350 : 210, now);
    oscillator.frequency.exponentialRampToValueAtTime(block ? 300 : 35, now + 0.12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(swoosh ? 0.035 : 0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.2 : 0.12));
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.start(now); oscillator.stop(now + 0.22);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
