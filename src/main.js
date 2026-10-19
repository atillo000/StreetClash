import * as THREE from 'three';
import { QUALITY, applyQuality } from './core/quality.js';
import { ART, createArcadeLighting, FighterPresentation } from './core/ArtDirection.js';
import { FighterLibrary } from './characters/FighterLibrary.js';
import { FIGHTERS, FIGHTER_LIST } from './characters/FighterCatalog.js';
import { Combatant } from './combat/Combatant.js';
import { SparringAI } from './combat/SparringAI.js';
import { Effects } from './combat/Effects.js';
import { Projectiles } from './combat/Projectiles.js';
import { ThirdPersonCamera } from './core/ThirdPersonCamera.js';
import { Input } from './core/input.js';
import { FixedStep } from './core/FixedStep.js';
import { createWarehouseArena } from './core/WarehouseArena.js';
import { Sound } from './core/Sound.js';
import { TargetLock } from './combat/TargetLock.js';
import { shortestAngle } from './characters/Mover.js';
import { Match } from './game/Match.js';
import { Aim } from './combat/Aim.js';
import { CombatSignals } from './combat/CombatSignals.js';
import { requestedAttacks } from './core/controls.js';
import { CombatHud } from './ui/CombatHud.js';

const statusEl = document.getElementById('status');
const qEl = document.getElementById('q');

function showError(msg) {
  document.getElementById('errmsg').textContent = msg;
  document.getElementById('error').style.display = 'flex';
}
window.addEventListener('error', e => showError(e.message));
window.addEventListener('unhandledrejection', e => showError(String(e.reason)));

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(ART.sky);
scene.fog = new THREE.Fog(ART.fog, 23, 49);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(0, 3, 6);

const input = new Input(renderer.domElement);
const cam = new ThirdPersonCamera(camera);
window.__cam = cam;

// Warm arcade key, lifted cool shadows and a soft complementary rim.
const { key, portraitFill } = createArcadeLighting(scene);

let arena;
const effects = new Effects(scene);
const sound = new Sound();
window.addEventListener('keydown', () => sound.unlock());
renderer.domElement.addEventListener('pointerdown', () => sound.unlock());

