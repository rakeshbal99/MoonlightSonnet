import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Ear, Mic, RefreshCw, Volume2, XCircle } from 'lucide-react';
import { synthEngine } from '../audio/synthEngine';
import { tanpuraEngine } from '../audio/tanpuraEngine';
import { TunerBar } from '../components/TunerBar';
import { db, type EarStat } from '../data/db';
import {
  CHORD_QUALITIES,
  getSwarFreq,
  midiToFreq,
  SWARAS,
  WESTERN_INTERVALS,
  type TuningMode,
} from '../data/musicTheory';

type EarMode = 'hindustani' | 'western_interval' | 'western_chord';

interface EarQuestion {
  statId: string;
  mode: EarMode;
  promptLabel: string;
  correctId: string;
  correctDisplay: string;
  bridgeNote: string;
  /** Target semitone offset from Sa (0..11) for optional sing-back verification */
  targetSemitoneFromSa: number | null;
  playAudio: () => void;
  options: Array<{ id: string; label: string; sub?: string }>;
}

interface EarTrainingProps {
  saMidi: number;
  tanpuraType: 'Pa' | 'Ma';
  tuningMode: TuningMode;
  earStats: EarStat[];
  onStatsUpdated: () => void;
  embeddedMode?: boolean;
  defaultSystem?: 'hindustani' | 'western';
  targetQuestions?: number;
  onSprintComplete?: (score: number, total: number) => void;
}

