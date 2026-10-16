(async () => {
  const w = __world, p = __player, checks = [];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const check = (label, passed, detail) => checks.push({ label, passed: !!passed, detail });
  const canvas = document.querySelector('canvas');
  try {
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'soldier');
    for (const [code, move] of [['Mouse0', 'punch'], ['Mouse2', 'heavy'], ['Digit1', 'kick'], ['Digit2', 'skill1'], ['Digit3', 'skill2']]) {
      w.match.practice(); __ai.enabled = false; await wait(100);
      if (code.startsWith('Mouse')) {
        canvas.dispatchEvent(new MouseEvent('mousedown', { button: Number(code.slice(5)), bubbles: true }));
        await wait(100); window.dispatchEvent(new MouseEvent('mouseup', { button: Number(code.slice(5)), bubbles: true }));
      } else {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        await wait(100); window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      }
      check(code + ' triggers ' + move, p.moveId === move && p.state === 'attack', { moveId: p.moveId, state: p.state });
      const label = { punch: 'LMB', heavy: 'RMB', kick: '1', skill1: '2', skill2: '3' }[move];
      check(code + ' matches HUD label', document.getElementById('ability-' + move).textContent.startsWith(label));
    }
    check('no runtime error overlay', !document.getElementById('errmsg').textContent);
    return { passed: checks.every(c => c.passed), checks };
  } finally {
    if (document.pointerLockElement) document.exitPointerLock();
    w.setPaused(false); w.match.toLobby(); w.selectFighter('player', 'capoeira');
  }
})()
