import * as THREE from 'three';
import { FootContact } from '../animation/FootContact.js';

// Shared character wrapper: owns the model, an AnimationMixer, a speed-driven locomotion
// blend (idle/walk/run) and an "action" layer (attacks, hits, block, roll...) that fades in
// over locomotion and fades back out when finished.
export class Character {
  // modelYaw: number (radians) or 'auto' (works out which way the model faces from its feet).
  constructor(gltf, { scale = 1, modelYaw = 'auto', gaitCalibration = null } = {}) {
    this.root = new THREE.Group();   // the pivot we move/rotate in the world; +Z is "forward"
    this.model = gltf.scene;
    this.model.scale.setScalar(scale);
    this.root.add(this.model);
    const materialCopies = new Map();
    this.model.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
      if (o.isMesh) {
        const copy = m => { if (!materialCopies.has(m)) materialCopies.set(m, m.clone()); return materialCopies.get(m); };
        o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
      }
    });
    this.model.rotation.y = modelYaw === 'auto' ? this._detectYaw() : modelYaw;
    this.feet = new FootContact(this.model);
    this.grounded = true;
    this.gaitCalibration = gaitCalibration; this.gaitPhase = 0; this.groundSpeed = 0;

    this.gltf = gltf;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));

    this.loco = null;
    this.locoGain = 1;      // 1 = locomotion fully visible, 0 = an action is covering it
    this.locoFade = 0.2;
    this.action = null;     // currently playing action layer clip
    this.actionName = null;
  }

  // The toes point forward in the bind pose, so use foot -> toe to find where the model faces.
  _detectYaw() {
    this.root.updateMatrixWorld(true);
    const foot = this.model.getObjectByName('mixamorigLeftFoot');
    const toe = this.model.getObjectByName('mixamorigLeftToeBase');
    if (!foot || !toe) return 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    foot.getWorldPosition(a); toe.getWorldPosition(b);
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.hypot(dx, dz) < 1e-5) return 0;
    return -Math.atan2(dx, dz);
  }

  bone(name) { return this.model.getObjectByName(name); }
  clipNames() { return [...this.actions.keys()]; }
  hasClip(name) { return this.actions.has(name); }

  // Register (or replace) clips by their name.
  addClips(clips) {
    for (const clip of clips) {
      const old = this.actions.get(clip.name);
      if (old) { old.stop(); this.mixer.uncacheAction(old.getClip(), this.model); }
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
  }

  // ---- Locomotion layer -------------------------------------------------
  startLocomotion({ idle = 'Idle', walk = 'Walk', run = 'Run', walkSpeed = 1.7, runSpeed = 4.8, lockSpeed = 2.8, sprintSpeed = 6, crouchSpeed = 1, gaitRate = 1 } = {}) {
    this.gaitPhase = 0; this.feet.offset = 0; this.model.position.y = this.feet.baseY;
    this.locomotionOptions = { idle, walk, run, walkSpeed, runSpeed, lockSpeed, sprintSpeed, crouchSpeed, gaitRate };
    const find = n => this.actions.get(n) ||
      [...this.actions].find(([k]) => k.toLowerCase() === n.toLowerCase())?.[1];
    const a = { idle: find(idle), walk: find(walk), run: find(run) };
    if (!a.idle || !a.walk || !a.run) { console.warn('Locomotion clips missing'); return; }
    for (const name of ['StrafeLeftWalk', 'StrafeRightWalk', 'StrafeLeftRun', 'StrafeRightRun', 'BackWalk', 'BackRun', 'TurnLeft', 'TurnRight',
      'AimIdle','CombatWalk','CombatRun','Sprint','ForwardLeftWalk','ForwardRightWalk','BackLeftWalk','BackRightWalk',
      'ForwardLeftRun','ForwardRightRun','BackLeftRun','BackRightRun', 'CrouchIdle','CrouchWalk','CrouchBack','CrouchLeft','CrouchRight',
      'CrouchForwardLeft','CrouchForwardRight','CrouchBackLeft','CrouchBackRight']) {
      const act = find(name);
      if (act) a[name] = act;
    }
    for (const act of Object.values(a)) {
      act.reset(); act.setLoop(THREE.LoopRepeat, Infinity); act.setEffectiveWeight(0); act.play();
    }
    a.idle.setEffectiveWeight(1);
    this.loco = { a, w: Object.fromEntries(Object.keys(a).map(k => [k, k === 'idle' ? 1 : 0])), walkSpeed, runSpeed, lockSpeed, sprintSpeed, crouchSpeed };
    this.previousSpeed = 0; this.previousCrouch = false; this.idleTime = 0;
  }

  locomote(speed, dt, { locked = false, side = 0, forward = 1, turn = 0, crouching = false } = {}) {
    const L = this.loco;
    if (!L) return;
    this.groundSpeed = crouching ? 0 : speed;
    const { a, w, walkSpeed, runSpeed, lockSpeed, sprintSpeed, crouchSpeed } = L;

    const transient = name => {
      if (!this.hasClip(name)) return;
      this.playAction(name, { fade: 0.1, timeScale: name === 'IdleFidget' ? 1 : 2.5 }); this.autoAction = true;
    };
    if (this.autoAction && speed > 0.1 && this.actionName === 'IdleFidget') this.endAction(0.12);
    if (this.autoAction && ((this.actionName === 'MoveStop' && speed > 0.1) || (this.actionName === 'MoveStart' && speed < 0.05))) this.endAction(0.1);
    if (!this.action) {
      if (crouching !== this.previousCrouch) transient(crouching ? 'CrouchStart' : 'CrouchEnd');
      else if (!locked && !crouching && speed > 0.1 && this.previousSpeed <= 0.1) transient('MoveStart');
      else if (!locked && !crouching && speed <= 0.05 && this.previousSpeed > 0.05) transient('MoveStop');
      else if (this.idleTime > 8 && !locked && !crouching) { transient('IdleFidget'); this.idleTime = 0; }
    }
    this.idleTime = speed > 0.05 ? 0 : this.idleTime + dt;
    this.previousSpeed = speed; this.previousCrouch = crouching;

    // Locomotion fades out while an action plays, and back in afterwards.
    const goal = this.action ? 0 : 1;
    const step = dt / Math.max(0.05, this.locoFade);
    this.locoGain += THREE.MathUtils.clamp(goal - this.locoGain, -step, step);

    let t = { idle: 0, walk: 0, run: 0 };
    if (speed < 0.05) t.idle = 1;
    else if (speed < walkSpeed) { const k = speed / walkSpeed; t.idle = 1 - k; t.walk = k; }
    else if (speed < runSpeed) { const k = (speed - walkSpeed) / (runSpeed - walkSpeed); t.walk = 1 - k; t.run = k; }
    else t.run = 1;
    if (a.Sprint && speed > runSpeed) { const fast = THREE.MathUtils.clamp((speed - runSpeed) / (sprintSpeed - runSpeed), 0, 1); t.run = 1 - fast; t.Sprint = fast; }

    // Native clip labels use anatomical left/right; local +X is anatomical left.
    const directional = (amount, names) => {
      const nativeSide = -side;
      if (names.every(name => a[name])) {
        const sector = ((Math.atan2(nativeSide, forward) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4);
        const index = Math.floor(sector) % 8, k = sector - Math.floor(sector);
        t[names[index]] = (t[names[index]] || 0) + amount * (1 - k);
        t[names[(index + 1) % 8]] = (t[names[(index + 1) % 8]] || 0) + amount * k;
      } else {
        const total = Math.abs(side) + Math.abs(forward) || 1;
        const lateral = names[nativeSide >= 0 ? 2 : 6], longitudinal = names[forward >= 0 ? 0 : 4];
        t[lateral] = (t[lateral] || 0) + amount * Math.abs(side) / total;
        t[longitudinal] = (t[longitudinal] || 0) + amount * Math.abs(forward) / total;
      }
    };

    if (locked && speed > 0.05 && a.StrafeLeftWalk && a.BackWalk) {
      const moving = 1 - t.idle;
      const fast = THREE.MathUtils.clamp((speed - walkSpeed) / Math.max(0.1, lockSpeed - walkSpeed), 0, 1);
      t.walk = 0; t.run = 0;
      directional(moving * (1 - fast), [a.CombatWalk ? 'CombatWalk' : 'walk', 'ForwardRightWalk','StrafeRightWalk','BackRightWalk','BackWalk','BackLeftWalk','StrafeLeftWalk','ForwardLeftWalk']);
      directional(moving * fast, [a.CombatRun ? 'CombatRun' : 'run', 'ForwardRightRun','StrafeRightRun','BackRightRun','BackRun','BackLeftRun','StrafeLeftRun','ForwardLeftRun']);
    }
    if (locked && a.AimIdle) { t.AimIdle = t.idle; t.idle = 0; }
    if (crouching && a.CrouchIdle) {
      t = { CrouchIdle: 1 };
      if (speed > 0.05) {
        const moving = Math.min(1, speed / crouchSpeed); t.CrouchIdle = 1 - moving;
        directional(moving, ['CrouchWalk','CrouchForwardRight','CrouchRight','CrouchBackRight','CrouchBack','CrouchBackLeft','CrouchLeft','CrouchForwardLeft']);
      }
    }
    if (!crouching && speed < 0.05 && Math.abs(turn) > 0.5 && a.TurnLeft && a.TurnRight) {
      const amount = Math.min(0.85, Math.abs(turn) / 8);
      t[locked && a.AimIdle ? 'AimIdle' : 'idle'] = 1 - amount;
      // Positive yaw turns the fighter toward its local right.
      t[turn > 0 ? 'TurnRight' : 'TurnLeft'] = amount;
    }

    const s = 1 - Math.exp(-12 * dt);
    for (const k of Object.keys(a)) {
      w[k] += ((t[k] || 0) - w[k]) * s;
      a[k].setEffectiveWeight(w[k] * this.locoGain);
    }

    a.walk.timeScale = THREE.MathUtils.clamp(speed / walkSpeed, 0.5, 1.25);
    a.run.timeScale = THREE.MathUtils.clamp(speed / runSpeed, 0.8, 1.2);

    // Keep one continuous gait phase. Reassigning run.time from walk.time each
    // frame made full-speed running inherit the slower walk cadence during fades.
    const walkDuration = a.walk.getClip().duration;
    const runDuration = a.run.getClip().duration;
    const movingWeight = w.walk + w.run;
    const runMix = locked ? THREE.MathUtils.clamp((speed - walkSpeed) / Math.max(0.1, lockSpeed - walkSpeed), 0, 1) : movingWeight > 0 ? w.run / movingWeight : 0;
    const cyclesPerSecond = THREE.MathUtils.lerp(a.walk.timeScale / walkDuration, a.run.timeScale / runDuration, runMix) * this.locomotionOptions.gaitRate;
    a.walk.timeScale = cyclesPerSecond * walkDuration;
    a.run.timeScale = cyclesPerSecond * runDuration;
    for (const [name, act] of Object.entries(a)) {
      if (name.startsWith('Turn')) act.timeScale = 2.5;
      else if (name.startsWith('Crouch')) act.timeScale = name === 'CrouchIdle' ? 1 : THREE.MathUtils.clamp(speed / crouchSpeed, 0.5, 1.3);
      else if (name === 'Sprint') act.timeScale = THREE.MathUtils.clamp(speed / sprintSpeed, 0.6, 1.2) * this.locomotionOptions.gaitRate;
      else if (!['idle', 'walk', 'run', 'AimIdle'].includes(name)) act.timeScale = cyclesPerSecond * act.getClip().duration;
    }
    if (this.gaitCalibration) {
      const entries = Object.entries(a).map(([name, act]) => ({ name, act,
        gait: this.gaitCalibration[name === 'walk' ? this.locomotionOptions.walk : name === 'run' ? this.locomotionOptions.run : name] })).filter(e => e.gait);
      let distance = 0, weight = 0;
      for (const { name, gait } of entries) { const amount = w[name] || 0; distance += amount * gait.stride; weight += amount; }
      const frequency = speed > 0.01 && weight > 0.001 ? speed / Math.max(0.2, distance / weight) : 0;
      for (const { act, gait } of entries) {
        const duration = act.getClip().duration;
        act.time = (((this.gaitPhase * (gait.direction || 1) + gait.phase) % 1 + 1) % 1) * duration;
        act.timeScale = frequency * duration * (gait.direction || 1);
      }
      this.gaitPhase = (this.gaitPhase + frequency * dt) % 1;
    }
  }

  // ---- Action layer -----------------------------------------------------
  // Plays a clip once on top of locomotion. Returns the action (or null if the clip is missing).
  playAction(name, { fade = 0.12, timeScale = 1, loop = false } = {}) {
    this.autoAction = false;
    const act = this.actions.get(name);
    if (!act) { console.warn('Missing clip:', name); return null; }
    if (this.action && this.action !== act) this.action.fadeOut(fade);
    act.reset();
    act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    act.clampWhenFinished = true;
    act.timeScale = timeScale;
    act.setEffectiveWeight(1);
    act.fadeIn(fade);
    act.play();
    this.action = act;
    this.actionName = name;
    this.locoFade = fade;
    return act;
  }

  endAction(fade = 0.2) {
    this.autoAction = false;
    if (this.action) this.action.fadeOut(fade);
    this.action = null;
    this.actionName = null;
    this.locoFade = fade;
  }

  // 0..1 through the current action clip.
  actionProgress() {
    if (!this.action) return 0;
    const d = this.action.getClip().duration;
    return d > 0 ? Math.min(1, this.action.time / d) : 1;
  }

  update(dt) {
    this.mixer.update(dt);
    if (this.autoAction && this.actionProgress() >= 0.95) this.endAction(0.12);
    this.feet.update(this.root, dt, this.grounded && (!this.action || this.autoAction),
      this.groundSpeed > (this.loco?.walkSpeed || 2) + 0.2);
  }
}
