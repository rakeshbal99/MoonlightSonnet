import { getSwarFreq } from '../data/musicTheory';

/**
 * Pure Web Audio API warm Tanpura drone synthesizer.
 * Cycles softly through 4 resonant strings: Pa (or Ma) -> High Sa -> High Sa -> Low Sa
 * with jawari-like harmonic filtering + subtle warm sub-pad.
 */
class TanpuraEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private timerId: number | null = null;
  private step = 0;
  private playing = false;

  private saMidi = 48;
  private droneType: 'Pa' | 'Ma' = 'Pa';
  private volume = 0.45;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public start(saMidi: number, droneType: 'Pa' | 'Ma' = 'Pa', volume = 0.45): void {
    this.saMidi = saMidi;
    this.droneType = droneType;
    this.volume = volume;

    if (this.playing) {
      this.stop();
    }

    const ctx = this.ensureContext();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.volume * 0.5, ctx.currentTime + 0.6);
    master.connect(ctx.destination);
    this.masterGain = master;

    this.startWarmPad(ctx, master);
    this.playing = true;
    this.step = 0;

    // Pluck immediately and then cycle smoothly every 1.15s
    this.pluckNextString();
    this.timerId = window.setInterval(() => {
      if (this.playing) {
        this.pluckNextString();
      }
    }, 1150);
  }

  private startWarmPad(ctx: AudioContext, dest: GainNode): void {
    const lowSa = getSwarFreq(this.saMidi, 0, 'just');
    const fifthOrFourth = getSwarFreq(this.saMidi, this.droneType === 'Pa' ? 7 : 5, 'just');

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = lowSa * 4.2;
    padFilter.Q.value = 1.4;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.12;
    padFilter.connect(padGain);
    padGain.connect(dest);

    const freqs = [lowSa, lowSa * 2, fifthOrFourth];
    this.padOscs = freqs.map((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = idx === 0 ? 0.55 : idx === 1 ? 0.25 : 0.2;
      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      return osc;
    });
  }

  private pluckNextString(): void {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const saLow = getSwarFreq(this.saMidi, 0, 'just');
    const saHigh = getSwarFreq(this.saMidi, 12, 'just');
    const firstString = getSwarFreq(this.saMidi, this.droneType === 'Pa' ? 7 : 5, 'just');

    // Classic 4-string tanpura cycle: Pa/Ma -> Sa' -> Sa' -> Sa
    const cycleFreqs = [firstString, saHigh, saHigh * 1.0008, saLow];
    const freq = cycleFreqs[this.step % 4];
    this.step++;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    // Jawari resonant formant filter that gently sweeps open then settles
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.2, now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 8.5, 4200), now + 0.32);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.8, now + 3.4);
    filter.Q.value = 3.2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.28, now + 0.16);
    env.gain.exponentialRampToValueAtTime(0.11, now + 1.4);
    env.gain.exponentialRampToValueAtTime(0.0008, now + 4.1);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.65;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.35;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 4.2);
    osc2.stop(now + 4.2);
  }

  public setVolume(vol: number): void {
    this.volume = vol;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol * 0.5, this.ctx.currentTime, 0.08);
    }
  }

  public updateTonic(saMidi: number, droneType: 'Pa' | 'Ma'): void {
    const wasPlaying = this.playing;
    this.saMidi = saMidi;
    this.droneType = droneType;
    if (wasPlaying) {
      this.start(saMidi, droneType, this.volume);
    }
  }

  public stop(): void {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }
    const oscsToStop = this.padOscs;
    this.padOscs = [];
    window.setTimeout(() => {
      oscsToStop.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {
          // ignore
        }
      });
    }, 260);
  }

  public playTestTone(saMidi: number, durationSec = 1.6): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const freq = getSwarFreq(saMidi, 0, 'just');
    const fifth = getSwarFreq(saMidi, 7, 'just');

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;

    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = fifth;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;

    o1.connect(filter);
    o2.connect(g2);
    g2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    o1.start(now);
    o2.start(now);
    o1.stop(now + durationSec + 0.05);
    o2.stop(now + durationSec + 0.05);
  }
}

export const tanpuraEngine = new TanpuraEngine();
