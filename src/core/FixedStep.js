// Rendering can run at any rate; gameplay always advances in equal steps.
export class FixedStep {
  constructor({ step = 1 / 60, maxSteps = 6 } = {}) {
    this.step = step;
    this.maxSteps = maxSteps;
    this.accumulator = 0;
    this.ticks = 0;
  }

  reset() { this.accumulator = 0; }

  advance(elapsed, simulate) {
    this.accumulator += Math.min(Math.max(0, elapsed), this.step * this.maxSteps);
    let count = 0;
    while (this.accumulator + 1e-9 >= this.step && count < this.maxSteps) {
      simulate(this.step);
      this.accumulator -= this.step;
      this.ticks++; count++;
    }
    return Math.max(0, this.accumulator / this.step);
  }
}
