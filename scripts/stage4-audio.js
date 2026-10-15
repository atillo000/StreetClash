(async () => {
  const sound = __world.sound, ctx = sound.context;
  if (!ctx) return { passed: false, reason: 'Run browser-check with --gesture to unlock audio' };
  let started = 0;
  const create = ctx.createOscillator.bind(ctx);
  ctx.createOscillator = () => {
    const oscillator = create(), start = oscillator.start.bind(oscillator);
    oscillator.start = (...args) => { started++; return start(...args); };
    return oscillator;
  };
  try {
    sound.muted = false;
    for (const cue of ['hit', 'heavy', 'block', 'swing', 'dodge']) {
      await new Promise(resolve => setTimeout(resolve, 250)); sound.play(cue);
    }
    sound.muted = true;
    await new Promise(resolve => setTimeout(resolve, 250)); sound.play('hit');
    return { passed: ctx.state === 'running' && started === 5, state: ctx.state, cuesStarted: started, mutedCueSuppressed: started === 5 };
  } finally { ctx.createOscillator = create; sound.muted = false; }
})()
