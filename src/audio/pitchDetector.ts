import { PitchDetector } from 'pitchy';

export interface LivePitchReading {
  freq: number;
  clarity: number;
  rms: number;
}

export class MicPitchTracker {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private detector: PitchDetector<Float32Array> | null = null;
  private smoothedFreq: number | null = null;
  private active = false;

  public isRunning(): boolean {
    return this.active;
  }

  public async start(
    onPitch: (reading: LivePitchReading | null) => void,
    onError?: (msg: string) => void
  ): Promise<boolean> {
    if (this.active) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.ctx = new AudioContext();
      const source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
      this.smoothedFreq = null;
      this.active = true;

      const loop = () => {
        if (!this.active || !this.analyser || !this.buffer || !this.detector || !this.ctx) {
          return;
        }
        this.analyser.getFloatTimeDomainData(this.buffer);

        let sumSq = 0;
        for (let i = 0; i < this.buffer.length; i++) {
          sumSq += this.buffer[i] * this.buffer[i];
        }
        const rms = Math.sqrt(sumSq / this.buffer.length);

        if (rms < 0.011) {
          this.smoothedFreq = null;
          onPitch(null);
        } else {
          const [pitch, clarity] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);
          if (clarity >= 0.87 && pitch >= 70 && pitch <= 1100) {
            if (this.smoothedFreq === null || Math.abs(pitch - this.smoothedFreq) / this.smoothedFreq > 0.09) {
              this.smoothedFreq = pitch;
            } else {
              this.smoothedFreq = this.smoothedFreq * 0.62 + pitch * 0.38;
            }
            onPitch({ freq: this.smoothedFreq, clarity, rms });
          } else {
            onPitch(null);
          }
        }
        this.rafId = window.requestAnimationFrame(loop);
      };

      this.rafId = window.requestAnimationFrame(loop);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      onError?.(msg);
      this.stop();
      return false;
    }
  }

  public stop(): void {
    this.active = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this.buffer = null;
    this.detector = null;
    this.smoothedFreq = null;
  }
}