// Quality
const qualityOrder = Object.keys(QUALITY);
let qIndex = qualityOrder.indexOf('medium');
function setQuality(name) {
  applyQuality(name, renderer, key);
  effects.setBudget(QUALITY[name].particles);
  qEl.textContent = name;
}
setQuality(qualityOrder[qIndex]);
window.addEventListener('keydown', e => {
  if (e.code === 'KeyQ' && !e.repeat) {
    qIndex = (qIndex + 1) % qualityOrder.length;
    setQuality(qualityOrder[qIndex]);
    resize();
  }
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---- Fighters ---------------------------------------------------------
const world = {
  combatants: [],
  arena,
  sound,
  combatEnabled: false,
  paused: false,
  hitstop: 0,
  hitMarkerT: 0, hitMessage: '',
  onAttack(c, move) { if (move.skill) sound.play(move.kind === 'mobility' ? 'dodge' : 'charge'); },
  onCast(c, move) {
    if (move.kind === 'mobility') { effects.pulse(c.position, move.color, 0.6); sound.play('dodge'); return; }
    c.equipment?.kick();
    if (move.kind === 'projectile') {
      const source = c.equipment?.muzzle || c.character.bone('mixamorigRightHand');
      effects.cast(source.getWorldPosition(new THREE.Vector3()), move.color, c.profile.id === 'soldier' ? 'muzzle' : move.projectileStyle === 'arrow' ? 'wind' : 'cast');
    }
    if (move.kind === 'area') projectiles.area(c, move); else projectiles.emit(c, move);
    sound.play(move.kind === 'area' ? 'heavy' : c.profile.id === 'soldier' ? 'rifle' : 'magic');
  },
  onTrail(from, to, color) { effects.trail(from, to, color); },
  onHit(attacker, target, result, move, point) {
    this.match?.recordHit(attacker, target, result, target.lastDamage);
    const heavy = move.power === 'heavy';
    effects.impact(point, move.color ?? attacker.profile?.color ?? 0xffd58a, heavy && result !== 'blocked');
    if (attacker.team === 'p') { this.hitMarkerT = 0.22; this.hitMessage = result === 'blocked' ? 'GUARDED' : `${Math.round(target.lastDamage)}${attacker.comboStage ? ' / CHAIN ' + attacker.comboStage : ''}`; }
    sound.play(result === 'blocked' ? 'block' : heavy ? 'heavy' : 'hit');
    if (result === 'blocked') {
      effects.spark(point, 0x7fb4ff, 6, 3);
      cam.shake(0.03);
      this.hitstop = Math.max(this.hitstop, 0.03);
    } else {
      effects.spark(point, move.color ?? attacker.profile?.color ?? (heavy ? 0xff9a3c : 0xffe08a), heavy ? 16 : 9, heavy ? 6 : 4);
      cam.shake(heavy ? 0.14 : 0.045);
      this.hitstop = Math.max(this.hitstop, heavy ? 0.075 : 0.035);
      if (heavy) effects.slam(target.position);
    }
  },
  onKill() {}, // Match resolves confirmed damage after both fighters' hit checks.
  onRespawn() {},
};

const projectiles = new Projectiles(scene, world, effects);
world.projectiles = projectiles;

async function boot() {
  statusEl.textContent = 'Loading models and animations…';
  const [library, warehouse] = await Promise.all([
    new FighterLibrary().load((n, total) => { statusEl.textContent = `Loading fighters ${n}/${total}…`; }),
    createWarehouseArena(scene, (n, total) => { statusEl.textContent = `Loading warehouse ${n}/${total}…`; }),
    effects.loadSprites(),
  ]);
  arena = warehouse; world.arena = arena;
  world.library = library;

  function makeFighter(id, opts) {
    const setup = library.create(id, opts.facing);
    scene.add(setup.character.root);
    const c = new Combatant({ ...opts, ...setup, world, spawnFacing: opts.facing });
    world.combatants.push(c);
    return c;
  }

  const player = makeFighter('capoeira', { name: 'YOU', team: 'p', spawn: new THREE.Vector3(0, 0, 5.5), facing: Math.PI });
  const dummy = makeFighter('magic', { name: 'RIVAL', team: 'e', spawn: new THREE.Vector3(0, 0, -3.8), facing: 0 });
  world.presentation = new FighterPresentation(scene, world.combatants);
  const ai = new SparringAI(dummy);
  const lock = new TargetLock(player, world);
  const aimTrace = new Aim(); world.aim = aimTrace;
  const signals = new CombatSignals(scene, world.combatants); world.signals = signals;
  const lockRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.57, 32), new THREE.MeshBasicMaterial({ color: 0xffcf40, side: THREE.DoubleSide, depthWrite: false }));
  lockRing.rotation.x = -Math.PI / 2; lockRing.visible = false; scene.add(lockRing);
  function resetArena() {
    player.reset(); dummy.reset(); lock.clear(); effects.clear(); projectiles.clear(); ai.reset();
    input.clear(); world.hitstop = 0;
    world.hitMarkerT = 0; world.hitMessage = '';
    cam.yaw = 0; cam.pitch = 0.38; cam.distance = 4.8; cam._first = true; cam.shakeAmt = 0;
  }
  const match = new Match({
    player, opponent: dummy,
    onReset: resetArena,
    onChange() {
      world.combatEnabled = match.canFight;
      ai.enabled = match.state === 'active';
      if (!match.canFight) {
        projectiles.clear();
        input.clear(); lock.clear();
        for (const c of world.combatants) { c.mover.steer(_fwd.set(0, 0, 0), 0); c.mover.velocity.set(0, 0, 0); c.mover.impulse.set(0, 0, 0); c.mover.speed = 0; c.wantBlock = false; }
      }
      updateHud();
    },
    onFinish(result) {
      if (input.locked) document.exitPointerLock();
      const winner = result.outcome === 'victory' ? player : result.outcome === 'defeat' ? dummy : null;
      for (const c of world.combatants) if (c.alive) { c.character.endAction(0.12); c.move = null; c.strikers = []; c.buffer = null; c._setState('free'); }
      if (winner?.character.hasClip('Victory')) { winner.character.playAction('Victory', { fade: 0.15 }); winner._setState('victory'); }
    },
  });
  world.match = match;
  world.selectFighter = (side, id) => {
    if (match.state !== 'lobby' || !FIGHTERS[id]) return false;
    const c = side === 'opponent' ? dummy : player;
    c.replaceFighter(library.create(id, c.spawnFacing)); ai.reset();
    updateHud(); return true;
  };
  for (const config of FIGHTER_LIST) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'fighter-choice';
    button.dataset.fighter = config.id; button.style.setProperty('--fighter-color', config.color);
    button.innerHTML = `<span>${config.role}</span><small>${config.name}</small>`;
    button.addEventListener('click', () => world.selectFighter('player', config.id));
    document.getElementById('fighterChoices').appendChild(button);
    const option = document.createElement('option'); option.value = config.id; option.textContent = `${config.name} / ${config.role}`;
    document.getElementById('opponentChoice').appendChild(option);
  }
  document.getElementById('opponentChoice').value = dummy.profile.id;
  document.getElementById('opponentChoice').addEventListener('change', event => world.selectFighter('opponent', event.target.value));
  world.onRespawn = c => { if (match.state === 'practice') c.reset(); };

  // ---- Player input ---------------------------------------------------
  const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _dir = new THREE.Vector3();
  function playerBrain() {
    if (input.pressed('Tab')) lock.toggle();
    lock.update();
    const axis = input.moveAxis();
    const mag = Math.hypot(axis.x, axis.y);
    cam.forward(_fwd); cam.right(_right);
    _dir.set(0, 0, 0).addScaledVector(_fwd, axis.y).addScaledVector(_right, axis.x);
    if (_dir.lengthSq() > 0) _dir.normalize();
    const moveAim = mag > 0 ? Math.atan2(_dir.x, _dir.z) : null;
    aimTrace.update(camera, player, world);
    player.manualAim = !lock.target;
    player.aimPoint = lock.target ? lock.target.position.clone().add(new THREE.Vector3(0, 1, 0)) : aimTrace.point.clone();
    const aim = lock.target ? player.mover.lockFacing : aimTrace.heading(player);
    const ranged = player.profile.ranged ?? ['magic', 'soldier', 'archer'].includes(player.profile.id);
    if (!lock.target && ranged && input.locked && !input.down('KeyZ')) player.mover.lockFacing = aim;

    player.mover.steer(_dir, mag, input.walkModifier);
    player.wantBlock = input.down('KeyF');
    player.wantCrouch = input.down('KeyC');
    player.mover.sprinting = input.down('KeyZ') && player.character.hasClip('Sprint');
    if (input.pressed('Space')) player.tryJump();

    for (const id of requestedAttacks(input, player.moves)) {
      const move = player.moves[id];
      const heading = move?.kind === 'mobility' ? moveAim ?? player.mover.facing + Math.PI : aim;
      if (player.tryAttack(id, heading)) sound.play('swing');
    }
    if (input.pressed('KeyE')) { if (player.tryDodge(moveAim)) sound.play('dodge'); }

    if (input.pressed('KeyT') && match.state === 'practice') { ai.enabled = !ai.enabled; }
    if (input.pressed('KeyB') && player.bat) player.bat.setGrip(player.bat.grip + 1);
    if (input.pressed('KeyV') && player.bat) player.bat.setVisible(!player.bat.holder.visible);
  }

  // ---- HUD ------------------------------------------------------------
  const combatHud = new CombatHud();
  const aiEl = document.getElementById('ai');
  const debugEl = document.getElementById('debug');
  let debug = false;
  const debugMarks = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3366 }));
    m.visible = false; scene.add(m); debugMarks.push(m);
  }

  // Diagnostics can be opened in gameplay, the lobby or pause without consuming
  // a simulated combat frame. The same shortcuts and debug markers are retained.
  function setDebug(value) {
    debug=value;document.getElementById('devTools').hidden=!debug;
    document.documentElement.classList.toggle('debug-mode',debug);world.debugEnabled=debug;
    for(const marker of debugMarks)marker.visible=debug;
    updateHud();
  }
  window.addEventListener('keydown',event=>{if(event.code==='F1'&&!event.repeat){event.preventDefault();setDebug(!debug);}});
  world.debugEnabled=false;

  function updateHud() {
    combatHud.update(player,dummy,match,world,lock);
    input.combatEnabled = match.canFight && !world.paused;
    aiEl.textContent = ai.enabled ? 'ON' : 'OFF (dummy)';
    document.getElementById('grip').textContent = player.bat ? player.bat.gripLabel() : '-';
    document.getElementById('defeat').style.display = player.state === 'dead' && match.state === 'practice' ? 'flex' : 'none';
    document.getElementById('sound').textContent = sound.muted ? 'OFF' : 'ON';
    document.getElementById('fighterDescription').textContent = player.profile.description;
    for (const button of document.querySelectorAll('[data-fighter]')) button.setAttribute('aria-pressed', String(button.dataset.fighter === player.profile.id));
    document.getElementById('opponentChoice').value = dummy.profile.id;
    const reticle = document.getElementById('crosshair');
    reticle.hidden = !match.canFight || world.paused;
    reticle.classList.toggle('on-target', !!aimTrace.target || !!lock.target);
    reticle.classList.toggle('confirmed', world.hitMarkerT > 0);
    document.getElementById('hitConfirm').textContent = world.hitMarkerT > 0 ? world.hitMessage : '';
    document.getElementById('lobby').hidden = match.state !== 'lobby';
    document.getElementById('results').hidden = match.state !== 'results';
    document.getElementById('matchHud').hidden = ['lobby', 'results'].includes(match.state);
    document.getElementById('matchHud').classList.toggle('practice', match.state === 'practice');
    document.getElementById('fightHud').hidden = ['lobby', 'results'].includes(match.state);
    document.getElementById('timer').textContent = match.state === 'practice' ? '∞' : `${Math.floor(Math.ceil(match.remaining) / 60)}:${String(Math.ceil(match.remaining) % 60).padStart(2, '0')}`;
    document.getElementById('matchMode').textContent = match.state === 'practice' ? 'TRAINING' : 'DUEL';
    const banner = document.getElementById('countdown');
    banner.hidden = !['countdown', 'ending'].includes(match.state);
    banner.textContent = match.state === 'countdown' ? String(Math.max(1, Math.ceil(match.countdownRemaining))) : match.result?.outcome === 'victory' ? 'KNOCKOUT · YOU WIN' : match.result?.outcome === 'defeat' ? 'RIVAL WINS' : 'DRAW';
    if (match.state === 'ending' && match.result?.reason.startsWith('Time')) banner.textContent = 'TIME UP';
    if (match.result) {
      document.getElementById('resultTitle').textContent = match.result.outcome.toUpperCase();
      document.getElementById('resultReason').textContent = match.result.reason;
      document.getElementById('resultDamage').textContent = Math.round(match.result.damageDealt);
      document.getElementById('resultTaken').textContent = Math.round(match.result.damageTaken);
      document.getElementById('resultHits').textContent = match.result.hits;
      document.getElementById('resultTime').textContent = `${Math.floor(match.result.elapsed / 60)}:${String(Math.floor(match.result.elapsed) % 60).padStart(2, '0')}`;
      document.getElementById('resultHealth').textContent = `${Math.ceil(match.result.playerHp)} — ${Math.ceil(match.result.opponentHp)}`;
    }
    if (debug) {
      const line = c => `${c.name}: ${c.phase}${c.move ? ' / ' + c.move.label : ''}  clip=${c.character.actionName || '-'}  p=${c.character.actionProgress().toFixed(2)}`
        + (c.strikers.length ? '\n   strikers: ' + c.strikers.map(s => s.name.replace('mixamorig', '') + ' ' + s.speed.toFixed(1) + 'm/s').join(', ') : '');
      debugEl.textContent = world.combatants.map(line).join('\n') + `\n${match.state} | AI: ${ai.behavior} | ${renderer.info.render.calls} draw calls | ${Math.round(renderer.info.render.triangles / 1000)}k triangles | particles ${effects.items.length}/${effects.budget}`;
      debugEl.textContent += `
Physics: swept capsules / AABB · ${world.arena.obstacles.length} cover colliders
Arena: ${world.arena.halfSize*2}m · Camera: ${cam.clearDistance.toFixed(2)}m
Projectiles: ${projectiles.items.length} · Fixed step: 60 Hz`;
      let i = 0;
      for (const c of world.combatants) for (const s of c.strikers) if (i < debugMarks.length) { s.obj.getWorldPosition(debugMarks[i].position); debugMarks[i].material.color.set(s.armed ? 0xff3366 : 0x33ff99); i++; }
      for (; i < debugMarks.length; i++) debugMarks[i].position.set(0, -10, 0);
    }
  }

  window.__world = world; window.__player = player; window.__dummy = dummy;
  window.__lock = lock; window.__effects = effects; window.__ai = ai;
  world.renderInfo = renderer.info;
  statusEl.textContent = 'Ready';
  document.getElementById('debugFps').appendChild(statusEl);
  startLoop(player, dummy, ai, playerBrain, updateHud, lock, lockRing, match);
  document.getElementById('startMatch').disabled = false;
  document.getElementById('startMatch').textContent = 'Enter the arena  ↗';
  document.getElementById('practice').disabled = false;
}

