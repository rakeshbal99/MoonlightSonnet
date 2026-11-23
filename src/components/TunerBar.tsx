import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { MicPitchTracker } from '../audio/pitchDetector';
import { analyzePitch, type PitchAnalysis, type TuningMode } from '../data/musicTheory';

interface TunerBarProps {
  saMidi: number;
  tuningMode: TuningMode;
  primarySystem: 'hindustani' | 'western';
  autoStart?: boolean;
  compact?: boolean;
  /** Optional target semitone from Sa (0..11) for ear-training sing-back verification */
  targetSemitone?: number | null;
  onTargetMatched?: () => void;
}

export function TunerBar({
  saMidi,
  tuningMode,
  primarySystem,
  autoStart = false,
  compact = false,
  targetSemitone = null,
  onTargetMatched,
}: TunerBarProps) {
  const trackerRef = useRef<MicPitchTracker | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PitchAnalysis | null>(null);
  const [matchProgress, setMatchProgress] = useState(0);

  const matchStartRef = useRef<number | null>(null);
  const matchedFiredRef = useRef(false);

  const saMidiRef = useRef(saMidi);
  const tuningRef = useRef(tuningMode);
  const targetRef = useRef(targetSemitone);
  const onMatchedRef = useRef(onTargetMatched);

  saMidiRef.current = saMidi;
  tuningRef.current = tuningMode;
  targetRef.current = targetSemitone;
  onMatchedRef.current = onTargetMatched;

  useEffect(() => {
    matchStartRef.current = null;
    matchedFiredRef.current = false;
    setMatchProgress(0);
  }, [targetSemitone]);

  const stopMic = () => {
    trackerRef.current?.stop();
    setListening(false);
    setAnalysis(null);
    setMatchProgress(0);
    matchStartRef.current = null;
  };

  const startMic = async () => {
    setError(null);
    if (!trackerRef.current) {
      trackerRef.current = new MicPitchTracker();
    }
    const ok = await trackerRef.current.start(
      (reading) => {
        if (!reading) {
          setAnalysis(null);
          matchStartRef.current = null;
          setMatchProgress(0);
          return;
        }
        const info = analyzePitch(reading.freq, saMidiRef.current, tuningRef.current);
        setAnalysis(info);

        if (targetRef.current !== null && targetRef.current !== undefined && !matchedFiredRef.current) {
          const semitoneMatches = info.swar.semitone === ((targetRef.current % 12) + 12) % 12;
          const withinCents = Math.abs(info.activeCents) <= 24;
          if (semitoneMatches && withinCents) {
            if (matchStartRef.current === null) {
              matchStartRef.current = performance.now();
            }
            const elapsed = performance.now() - matchStartRef.current;
            const pct = Math.min(100, Math.round((elapsed / 550) * 100));
            setMatchProgress(pct);
            if (elapsed >= 550) {
              matchedFiredRef.current = true;
              onMatchedRef.current?.();
            }
          } else {
            matchStartRef.current = null;
            setMatchProgress(0);
          }
        }
      },
      (msg) => setError(msg)
    );
    if (ok) setListening(true);
  };

  useEffect(() => {
    if (autoStart) {
      void startMic();
    }
    return () => {
      trackerRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cents = analysis ? Math.max(-50, Math.min(50, analysis.activeCents)) : 0;
  const inTune = analysis !== null && Math.abs(analysis.activeCents) <= 15;
  const closeTune = analysis !== null && Math.abs(analysis.activeCents) <= 28;
  const indicatorLeftPct = 50 + cents; // 0% = -50c, 50% = 0c, 100% = +50c

  return (
    <div className={`studio-card rounded-2xl ${compact ? 'p-3.5' : 'p-4'} transition-all`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (listening ? stopMic() : void startMic())}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition cursor-pointer ${
              listening
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            {listening ? <Mic className="h-4 w-4 animate-pulse" /> : <MicOff className="h-4 w-4" />}
            {listening ? 'Mic Listening' : 'Enable Pitch Tuner'}
          </button>

          {analysis ? (
            <div className="flex items-baseline gap-2.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  inTune ? 'text-emerald-400' : closeTune ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {primarySystem === 'hindustani' ? analysis.swarDisplay : analysis.westernNote}
              </span>
              <span className="text-sm text-stone-400">
                {primarySystem === 'hindustani'
                  ? `${analysis.swar.name} · ${analysis.westernNote}`
                  : `${analysis.swarDisplay} (${analysis.swar.name})`}
              </span>
              <span className="hidden sm:inline text-xs font-mono text-stone-500">
                {analysis.freq.toFixed(1)} Hz
              </span>
            </div>
          ) : (
            <span className="text-sm text-stone-400">
              {listening ? 'Sing a steady note…' : 'Tap to check your pitch stability live'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {analysis && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono font-semibold ${
                inTune
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : closeTune
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {analysis.activeCents > 0 ? `+${analysis.activeCents}c` : `${analysis.activeCents}c`}{' '}
              {inTune ? 'In Tune' : analysis.activeCents < 0 ? 'Flat' : 'Sharp'}
            </span>
          )}
          <span className="rounded-full bg-stone-800/80 px-2.5 py-0.5 text-stone-400">
            {tuningMode === 'just' ? 'Just Intonation' : '12-TET'}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-400">
          Mic error: {error}. Check browser microphone permissions for localhost.
        </p>
      )}

      {/* Horizontal Cent Meter */}
      <div className="mt-3.5">
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-stone-900 border border-stone-800">
          {/* Sweet-spot ±15c zone (35% to 65%) */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/18 border-x border-emerald-500/35"
            style={{ left: '35%', width: '30%' }}
          />
          {/* Center tick */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-stone-500/70" />
          {/* Live needle */}
          {analysis && (
            <div
              className={`absolute top-0.5 bottom-0.5 w-2.5 -translate-x-1/2 rounded-full transition-all duration-75 ${
                inTune
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                  : closeTune
                    ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]'
                    : 'bg-rose-400'
              }`}
              style={{ left: `${indicatorLeftPct}%` }}
            />
          )}
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-mono text-stone-500">
          <span>-50c Flat</span>
          <span className="text-emerald-500/80">±15c Target</span>
          <span>+50c Sharp</span>
        </div>
      </div>

      {/* Optional Sing-Back Lock Progress */}
      {targetSemitone !== null && targetSemitone !== undefined && listening && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span>Hold target pitch to verify sing-back</span>
            <span className="font-mono text-emerald-300">{matchProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-75"
              style={{ width: `${matchProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
