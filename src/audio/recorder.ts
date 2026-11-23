export interface RecordedClip {
  audioDataUrl: string;
  durationSec: number;
}

export class VoiceClipRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  public async start(maxDurationSec = 20, onAutoStop?: (clip: RecordedClip) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.chunks = [];
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.startedAt = Date.now();
    this.mediaRecorder.start(250);

    window.setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        void this.stop().then((clip) => {
          if (clip) onAutoStop?.(clip);
        });
      }
    }, maxDurationSec * 1000);
  }

  public stop(): Promise<RecordedClip | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      const recorder = this.mediaRecorder;
      const durationSec = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));

      recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          this.cleanup();
          resolve({
            audioDataUrl: String(reader.result || ''),
            durationSec,
          });
        };
        reader.onerror = () => {
          this.cleanup();
          resolve(null);
        };
        reader.readAsDataURL(blob);
      };

      recorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
