/**
 * Warm piano-like guide tone synthesizer + sample-accurate Web Audio Metronome with Auto-BPM Ramp.
 */
class SynthEngine {
  private ctx: AudioContext | null = null;
  private sequenceTimers: number[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playNote(freq: number, durationSec = 0.65, delaySec = 0, volume = 0.28): void {
    const ctx = this.ensureContext();
    const start = ctx.currentTime + delaySec;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 7, 5200), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2.2, 420), start + durationSec);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(volume, start + 0.015);
    env.gain.exponentialRampToValueAtTime(volume * 0.42, start + durationSec * 0.35);
    env.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(freq, start);

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(freq * 2, start);
    const o2Gain = ctx.createGain();
    o2Gain.gain.value = 0.28;

    const o3 = ctx.createOscillator();
    o3.type = 'sine';
    o3.frequency.setValueAtTime(freq * 3, start);
    const o3Gain = ctx.createGain();
    o3Gain.gain.value = 0.09;

    o1.connect(filter);
    o2.connect(o2Gain);
    o2Gain.connect(filter);
    o3.connect(o3Gain);
    o3Gain.connect(filter);

    filter.connect(env);
    env.connect(ctx.destination);

    o1.start(start);
    o2.start(start);
    o3.start(start);
    o1.stop(start + durationSec + 0.05);
    o2.stop(start + durationSec + 0.05);
    o3.stop(start + durationSec + 0.05);
  }

  public playChord(freqs: number[], durationSec = 1.2, delaySec = 0): void {
    const perNoteVol = Math.min(0.24, 0.55 / Math.max(1, freqs.length));
    freqs.forEach((f, idx) => {
      // Gentle micro-arpeggiation (15ms) makes chords sound natural like a keyboard
      this.playNote(f, durationSec, delaySec + idx * 0.018, perNoteVol);
    });
  }

  public stopSequence(): void {
    this.sequenceTimers.forEach((id) => window.clearTimeout(id));
    this.sequenceTimers = [];
  }

  public playSequence(
    freqs: number[],
    bpm: number,
    onStep?: (index: number) => void,
    onDone?: () => void
  ): void {
    this.stopSequence();
    const beatMs = (60 / Math.max(30, bpm)) * 1000;
    const noteDurSec = Math.max(0.22, (beatMs / 1000) * 0.88);

    freqs.forEach((freq, idx) => {
      const id = window.setTimeout(() => {
        this.playNote(freq, noteDurSec, 0, 0.26);
        onStep?.(idx);
      }, idx * beatMs);
      this.sequenceTimers.push(id);
    });

    const endId = window.setTimeout(() => {
      onStep?.(-1);
      onDone?.();
    }, freqs.length * beatMs + 120);
    this.sequenceTimers.push(endId);
  }

  public playClick(accent: boolean, timeOffsetSec = 0): void {
    const ctx = this.ensureContext();
    const start = ctx.currentTime + timeOffsetSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1180 : 820, start);
    osc.frequency.exponentialRampToValueAtTime(accent ? 540 : 410, start + 0.035);

    gain.gain.setValueAtTime(accent ? 0.32 : 0.18, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.05);
  }
}

export const synthEngine = new SynthEngine();

export interface MetronomeTick {
  beat: number; // 1-indexed
  bar: number; // 1-indexed
  bpm: number;
}

export interface MetronomeConfig {
  bpm: number;
  beatsPerBar: number;
  autoRamp: boolean;
  rampEveryBars: number;
  rampStepBpm: number;
  maxBpm: number;
}

export class MetronomeRunner {
  private timerId: number | null = null;
  private running = false;
  private beat = 0;
  private bar = 1;
  private currentBpm = 80;
  private config: MetronomeConfig = {
    bpm: 80,
    beatsPerBar: 4,
    autoRamp: false,
    rampEveryBars: 4,
    rampStepBpm: 4,
    maxBpm: 140,
  };
  private onTick: ((tick: MetronomeTick) => void) | null = null;

  public start(config: MetronomeConfig, onTick: (tick: MetronomeTick) => void): void {
    this.stop();
    this.config = { ...config };
    this.currentBpm = config.bpm;
    this.beat = 0;
    this.bar = 1;
    this.onTick = onTick;
    this.running = true;
    this.scheduleNext(0);
  }

  public updateConfig(partial: Partial<MetronomeConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.bpm !== undefined) {
      this.currentBpm = partial.bpm;
    }
  }

  private scheduleNext(delayMs: number): void {
    this.timerId = window.setTimeout(() => {
      if (!this.running) return;
      this.beat += 1;
      if (this.beat > this.config.beatsPerBar) {
        this.beat = 1;
        this.bar += 1;
        if (
          this.config.autoRamp &&
          this.config.rampEveryBars > 0 &&
          (this.bar - 1) % this.config.rampEveryBars === 0
        ) {
          this.currentBpm = Math.min(
            this.config.maxBpm,
            this.currentBpm + this.config.rampStepBpm
          );
        }
      }

      synthEngine.playClick(this.beat === 1);
      this.onTick?.({ beat: this.beat, bar: this.bar, bpm: this.currentBpm });

      const nextIntervalMs = (60 / Math.max(30, this.currentBpm)) * 1000;
      this.scheduleNext(nextIntervalMs);
    }, delayMs);
  }

  public stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
