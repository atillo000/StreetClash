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
    const rifle = kind === 'rifle', magic = kind === 'magic', charge = kind === 'charge';
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