// ---- Loop -------------------------------------------------------------
function startLoop(player, dummy, ai, playerBrain, updateHud, lock, lockRing, match) {
  const clock = new THREE.Clock();
  const fixed = new FixedStep();
  world.fixed = fixed;
  const pauseEl = document.getElementById('pause');
  function pause(value) {
    if (value && !match.canPause) return;
    world.paused = value; fixed.reset(); input.clear(); clock.getDelta();
    pauseEl.style.display = value ? 'flex' : 'none';
    if (value && input.locked) document.exitPointerLock();
  }
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyP') pause(!world.paused);
    if (e.code === 'KeyM') { sound.muted = !sound.muted; if (!sound.muted) sound.unlock(); updateHud(); }
    if (e.code === 'Enter' && ['lobby', 'results'].includes(match.state)) begin('match');
    if (e.code === 'KeyR' && match.canPause) { if (match.state === 'practice') begin('practice'); else begin('match'); }
  });
  function begin(mode) { pause(false); input.clear(); if (mode === 'practice') match.practice(); else match.start(); }
  document.getElementById('startMatch').addEventListener('click', () => begin('match'));
  document.getElementById('practice').addEventListener('click', () => begin('practice'));
  document.getElementById('rematch').addEventListener('click', () => begin('match'));
  document.getElementById('restartMatch').addEventListener('click', () => begin(match.state === 'practice' ? 'practice' : 'match'));
  for (const id of ['returnMenu', 'pauseMenu']) document.getElementById(id).addEventListener('click', () => { pause(false); match.toLobby(); if (input.locked) document.exitPointerLock(); });
  document.getElementById('resume').addEventListener('click', () => pause(false));
  window.addEventListener('blur', () => pause(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  world.setPaused = pause;
  function simulate(dt) {
    match.update(dt);
    if (!match.canFight) {
      for (const c of world.combatants) {
        c.previousPosition.copy(c.position); c.previousFacing = c.mover.facing;
        c.character.locomote(0, dt);
        if (match.state !== 'results') c.character.update(dt);
      }
      input.endFrame(); return;
    }
    if (world.hitstop > 0) {
      world.hitstop = Math.max(0, world.hitstop - dt);
      for (const c of world.combatants) { c.previousPosition.copy(c.position); c.previousFacing = c.mover.facing; }
      return;
    }
    playerBrain(); ai.update(dt);
    for (const c of world.combatants) c.update(dt);
    arena.resolve(world.combatants);
    for (const c of world.combatants) c.character.update(dt);
    for (const c of world.combatants) c.equipment?.update(['block','blockEnd','dodge','hit','down','getup','dead','jump','land','victory'].includes(c.state) || (c.state === 'attack' && (c.move?.clip === 'Kick' || c.move?.kind === 'mobility')));
    for (const c of world.combatants) c.postAnimation(dt);
    projectiles.update(dt);
    match.resolveOutcome();
    lock.update();
    input.endFrame();
  }
  let frames = 0, acc = 0, hudT = 0;
  const renderPositions = world.combatants.map(() => new THREE.Vector3());
  function tick() {
    const raw = Math.min(clock.getDelta(), 0.1);
    if (!world.paused) {
      cam.applyLook(input.consumeLook());
      if (lock.target) cam.trackTarget(raw, player.position, lock.target.position);
    }
    const alpha = world.paused ? 1 : fixed.advance(raw, simulate);
    for (const c of world.combatants) c.equipment?.update(['block','blockEnd','dodge','hit','down','getup','dead','jump','land','victory'].includes(c.state) || (c.state === 'attack' && (c.move?.clip === 'Kick' || c.move?.kind === 'mobility')));
    if (!world.paused) effects.update(raw);
    if (!world.paused) world.hitMarkerT = Math.max(0, world.hitMarkerT - raw);
    // Interpolate only for drawing; restore authoritative positions afterwards.
    world.combatants.forEach((c, i) => {
      renderPositions[i].copy(c.position);
      c.position.lerpVectors(c.previousPosition, renderPositions[i], alpha);
      c.character.root.rotation.y = c.previousFacing + shortestAngle(c.previousFacing, c.mover.facing) * alpha;
    });
    lockRing.visible = !!lock.target;
    if (lock.target) lockRing.position.set(lock.target.position.x, 0.025, lock.target.position.z);
    if (match.state === 'lobby') { camera.position.set(3, 2.2, 0.5); camera.lookAt(1.2, 1, 5.5); }
    else cam.update(world.paused ? 0 : raw, player.position, undefined, lock.target?.position, arena.cameraBlockers, input.locked);
    world.signals.update(match.canFight, player);
    const lightFocus = player.position.clone().lerp(dummy.position, 0.5).setY(0);
    key.position.set(lightFocus.x + 5, 9, lightFocus.z + 4);
    key.target.position.copy(lightFocus); key.target.updateMatrixWorld();
    portraitFill.visible = match.state === 'lobby';
    if (portraitFill.visible) {
      portraitFill.position.copy(camera.position).add(new THREE.Vector3(0, 2, 0));
      portraitFill.target.position.copy(player.position).add(new THREE.Vector3(0, 1, 0));
    }
    world.presentation.update();
    renderer.render(scene, camera);
    world.combatants.forEach((c, i) => { c.position.copy(renderPositions[i]); c.character.root.rotation.y = c.mover.facing; });

    hudT += raw;
    if (hudT > 0.05) { hudT = 0; updateHud(); }
    frames++; acc += raw;
    if (acc >= 1) {
      statusEl.textContent = `${Math.round(frames / acc)} fps`;
      frames = 0; acc = 0;
    }
    requestAnimationFrame(tick);
  }
  tick();
  updateHud();
  window.__ready = true;
}

boot().catch(e => showError('Startup failed: ' + (e.message || e)));
