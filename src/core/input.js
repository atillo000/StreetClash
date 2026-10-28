// Keyboard + mouse input. Uses physical key codes so it works on any keyboard layout.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedSet = new Set();   // keys/buttons that went down this frame
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.canvas = canvas;
    this.combatEnabled = false;

    window.addEventListener('keydown', e => {
      if(e.target.closest?.('input,textarea,select,button,summary,[contenteditable],.hero-stage,#hudOptions'))return;
      if(this.combatEnabled&&e.ctrlKey&&['KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
      if (['Space', 'Tab', 'F1', 'KeyX', 'KeyC', 'KeyZ', 'Digit1', 'Digit2', 'Digit3', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedSet.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
    document.addEventListener('pointerlockchange', () => { if (!this.locked) this.clear(); });

    // The first gameplay click both captures the mouse and attacks.
    canvas.addEventListener('mousedown', e => {
      if (!this.combatEnabled || ![0, 2].includes(e.button)) return;
      if (!this.locked) canvas.requestPointerLock?.()?.catch(() => {});
      const code = 'Mouse' + e.button;
      this.pressedSet.add(code); this.keys.add(code);
    });
    window.addEventListener('mouseup', e => this.keys.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement === canvas) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.wheel += Math.sign(e.deltaY);
    }, { passive: false });
  }

  get locked() { return document.pointerLockElement === this.canvas; }
  down(code) { return this.keys.has(code); }
  pressed(code) { return this.pressedSet.has(code); }
  endFrame() { this.pressedSet.clear(); }
  clear() { this.keys.clear(); this.pressedSet.clear(); this.mouseDX = this.mouseDY = this.wheel = 0; }

  // x: right(+)/left(-), y: forward(+)/back(-)
  moveAxis() {
    let x = 0, y = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  get walkModifier() { return this.down('ControlLeft') || this.down('ControlRight'); }
  get sprintModifier() { return !this.walkModifier&&(this.down('ShiftLeft') || this.down('ShiftRight')); }

  // Returns and clears accumulated look/zoom input for this frame.
  consumeLook() {
    const out = { dx: this.mouseDX, dy: this.mouseDY, wheel: this.wheel };
    this.mouseDX = this.mouseDY = this.wheel = 0;
    return out;
  }
}