const SHUDDHA_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const ALL_SEMITONES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
  const weights = items.map((item) => Math.max(0.2, getWeight(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function EarTraining({
  saMidi,
  tanpuraType,
  tuningMode,
  earStats,
  onStatsUpdated,
  embeddedMode = false,
  defaultSystem = 'hindustani',
  targetQuestions = 8,
  onSprintComplete,
}: EarTrainingProps) {
  const [mode, setMode] = useState<EarMode>(
    defaultSystem === 'hindustani' ? 'hindustani' : 'western_interval'
  );
  const [hindustaniLevel, setHindustaniLevel] = useState<'shuddha' | 'all12'>('shuddha');
  const [singBackEnabled, setSingBackEnabled] = useState(false);

  const [question, setQuestion] = useState<EarQuestion | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [singMatched, setSingMatched] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sprintDone, setSprintDone] = useState(false);

  const statsMap = useMemo(() => {
    const m = new Map<string, EarStat>();
    earStats.forEach((s) => m.set(s.id, s));
    return m;
  }, [earStats]);

  const buildQuestion = useCallback(
    (activeMode: EarMode): EarQuestion => {
      if (activeMode === 'hindustani') {
        const pool = hindustaniLevel === 'shuddha' ? SHUDDHA_SEMITONES : ALL_SEMITONES;
        // Avoid trivial Sa every time by giving Sa lower weight
        const chosenSemi = weightedPick(pool, (semi) => {
          const stat = statsMap.get(`hindustani:${semi}`);
          if (!stat) return semi === 0 ? 0.5 : 1.5;
          const acc = stat.attempts > 0 ? stat.correct / stat.attempts : 0.5;
          return (semi === 0 ? 0.4 : 1) * (1.8 - acc);
        });
        const swar = SWARAS[chosenSemi];
        const saFreq = getSwarFreq(saMidi, 0, 'just');
        const targetFreq = getSwarFreq(saMidi, chosenSemi, 'just');

        return {
          statId: `hindustani:${chosenSemi}`,
          mode: 'hindustani',
          promptLabel: 'Listen to Sa, then identify the Swar',
          correctId: String(chosenSemi),
          correctDisplay: `${swar.short} — ${swar.name}`,
          bridgeNote: `Western bridge: ${swar.westernIntervalName} (${swar.westernIntervalShort}) · Ratio ${swar.justRatioLabel}`,
          targetSemitoneFromSa: chosenSemi,
          playAudio: () => {
            synthEngine.playNote(saFreq, 0.7, 0, 0.24);
            synthEngine.playNote(targetFreq, 1.15, 0.62, 0.3);
          },
          options: pool.map((s) => ({
            id: String(s),
            label: SWARAS[s].short,
            sub: SWARAS[s].name.replace('Shuddha ', '').replace(' (Shadja)', '').replace(' (Pancham)', ''),
          })),
        };
      }

      if (activeMode === 'western_interval') {
        const chosen = weightedPick(WESTERN_INTERVALS, (iv) => {
          const stat = statsMap.get(`interval:${iv.semitones}`);
          if (!stat) return 1.5;
          const acc = stat.attempts > 0 ? stat.correct / stat.attempts : 0.5;
          return 1.8 - acc;
        });

        // Anchor root around user's Sa (or ±3 semitones for variety in standalone mode)
        const rootMidi = saMidi + (embeddedMode ? 0 : Math.floor(Math.random() * 5) - 2);
        const f1 = midiToFreq(rootMidi);
        const f2 = midiToFreq(rootMidi + chosen.semitones);
        const semitoneRelativeToSa = ((rootMidi + chosen.semitones - saMidi) % 12 + 12) % 12;

        return {
          statId: `interval:${chosen.semitones}`,
          mode: 'western_interval',
          promptLabel: 'Identify the ascending Western interval',
          correctId: String(chosen.semitones),
          correctDisplay: `${chosen.short} — ${chosen.name}`,
          bridgeNote: `Hindustani bridge: ${chosen.swarBridge}`,
          targetSemitoneFromSa: semitoneRelativeToSa,
          playAudio: () => {
            synthEngine.playNote(f1, 0.65, 0, 0.26);
            synthEngine.playNote(f2, 1.0, 0.55, 0.28);
          },
          options: WESTERN_INTERVALS.map((iv) => ({
            id: String(iv.semitones),
            label: iv.short,
            sub: iv.name,
          })),
        };
      }

      // western_chord
      const chosenChord = weightedPick(CHORD_QUALITIES, (c) => {
        const stat = statsMap.get(`chord:${c.id}`);
        if (!stat) return 1.5;
        const acc = stat.attempts > 0 ? stat.correct / stat.attempts : 0.5;
        return 1.8 - acc;
      });
      const rootMidi = Math.max(48, Math.min(60, saMidi + Math.floor(Math.random() * 5)));
      const chordFreqs = chosenChord.semitones.map((st) => midiToFreq(rootMidi + st));

      return {
        statId: `chord:${chosenChord.id}`,
        mode: 'western_chord',
        promptLabel: 'Identify the chord quality',
        correctId: chosenChord.id,
        correctDisplay: chosenChord.name,
        bridgeNote: chosenChord.hint,
        targetSemitoneFromSa: null,
        playAudio: () => {
          synthEngine.playChord(chordFreqs, 1.45, 0);
        },
        options: CHORD_QUALITIES.map((c) => ({
          id: c.id,
          label: c.short,
          sub: c.name,
        })),
      };
    },
    [hindustaniLevel, saMidi, statsMap, embeddedMode]
  );

  const loadNextQuestion = useCallback(
    (nextMode: EarMode = mode, autoPlay = true) => {
      const q = buildQuestion(nextMode);
      setQuestion(q);
      setSelectedId(null);
      setSingMatched(false);
      if (autoPlay) {
        window.setTimeout(() => q.playAudio(), 180);
      }
    },
    [buildQuestion, mode]
  );

  useEffect(() => {
    loadNextQuestion(mode, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hindustaniLevel]);

  const recordStat = async (q: EarQuestion, isCorrect: boolean) => {
    const existing = await db.earStats.get(q.statId);
    await db.earStats.put({
      id: q.statId,
      system: q.mode,
      label: q.correctDisplay,
      attempts: (existing?.attempts ?? 0) + 1,
      correct: (existing?.correct ?? 0) + (isCorrect ? 1 : 0),
      lastSeen: new Date().toISOString(),
    });
    onStatsUpdated();
  };

  const handleSelectOption = async (optId: string) => {
    if (!question || selectedId !== null) return;
    setSelectedId(optId);
    const isCorrect = optId === question.correctId;
    const nextAnswered = answeredCount + 1;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    setAnsweredCount(nextAnswered);
    setCorrectCount(nextCorrect);
    await recordStat(question, isCorrect);

    if (embeddedMode && nextAnswered >= targetQuestions) {
      setSprintDone(true);
      onSprintComplete?.(nextCorrect, nextAnswered);
    }
  };

  const handleSingBackMatched = () => {
    if (!question || singMatched) return;
    setSingMatched(true);
    if (selectedId === null) {
      void handleSelectOption(question.correctId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selector & controls */}
      <div className="studio-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'hindustani' as const, label: 'Hindustani Swaras' },
            { id: 'western_interval' as const, label: 'Western Intervals' },
            { id: 'western_chord' as const, label: 'Chord Qualities' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                if (tab.id === 'hindustani' && !tanpuraEngine.isPlaying()) {
                  tanpuraEngine.start(saMidi, tanpuraType, 0.35);
                }
              }}
              className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                mode === tab.id
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mode === 'hindustani' && (
            <div className="flex rounded-lg bg-stone-900 border border-stone-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHindustaniLevel('shuddha')}
                className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                  hindustaniLevel === 'shuddha' ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400'
                }`}
              >
                7 Shuddha
              </button>
              <button
                type="button"
                onClick={() => setHindustaniLevel('all12')}
                className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                  hindustaniLevel === 'all12' ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400'
                }`}
              >
                All 12 Swaras
              </button>
            </div>
          )}

          {mode !== 'western_chord' && (
            <button
              type="button"
              onClick={() => setSingBackEnabled((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                singBackEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              Sing-Back Check {singBackEnabled ? 'On' : 'Off'}
            </button>
          )}

          <div className="text-xs font-mono text-stone-400 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5">
            Score: <span className="text-amber-300 font-bold">{correctCount}</span> / {answeredCount}
            {embeddedMode && <span className="text-stone-500"> (Goal: {targetQuestions})</span>}
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      {sprintDone && embeddedMode ? (
        <div className="studio-card rounded-2xl p-6 text-center space-y-3 border border-emerald-500/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-stone-100">Ear Sprint Complete!</h3>
          <p className="text-sm text-stone-300">
            You scored <span className="font-bold text-amber-300">{correctCount} / {answeredCount}</span>. Your adaptive weak-spot stats have been updated.
          </p>
        </div>
      ) : question ? (
        <div className="studio-card rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <Ear className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-100">{question.promptLabel}</h3>
                <p className="text-xs text-stone-400">
                  {singBackEnabled
                    ? 'Click your answer OR sing the target note into your mic to lock it in!'
                    : 'Press Play Prompt as many times as needed, then choose below.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => question.playAudio()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2.5 text-sm transition cursor-pointer studio-glow-amber"
            >
              <Volume2 className="h-4 w-4" /> Play Prompt
            </button>
          </div>

          {singBackEnabled && question.targetSemitoneFromSa !== null && (
            <TunerBar
              saMidi={saMidi}
              tuningMode={mode === 'hindustani' ? 'just' : tuningMode}
              primarySystem={mode === 'hindustani' ? 'hindustani' : 'western'}
              compact
              targetSemitone={selectedId === null ? question.targetSemitoneFromSa : null}
              onTargetMatched={handleSingBackMatched}
            />
          )}

          {/* Answer Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {question.options.map((opt) => {
              const isSelected = selectedId === opt.id;
              const isCorrect = opt.id === question.correctId;
              const revealed = selectedId !== null;

              let btnClass =
                'bg-stone-900/90 border-stone-800 text-stone-200 hover:border-amber-400/60 hover:bg-stone-800';
              if (revealed && isCorrect) {
                btnClass = 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
              } else if (revealed && isSelected && !isCorrect) {
                btnClass = 'bg-rose-500/20 border-rose-400 text-rose-200';
              } else if (revealed) {
                btnClass = 'bg-stone-900/40 border-stone-800/60 text-stone-500';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => void handleSelectOption(opt.id)}
                  className={`rounded-xl border px-3 py-3 text-center transition cursor-pointer disabled:cursor-default ${btnClass}`}
                >
                  <div className="text-base font-bold">{opt.label}</div>
                  {opt.sub && <div className="text-[11px] opacity-75 truncate mt-0.5">{opt.sub}</div>}
                </button>
              );
            })}
          </div>

          {/* Feedback & Bridge Banner */}
          {selectedId !== null && (
            <div className="rounded-xl bg-stone-900/90 border border-stone-700 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {selectedId === question.correctId ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-sm font-semibold text-stone-100">
                    {selectedId === question.correctId
                      ? singMatched
                        ? `Matched by voice! ${question.correctDisplay}`
                        : `Spot on — ${question.correctDisplay}`
                      : `Answer: ${question.correctDisplay}`}
                  </div>
                  <div className="text-xs text-amber-300/90 mt-0.5">{question.bridgeNote}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadNextQuestion(mode, true)}
                className="flex items-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 px-4 py-2 text-sm font-medium text-stone-100 transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Next Question
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
