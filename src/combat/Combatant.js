import * as THREE from 'three';
import { StatusEffects, grantUltimateReward } from './StatusEffects.js';
import { directDamage } from './CombatBalance.js';
import { SoldierCombatPose } from '../characters/SoldierCombat.js';
import { PACE } from '../core/Pacing.js';
import { MOVES, DEFENSE, HIT_MAX_ANGLE, attackPhase } from './moves.js';
import { shortestAngle } from '../characters/Mover.js';
import { sweepHurtCapsule } from '../physics/collision.js';

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();

// One fighter: health, the combat state machine, hit detection and hit reactions.
// States: free | attack | block | dodge | hit | down | getup | victory | dead
// Controllers (player input, AI) only call tryAttack / wantBlock / tryDodge / steer.
export class Combatant {
  constructor({ name, team, character, mover, world, bat = null, maxHp = 100, spawn, spawnFacing, moves = MOVES, defense = DEFENSE, profile = null, equipment = null }) {
    this.name = name;
    this.team = team;
    this.character = character;
    this.mover = mover;
    this.world = world;
    this.bat = bat;
    this.moves = moves; this.defense = defense; this.profile = profile; this.equipment = equipment;
    this.cooldowns = {};
    this.statuses = new StatusEffects(this);
    this.wantCrouch = false; this.crouching = false; this.jumpVelocity = 0;
    this.maxHp = profile?.maxHp || maxHp;
    this.hp = this.maxHp;
    this.spawn = spawn.clone();
    this.spawnFacing = spawnFacing;
    this.radius = profile?.radius || 0.38;
    this.height = profile?.height || 1.7;
    this.previousPosition = spawn.clone();
    this.previousFacing = spawnFacing;
    this.target = null;
    this.hitTargets = [];
    this.strikeProgress = 0;

    this.state = 'free';
    this.stateT = 0;
    this.move = null;
    this.strikers = [];
    this.wantBlock = false;
    this.buffer = null; this.bufferAim = null; this.bufferT = 0;
    this.dodgeBuffer = null;
    this.iframes = 0;
    this.dodgeCd = 0;
    this.holdT = 0;
    this.deadT = 0;
    this.lastHit = '';
    this.lastDamage = 0;

    // For the white hit flash.
    this.flashT = 0;
    this.mats = [];
    const seen = new Set();
    character.model.traverse(o => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (m && m.emissive && !seen.has(m)) { seen.add(m); this.mats.push({ m, e: m.emissive.clone(), i: m.emissiveIntensity }); }
      }
    });

    this.reset();
  }

  get alive() { return this.state !== 'dead'; }
  get position() { return this.character.root.position; }
  get phase() { return this.state === 'attack' ? attackPhase(this.move, this.character.actionProgress()) : this.state === 'free' ? 'idle' : this.state === 'hit' ? 'stagger' : this.state === 'down' ? 'knockdown' : this.state; }

  replaceFighter({ character, mover, profile, moves, defense, equipment = null }) {
    this.world.physics?.ragdolls.stop(this);
    const scene = this.character.root.parent;
    this.character.mixer.stopAllAction(); this.character.mixer.uncacheRoot(this.character.model);
    const oldMaterials = new Set();
    this.character.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) oldMaterials.add(m); });
    for (const material of oldMaterials) material.dispose();
    this.equipment?.dispose(); this.character.root.removeFromParent();
    Object.assign(this, { character, mover, profile, moves, defense, equipment, bat: null });
    this.maxHp = profile?.maxHp || 100; this.radius = profile?.radius || 0.38;
    this.mats = [];
    const seen = new Set();
    character.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive && !seen.has(m)) {
      seen.add(m); this.mats.push({ m, e: m.emissive.clone(), i: m.emissiveIntensity });
    } });
    scene?.add(character.root); this.reset();
  }

  reset() {
    this.world.physics?.ragdolls.stop(this);this.launched=false;
    if(this.profile?.id==='soldier'){this.character.poseLayer??=new SoldierCombatPose(this);this.character.poseLayer.beforeMix();this.character.poseLayer.pitch=0;this.character.poseLayer.yaw=0;this.character.poseLayer.recoil=0;}
    this.hitContext=null;this.lastHitInfo=null;
    this.statuses.clear();
    this.hp = this.maxHp;
    this.height = this.profile?.height || 1.7;
    this.character.root.position.copy(this.spawn);
    this.position.y=this.world.arena.groundHeight?.(this.position.x,this.position.z)??this.spawn.y;
    this.previousPosition.copy(this.position);
    this.previousFacing = this.spawnFacing;
    this.character.root.rotation.y = this.spawnFacing;
    this.mover.facing = this.spawnFacing;
    this.mover.facingTarget = null;
    this.mover.lockFacing = null;
    this.mover.enabled = true;
    this.mover.steer(_p.set(0, 0, 0), 0);
    this.mover.impulse.set(0, 0, 0);
    this.mover.speed = 0;
    this.mover.velocity.set(0, 0, 0);
    this.character.mixer.stopAllAction();
    this.character.action = null; this.character.actionName = null;
    this.character.startLocomotion(this.character.locomotionOptions);
    this.character.update(0);
    this.character.locoGain = 1;
    this.state = 'free';
    this.stateT = 0;
    this.move = null;
    this.attackSequence = null;
    this.strikers = [];
    this.buffer = null;
    this.bufferAim = null; this.bufferT = 0;
    this.dodgeBuffer = null; this.castTarget = null;
    this.dodgeCd = 0;
    this.wantBlock = false;
    this.cooldowns = {}; this.wantCrouch = false; this.crouching = false; this.jumpVelocity = 0;
    this.comboStage = 0; this.comboRemaining = 0; this.manualAim = false; this.aimPoint = null; this.castPoint = null;
    this.mover.crouching = false; this.mover.sprinting = false;
    this.target = null;
    this.hitTargets = []; this.strikeProgress = 0;
    this.iframes = 0.6;
    this.deadT = 0;
    this.holdT = 0;
    this.flashT = 0;
    for (const x of this.mats) { x.m.emissive.copy(x.e); x.m.emissiveIntensity = x.i; }
  }

  // ---- Intents --------------------------------------------------------
  // Check all stages before spending cooldown, so a missing prepared clip cannot
  // leave an ultimate half-played. Internal stages cannot be triggered directly.
  canPlayAttack(id) {
    const move = this.moves[id];
    if (!move || move.sequenceOnly) return false;
    const stages = move.sequence ? move.sequence.map(key => this.moves[key]) : move.chain || [move];
    return stages.length > 0 && stages.every(stage => stage && !stage.sequence
      && this.character.hasClip(stage.clip)
      && (!stage.requiresBat || (this.bat && this.bat.holder.visible)));
  }

  tryAttack(id, aim = null) {
    if (this.world.combatEnabled === false) return false;
    if (!this.canPlayAttack(id) || this.attackSequence) return false;
    if ((this.cooldowns[id] || 0) > 0 && !(this.state === 'attack' && id === 'punch' && this.moves.punch.chain)) return false;
    if (this.state === 'attack') { this.buffer = id; this.bufferAim = aim; this.bufferPoint = this.aimPoint?.clone(); this.bufferT = id === 'punch' && this.moves.punch.chain
      ? Math.max(.5, (1-this.character.actionProgress())*(this.character.action?.getClip().duration||1)/(this.move.speed||1)+.12) : .5;
      return false; }
    if (!['free', 'block', 'blockEnd'].includes(this.state)) return false;
    this._startAttack(id, aim);
    return true;
  }

  tryDodge(aim = null) {
    if (this.world.combatEnabled === false) return false;
    if (this.dodgeCd > 0) return false;
    const D = this.defense.dodge;
    if (!this.character.hasClip(D.clip)) return false;
    if (this.state === 'attack') {
      const progress = this.character.actionProgress(), opens = this.move.dodgeCancelAt ?? this.move.cancelAt;
      if (progress < opens) {
        const remaining = (opens - progress) * this.character.action.getClip().duration / this.move.speed;
        if (remaining <= 0.16) this.dodgeBuffer = { aim, remaining: 0.18 };
        return false;
      }
      this._toFree(0.06);
    }
    if (!['free', 'block', 'blockEnd'].includes(this.state)) return false;
    const ang = aim !== null ? aim : this.mover.facing;
    this.mover.facing = ang; this.mover.facingTarget = null;
    this.character.playAction(D.clip, { fade: 0.08, timeScale: D.speed });
    this.mover.addImpulse(new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(D.impulse), D.decay);
    this._setState('dodge');
    this.dodgeCd = D.cooldown;
    this.buffer = null; this.dodgeBuffer = null;
    this.comboStage = 0; this.comboRemaining = 0;
    return true;
  }

  tryJump() {
    if (this.world.combatEnabled === false || this.state !== 'free' || this.position.y > (this.world.arena.groundHeight?.(this.position.x,this.position.z)??0)+0.01 || !this.character.hasClip('Jump')) return false;
    this.crouching = false; this.mover.crouching = false;
    this.jumpVelocity = 5.2 * PACE.jump;
    const moving = this.mover.speed > 2 && this.character.hasClip('JumpRun');
    const clip = moving ? 'JumpRun' : 'Jump';
    this.jumpMoving = moving;
    const duration = this.character.actions.get(clip).getClip().duration;
    this.character.playAction(clip, { fade: 0.07, timeScale: this.character.hasClip('JumpLoop') ? 1.4 * PACE.jump : duration / (0.8 / PACE.jump) });
    this._setState('jump'); return true;
  }

  // ---- State machine --------------------------------------------------
  _setState(s) {
    this.state = s; this.stateT = 0;
    if(s === 'dead') this.statuses.clear();
    // Hits, knockdown, dodge, KO and match end all cancel pending stages.
    if (s !== 'attack') this.attackSequence = null;
  }

  _toFree(fade = 0.18) {
    this.character.endAction(fade);
    this.move = null;
    this.strikers = [];
    this.buffer = null; this.dodgeBuffer = null;
    this.mover.facingTarget = null;
    this.mover.faceRate = 24;
    this._setState('free');
  }

  _nearestEnemy() {
    let best = null;
    const me = this.position;
    for (const c of this.world.combatants) {
      if (c === this || c.team === this.team || !c.alive) continue;
      const dx = c.position.x - me.x, dz = c.position.z - me.z;
      const d = Math.hypot(dx, dz);
      if (!best || d < best.dist) best = { c, dist: d, angle: Math.atan2(dx, dz) };
    }
    return best;
  }

  _setStrikers(m) {
    this.strikers = [];
    for (const n of m.strikers) {
      let obj = null;
      if (n === 'bat:tip') obj = this.bat?.tip;
      else if (n === 'bat:mid') obj = this.bat?.mid;
      else if (n === 'bat:base') obj = this.bat?.base;
      else if (n.startsWith('weapon:')) obj = this.equipment?.[n.slice(7)];
      else obj = this.character.bone(n);
      if (!obj) continue;
      obj.getWorldPosition(_p);
      this.strikers.push({ obj, prev: _p.clone(), armed: true, speed: 0, name: n });
    }
  }

  _startAttack(id, aim, sequenceIndex = 0) {
    this.dodgeBuffer = null;
    this.crouching = false; this.mover.crouching = false;
    const definition = this.moves[id];
    const sequence = definition.sequence;
    let m = sequence ? this.moves[sequence[sequenceIndex]] : definition;
    this.attackSequence = sequence ? { id, index: sequenceIndex, total: sequence.length, aim } : null;
    if (sequence) { this.buffer = null; this.bufferT = 0; }
    if (m.chain && !sequence) {
      const index = this.comboRemaining > 0 ? this.comboStage % m.chain.length : 0;
      m = m.chain[index]; this.comboStage = index + 1; this.comboRemaining = 0.85;
    } else { this.comboStage = 0; this.comboRemaining = 0; }
    const e = this.target?.alive
      ? { c: this.target, dist: this.position.distanceTo(this.target.position), angle: Math.atan2(this.target.position.x - this.position.x, this.target.position.z - this.position.z) }
      : this._nearestEnemy();
    let ang = this.mover.facing;
    if (aim !== null) ang = aim;
    if (!this.manualAim && m.kind !== 'mobility' && e && e.dist < 4.0) {
      const toE = shortestAngle(ang, e.angle);
      if (Math.abs(toE) < 1.75) ang = e.angle;       // soft auto-aim: within ~100 deg of where you point
    }
    this.mover.facingTarget = ang;
    this.attackAngle = ang;
    const decay = m.lungeDecay || 7;
    let v = m.lunge * 0.5;
    if (m.kind === 'mobility') v = m.lunge;
    else if (m.skill && this.manualAim && this.aimPoint && m.lunge) v = THREE.MathUtils.clamp(Math.hypot(this.aimPoint.x - this.position.x, this.aimPoint.z - this.position.z) - 0.95, 0, m.lunge / decay) * decay;
    else if (e && e.dist < (m.range || 4) + 1 && !this.manualAim) v = THREE.MathUtils.clamp((e.dist - 0.95) * decay, 0, m.lunge);
    else if (m.skill) v = m.lunge;
    this.mover.addImpulse(new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(v), decay);

    this.character.playAction(m.clip, { fade: m.fade, timeScale: m.speed });
    this.move = m;
    this.hitContext={criticalTargets:new Set()};
    this.moveId = id;
    // Ranged attacks commit their aim during startup; moving targets can evade.
    this.castTarget = m.kind === 'projectile' && this.manualAim && this.aimPoint ? this.aimPoint.clone() : m.kind === 'projectile' && e && Math.abs(shortestAngle(ang, e.angle)) < Math.PI / 3
      ? e.c.position.clone().add(new THREE.Vector3(0, 1, 0)) : null;
    this.castPoint = null;
    if (m.targeted) {
      this.castPoint = this.aimPoint?.clone() || e?.c.position.clone() || this.position.clone().add(new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(m.castRange));
      const delta = this.castPoint.clone().sub(this.position).setY(0).clampLength(0, m.castRange);
      this.castPoint.copy(this.position).add(delta);
      this.castPoint.y=this.world.arena.groundHeight?.(this.castPoint.x,this.castPoint.z)??0;
    }
    if (!sequence || sequenceIndex === 0) this.cooldowns[id] = (sequence ? definition : m).cooldown || 0;
    this.attackEvents = new Set();
    this.hitTargets = m.windows.map(() => new Set());
    this.strikeProgress = 0;
    this._setStrikers(m);
    this._setState('attack');
    this.world.onAttack?.(this, m);
  }

  _startBlock() {
    this.comboRemaining = 0; this.comboStage = 0;
    this.crouching = false; this.mover.crouching = false;
    const B = this.defense.block;
    this.guardPhase = this.character.hasClip('BlockStart') ? 'start' : 'hold';
    this.character.playAction(this.guardPhase === 'start' ? 'BlockStart' : B.clip, { fade: 0.1, timeScale: B.speed, loop: this.guardPhase === 'hold' && B.loop });
    this._setState('block');
  }

  enterStun(){
    this.buffer=null;this.dodgeBuffer=null;this.move=null;this.strikers=[];this.comboStage=0;this.comboRemaining=0;this.wantBlock=false;this.mover.facingTarget=null;this.mover.speed=0;this.mover.velocity.set(0,0,0);
    this.character.playAction(this.defense.hit.clip,{fade:.06,timeScale:1});this._setState('stun');
  }
  update(dt) {
    if(this.inactive)return;
    this.previousPosition.copy(this.position);
    this.previousFacing = this.mover.facing;
    this.statuses.update(dt);
    if(this.state==='stun'&&!this.statuses.entries.has('stunned'))this._toFree(.12);
    if(this.statuses.entries.has('stunned')&&!['stun','down','getup','dead'].includes(this.state))this.enterStun();
    this.mover.statusSpeed = this.statuses.multiplier('moveSpeed');
    const ch = this.character;
    for (const id of Object.keys(this.cooldowns)) this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    if (this.iframes > 0) this.iframes -= dt;
    if (this.dodgeCd > 0) this.dodgeCd -= dt;
    if (this.bufferT > 0) { this.bufferT -= dt; if (this.bufferT <= 0) this.buffer = null; }
    this.stateT += dt;
    if (this.state === 'attack' && this.moveId === 'punch' && this.moves.punch.chain) this.comboRemaining = 0.85;
    else this.comboRemaining = Math.max(0, this.comboRemaining - dt);
    if (!this.comboRemaining) this.comboStage = 0;
    this._updateFlash(dt);
    if (this.dodgeBuffer) {
      this.dodgeBuffer.remaining -= dt;
      if (this.dodgeBuffer.remaining <= 0) this.dodgeBuffer = null;
      else if (this.state === 'attack' && ch.actionProgress() >= (this.move.dodgeCancelAt ?? this.move.cancelAt)) this.tryDodge(this.dodgeBuffer.aim);
    }
    const p = ch.actionProgress();

    switch (this.state) {
      case 'free':
        this.crouching = !!this.wantCrouch && ch.hasClip('CrouchIdle');
        this.mover.crouching = this.crouching;
        if (this.wantBlock) this._startBlock();
        break;
      case 'attack': {
        const m = this.move;
        // Heading is committed once the first strike is active.
        if (p >= (m.windows[0]?.[0] ?? 1)) this.mover.facingTarget = null;
        if (this.attackSequence) {
          // No extra key press: advance only after the current stage recovers.
          if (p >= m.endAt) {
            const { id, index, total, aim } = this.attackSequence;
            if (index + 1 < total) this._startAttack(id, aim, index + 1);
            else { this._toFree(0.18); grantUltimateReward(this,this.moves[id]); }
          }
        } else if (this.buffer && p >= m.cancelAt && !(this.cooldowns[this.buffer] > 0)) {
          const b = this.buffer, aim = this.bufferAim; this.buffer = null;
          if (this.bufferPoint) this.aimPoint = this.bufferPoint.clone();
          this._startAttack(b, aim);
        } else if (p >= m.endAt) this._toFree(0.18);
        break;
      }
      case 'block': {
        const e = this._nearestEnemy();
        this.mover.facingTarget = e ? e.angle : null;
        const B = this.defense.block;
        if (!this.wantBlock) {
          if (ch.hasClip('BlockEnd')) { ch.playAction('BlockEnd', { fade: 0.08, timeScale: 2.5 * PACE.reaction }); this._setState('blockEnd'); }
          else this._toFree(0.15);
        } else if ((this.guardPhase === 'start' || this.guardPhase === 'react') && p >= 0.94) {
          this.guardPhase = 'hold'; ch.playAction(B.clip, { fade: 0.1, timeScale: B.speed, loop: !!B.loop });
        } else if (!B.loop && p >= B.hold && ch.action) ch.action.paused = true;
        break;
      }
      case 'blockEnd':
        if (p >= 0.92) this._toFree(0.1);
        break;
      case 'jump':
        if (ch.hasClip('JumpLoop') && ch.actionName === 'Jump' && p >= 0.9) ch.playAction('JumpLoop', { fade: 0.08, loop: true });
        break;
      case 'land':
        if (p >= 0.9) this._toFree(0.1);
        break;
      case 'dodge':
        if (p >= this.defense.dodge.endAt) this._toFree(0.15);
        break;
      case 'stun':
        if(p>=.5&&ch.action)ch.action.paused=true;
        break;
      case 'hit':
        if (p >= this.defense.hit.endAt) this._toFree(0.15);
        break;
      case 'down':
        if (p >= 0.97 && (!this.launched || this.jumpVelocity===0)) {
          this.holdT += dt;
          if (this.holdT > this.defense.down.hold) {
            ch.playAction(this.defense.getUp.clip, { fade: 0.1, timeScale: this.defense.getUp.speed });
            this._setState('getup');
          }
        }
        break;
      case 'getup':
        if (p >= this.defense.getUp.endAt) { this.iframes = 0.3; this._toFree(0.15); }
        break;
      case 'victory':
        if (this.stateT > 2.5) this._toFree(0.3);
        break;
      case 'dead':
        this.deadT += dt;
        if (this.deadT > 3.5) this.world.onRespawn?.(this);
        break;
    }

    this.height = this.crouching ? 1.12 : this.profile?.height || 1.7;
    const groundBefore=this.world.arena.groundHeight?.(this.position.x,this.position.z)??0;
    this.character.grounded = this.position.y <= groundBefore+0.001 && ['free', 'block', 'blockEnd'].includes(this.state);
    const mobileFire=this.state==='attack'&&!!this.move?.mobileFire;
    if(mobileFire)this.mover.facingTarget=this.attackAngle;
    this.mover.actionSpeed=mobileFire?.6:1;
    this.mover.enabled = mobileFire || this.state === 'free' || this.state === 'jump' || (this.state === 'land' && this.jumpMoving);
    this.mover.update(dt);
    const ground=this.world.arena.groundHeight?.(this.position.x,this.position.z)??0;
    if (this.jumpVelocity !== 0 || this.state === 'jump') {
      this.jumpVelocity -= 14 * PACE.gravity * dt; this.position.y += this.jumpVelocity * dt;
      if (this.position.y <= ground) {
        const landingSpeed=Math.abs(this.jumpVelocity);this.position.y = ground; this.jumpVelocity = 0;
        if(this.launched){this.launched=false;this.world.onLanding?.(this,landingSpeed);}
        if (this.state === 'jump') {
          const clip = this.jumpMoving && ch.hasClip('LandRun') ? 'LandRun' : 'Land';
          if (ch.hasClip(clip)) { ch.playAction(clip, { fade: 0.07, timeScale: 2.8 }); this._setState('land'); }
          else this._toFree(0.12);
        }
      }
    } else this.position.y=ground;
  }

  // Runs after the mixer has posed the skeleton, so strike points are current.
  postAnimation(dt) {
    if (this.state !== 'attack' || dt < 1e-4) return;
    const m = this.move;
    const p = this.character.actionProgress();
    const previousProgress = this.strikeProgress;
    this.strikeProgress = p;
    const root = this.position;
    for (const [index, event] of (m.events || []).entries()) if (previousProgress <= event && p >= event && !this.attackEvents.has(index)) {
      this.attackEvents.add(index);
      this.world.onCast?.(this, m);
    }

    // A single arc for each actual melee active window, never at button press.
    if(this.strikers.length)for(const [index,[start]] of m.windows.entries()){
      const key='swing:'+index;
      if(previousProgress<=start&&p>=start&&!this.attackEvents.has(key)){
        this.attackEvents.add(key);this.world.onSwing?.(this,m);
      }
    }
    for (const s of this.strikers) {
      s.obj.getWorldPosition(_p);
      s.speed = _p.distanceTo(s.prev) / dt;
      const from = s.prev.clone(), to = _p.clone();
      s.prev.copy(_p);
      s.armed = false;
      for (let index = 0; index < m.windows.length; index++) {
        const [start, end] = m.windows[index];
        const a = Math.max(previousProgress, start), b = Math.min(p, end);
        if (b <= a || s.speed < m.minSpeed) continue;
        s.armed = true;
        // Clip the sweep to the active part of this animation step. Motion in
        // startup/recovery cannot leak into a hit at a window boundary.
        const span = p - previousProgress;
        const activeFrom = from.clone().lerp(to, (a - previousProgress) / span);
        const activeTo = from.clone().lerp(to, (b - previousProgress) / span);
        this.world.onTrail?.(activeFrom, activeTo, m.color ?? this.profile?.color,this,m);
        this.world.onEnvironmentSweep?.(this,m,activeFrom,activeTo,m.strikeRadius,this.hitTargets[index]);
        for (const t of this.world.combatants) {
          if (t === this || t.team === this.team || !t.alive || this.hitTargets[index].has(t)) continue;
          const dx = t.position.x - root.x, dz = t.position.z - root.z;
          if (Math.abs(shortestAngle(this.mover.facing, Math.atan2(dx, dz))) > HIT_MAX_ANGLE) continue;
          if (this.world.arena && !this.world.arena.hasLineOfSight(root, t.position)) continue;
          const point = new THREE.Vector3();
          if (!sweepHurtCapsule(activeFrom, activeTo, t, m.strikeRadius, point, (a - previousProgress) / span, (b - previousProgress) / span)) continue;
          const dir = _q.set(dx, 0, dz).normalize().clone();
          const res = t.takeHit({ damage: m.damage, knock: m.knock, power: m.power, dir, attacker: this, point, move:m, context:this.hitContext });
          if (res !== 'miss') {
            this.hitTargets[index].add(t);
            this.world.onHit?.(this, t, res, m, point);
          }
        }
      }
    }
  }

  // Returns 'miss' (no effect), 'blocked', 'hit', 'down', or 'dead'.
  takeHit({ damage, knock, power, dir, attacker, move=null, context=null }) {
    if (this.world.combatEnabled === false) return 'miss';
    if (this.state === 'dead' || this.state === 'down' || this.state === 'getup') return 'miss';
    if (this.iframes > 0) return 'miss';
    if (this.state === 'dodge' && this.character.actionProgress() < this.defense.dodge.iframeUntil) return 'miss';
    if (this.state === 'attack' && this.move.invulnerable) {
      const p = this.character.actionProgress(), [start, end] = this.move.invulnerable;
      if (p >= start && p < end) return 'miss';
    }

    knock *= this.statuses.multiplier('knockTaken');
    const toAttacker = Math.atan2(-dir.x, -dir.z);
    const B = this.defense.block;
    const facingAttacker = Math.abs(shortestAngle(this.mover.facing, toAttacker)) < B.arc * Math.PI / 180;

    const guarding=this.state==='block'&&facingAttacker;
    const resolved=directDamage({damage,attacker,target:this,move,context,guarded:guarding});damage=resolved.damage;
    if (guarding && power !== 'heavy') {
      const before = this.hp;
      const shieldHit=this.statuses.absorbDamage(damage*B.damageTaken);
      this.hp = Math.max(Math.min(1, this.hp), this.hp - shieldHit.damage);
      this.lastDamage = before - this.hp;
      this.lastHitInfo={damage:this.lastDamage,critical:false,blocked:true,absorbed:shieldHit.absorbed};
      this.mover.addImpulse(dir.clone().multiplyScalar(knock * B.pushback), 6);
      this._flash(0.08, 0.3, 0.55, 1.0);
      if (this.character.hasClip('BlockHit')) { this.guardPhase = 'react'; this.character.playAction('BlockHit', { fade: 0.05, timeScale: 2 * PACE.reaction }); }
      return 'blocked';
    }

    // Heavy hits break a guard but do reduced damage to it.
    const shieldHit=this.statuses.absorbDamage(guarding?damage*.6:damage);const dmg=shieldHit.damage;
    this.lastDamage = Math.min(this.hp, dmg);
    this.lastHitInfo={damage:this.lastDamage,critical:resolved.critical,blocked:false,absorbed:shieldHit.absorbed,guardBroken:guarding&&power==='heavy'};
    if(resolved.critical)context.criticalTargets.add(this);
    this.hp -= dmg;
    if(dmg<=1e-8&&shieldHit.absorbed>0){this._flash(.08,.3,.65,1);return 'hit';}
    this._flash(0.1, 1.0, 0.4, 0.25);
    this.buffer = null;
    this.dodgeBuffer = null;
    this.comboStage = 0; this.comboRemaining = 0;
    this.move = null;
    this.strikers = [];
    this.mover.facingTarget = toAttacker;
    this.mover.faceRate = 40;
    this.mover.addImpulse(dir.clone().multiplyScalar(knock), power === 'heavy' ? 4.5 : 6);

    if (this.hp <= 0) {
      this.hp = 0;
      this.character.playAction(this.reactionClip('Defeat', toAttacker), { fade: 0.1, timeScale: 1.2 * PACE.reaction });
      this._setState('dead');
      this.deadT = 0;
      this.world.onKill?.(attacker, this);
      return 'dead';
    }
    if (power === 'heavy') {
      this.statuses.remove('stunned','interrupted');
      if(move?.launchSpeed>0&&!guarding&&!this.profile?.boss){this.jumpVelocity=Math.max(this.jumpVelocity,move.launchSpeed);this.launched=true;}
      this.character.playAction(this.defense.down.clip, { fade: 0.08, timeScale: this.defense.down.speed });
      this.holdT = 0;
      this._setState('down');
      return 'down';
    }
    this.character.playAction(this.reactionClip(this.defense.hit.clip, toAttacker), { fade: 0.06, timeScale: this.defense.hit.speed });
    this._setState('hit');
    return 'hit';
  }

  // Damage over time bypasses guard/iframes once earned, without hitstop,
  // repeated stagger, knockback, lifesteal, or re-applying on-hit statuses.
  takeStatusDamage(amount,source,type) {
    if(!this.alive || this.hp<=0 || this.world.combatEnabled===false)return 0;
    const damage=Math.min(this.hp,amount);this.hp-=damage;this.lastDamage=damage;
    this.lastHitInfo={damage,critical:false,periodic:true,statusLabel:type.label.toUpperCase(),color:type.color};
    this.world.onStatusTick?.(source,this,damage,type);
    if(this.hp<=0){
      this.move=null;this.strikers=[];this.buffer=null;this.dodgeBuffer=null;
      this.comboStage=0;this.comboRemaining=0;this.mover.facingTarget=null;
      this.character.playAction('Defeat',{fade:.1,timeScale:1.2 * PACE.reaction});this._setState('dead');this.deadT=0;
      this.world.onKill?.(source,this);
    }
    return damage;
  }

  // ---- Visual feedback ------------------------------------------------
  reactionClip(base, angle) {
    const diff = shortestAngle(this.mover.facing, angle);
    const suffix = Math.abs(diff) > Math.PI * 0.75 ? 'Back' : Math.abs(diff) > Math.PI * 0.25 ? diff > 0 ? 'Right' : 'Left' : '';
    return this.character.hasClip(base + suffix) ? base + suffix : base;
  }
  _flash(t, r, g, b) {
    this.flashT = this.flashDuration = t;
    this.flashColor ??= new THREE.Color();this.flashColor.setRGB(r,g,b);
    // Keep skin/clothing readable beneath a short, fading contact tint.
    this._updateFlash(0);
  }
  _updateFlash(dt) {
    if (this.flashT <= 0) return;
    this.flashT -= dt;
    const fade=Math.max(0,this.flashT/this.flashDuration);
    for (const x of this.mats) {
      if(fade===0){x.m.emissive.copy(x.e);x.m.emissiveIntensity=x.i;continue;}
      const strength=.085*fade;
      x.m.emissive.setRGB(x.e.r*x.i+this.flashColor.r*strength,x.e.g*x.i+this.flashColor.g*strength,x.e.b*x.i+this.flashColor.b*strength);
      x.m.emissiveIntensity=1;
    }
  }
}
