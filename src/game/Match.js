// Match rules are independent of rendering and UI so every outcome is testable.
export class Match {
  constructor({ player, opponent, duration = 120, countdown = 3, onReset = () => {}, onChange = () => {}, onFinish = () => {} }) {
    Object.assign(this, { player, opponent, duration, countdown, onReset, onChange, onFinish });
    this.state = 'lobby';
    this.remaining = duration;
    this.countdownRemaining = 0;
    this.elapsed = 0;
    this.endingRemaining = 0;
    this.result = null;
    this.stats = this.emptyStats();
  }

  emptyStats() { return { damageDealt: 0, damageTaken: 0, hits: 0, blocks: 0 }; }
  get canFight() { return this.state === 'active' || this.state === 'practice'; }
  get canPause() { return ['countdown', 'active', 'practice', 'ending'].includes(this.state); }

  change(state) { this.state = state; this.onChange(this); }

  start() {
    this.remaining = this.duration; this.elapsed = 0;
    this.countdownRemaining = this.countdown; this.endingRemaining = 0;
    this.result = null; this.stats = this.emptyStats();
    this.onReset(); this.change('countdown');
  }

  practice() {
    this.result = null; this.stats = this.emptyStats(); this.elapsed = 0;
    this.onReset(); this.change('practice');
  }

  toLobby() { this.result = null; this.onReset(); this.change('lobby'); }

  recordHit(attacker, target, outcome, damage) {
    if (this.state !== 'active') return;
    if (attacker === this.player) { this.stats.damageDealt += damage; if (outcome !== 'blocked') this.stats.hits++; }
    if (target === this.player) { this.stats.damageTaken += damage; if (outcome === 'blocked') this.stats.blocks++; }
  }

  resolveOutcome() {
    if (this.state !== 'active') return;
    const p = this.player.hp, e = this.opponent.hp;
    if (p <= 0 || e <= 0) {
      this.finish(p <= 0 && e <= 0 ? 'draw' : e <= 0 ? 'victory' : 'defeat', 'Knockout');
    } else if (this.remaining <= 1e-8) {
      const diff = p / this.player.maxHp - e / this.opponent.maxHp;
      this.finish(Math.abs(diff) < 1e-6 ? 'draw' : diff > 0 ? 'victory' : 'defeat', 'Time limit · higher health wins');
    }
  }

  finish(outcome, reason) {
    if (this.state !== 'active') return;
    this.result = { outcome, reason, elapsed: this.elapsed, ...this.stats,
      playerHp: this.player.hp, opponentHp: this.opponent.hp };
    this.endingRemaining = 1.8;
    this.change('ending'); this.onFinish(this.result);
  }

  update(dt) {
    if (this.state === 'countdown') {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      if (this.countdownRemaining < 1e-8) this.change('active');
    } else if (this.state === 'active') {
      // Resolve already-confirmed KOs before evaluating a timer expiration.
      this.resolveOutcome();
      if (this.state !== 'active') return;
      const step = Math.min(dt, this.remaining);
      this.elapsed += step; this.remaining = Math.max(0, this.remaining - step);
      this.resolveOutcome();
    } else if (this.state === 'ending') {
      this.endingRemaining = Math.max(0, this.endingRemaining - dt);
      if (this.endingRemaining < 1e-8) this.change('results');
    }
  }
}
