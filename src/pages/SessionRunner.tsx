import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  Pause,
  Play,
  SkipForward,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { VoiceClipRecorder, type RecordedClip } from '../audio/recorder';
import { synthEngine } from '../audio/synthEngine';
import { tanpuraEngine } from '../audio/tanpuraEngine';
import { TanpuraBar } from '../components/TanpuraBar';
import { TunerBar } from '../components/TunerBar';
import {
  db,
  getTodayDateStr,
  type EarStat,
  type RepertoireSong,
  type UserSettings,
} from '../data/db';
import { getSwarFreq } from '../data/musicTheory';
import {
  buildDailySessionBlocks,
  type DrillItem,
  type VocalStyle,
} from '../data/vocalCurriculum';
import { EarTraining } from './EarTraining';

interface SessionRunnerProps {
  settings: UserSettings;
  style: VocalStyle;
  mode: 'full' | 'quick5';
  needsWeeklyCheckpoint: boolean;
  yesterdayNote?: { note: string; date: string };
  songs: RepertoireSong[];
  earStats: EarStat[];
  onChangeSa: (midi: number) => void;
  onChangeTanpuraType: (t: 'Pa' | 'Ma') => void;
  onRefreshData: () => void;
  onFinishToDashboard: () => void;
  onFinishToKeyboard: () => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function SessionRunner({
  settings,
  style,
  mode,
  needsWeeklyCheckpoint,
  yesterdayNote,
  songs,
  earStats,
  onChangeSa,
  onChangeTanpuraType,
  onRefreshData,
  onFinishToDashboard,
  onFinishToKeyboard,
}: SessionRunnerProps) {
  const blocks = useMemo(() => buildDailySessionBlocks(style, mode), [style, mode]);
  const [blockIdx, setBlockIdx] = useState(0);
  const [blockRemainingSec, setBlockRemainingSec] = useState(blocks[0].durationSec);
  const [totalElapsedSec, setTotalElapsedSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [earResult, setEarResult] = useState<{ score: number; total: number } | null>(null);

  // Drill playback state
  const [activeDrillId, setActiveDrillId] = useState<string | null>(null);
  const [playingDrillId, setPlayingDrillId] = useState<string | null>(null);
  const [drillBpm, setDrillBpm] = useState(80);

  // Post-session check-in state
  const [inCheckin, setInCheckin] = useState(false);
  const [vocalFeel, setVocalFeel] = useState<'tight' | 'warm' | 'open'>('warm');
  const [noteForTomorrow, setNoteForTomorrow] = useState('');
  const [saving, setSaving] = useState(false);

  // Weekly 20s voice checkpoint recorder
  const recorderRef = useRef<VoiceClipRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [recordedClip, setRecordedClip] = useState<RecordedClip | null>(null);

  const currentBlock = blocks[blockIdx];

  useEffect(() => {
    setBlockRemainingSec(blocks[blockIdx].durationSec);
    const firstDrill = blocks[blockIdx].drills?.[0];
    if (firstDrill) {
      setActiveDrillId(firstDrill.id);
      setDrillBpm(firstDrill.defaultBpm);
    } else {
      setActiveDrillId(null);
    }
    synthEngine.stopSequence();
    setPlayingDrillId(null);
  }, [blockIdx, blocks]);

  // Auto-start tanpura on Hindustani sessions (user already clicked "Start Session")
  useEffect(() => {
    if (style === 'hindustani' && !tanpuraEngine.isPlaying()) {
      tanpuraEngine.start(settings.saMidi, settings.tanpuraType, 0.42);
    }
    return () => {
      synthEngine.stopSequence();
      tanpuraEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main session clock
  useEffect(() => {
    if (!timerRunning || inCheckin) return;
    const id = window.setInterval(() => {
      setTotalElapsedSec((t) => t + 1);
      setBlockRemainingSec((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, inCheckin]);

  // Recording clock
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setRecordElapsed((e) => Math.min(20, e + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const handlePlayDrill = (drill: DrillItem) => {
    if (playingDrillId === drill.id) {
      synthEngine.stopSequence();
      setPlayingDrillId(null);
      return;
    }
    setActiveDrillId(drill.id);
    setPlayingDrillId(drill.id);
    const freqs = drill.semitones.map((semi) =>
      getSwarFreq(settings.saMidi, semi, drill.tuning)
    );
    synthEngine.playSequence(freqs, drillBpm, undefined, () => {
      setPlayingDrillId(null);
    });
  };

  const advanceBlock = () => {
    synthEngine.stopSequence();
    setPlayingDrillId(null);
    const nextDone = Array.from(new Set([...completedBlocks, currentBlock.id]));
    setCompletedBlocks(nextDone);

    if (blockIdx < blocks.length - 1) {
      setBlockIdx((i) => i + 1);
    } else {
      tanpuraEngine.stop();
      setTimerRunning(false);
      setInCheckin(true);
    }
  };

  const startVoiceCheckpoint = async () => {
    setRecordedClip(null);
    setRecordElapsed(0);
    if (!recorderRef.current) recorderRef.current = new VoiceClipRecorder();
    try {
      await recorderRef.current.start(20, (clip) => {
        setRecording(false);
        setRecordedClip(clip);
      });
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const stopVoiceCheckpoint = async () => {
    const clip = await recorderRef.current?.stop();
    setRecording(false);
    if (clip) setRecordedClip(clip);
  };

  const saveSession = async (goToKeyboard: boolean) => {
    setSaving(true);
    const today = getTodayDateStr();
    const nowIso = new Date().toISOString();

    await db.sessions.add({
      date: today,
      type: mode === 'quick5' ? 'quick5' : 'vocal',
      vocalStyle: style,
      durationSec: Math.max(60, totalElapsedSec),
      completedAt: nowIso,
      blocksCompleted: completedBlocks,
      vocalFeel,
      noteForTomorrow: noteForTomorrow.trim() || undefined,
      earScore: earResult?.score,
      earTotal: earResult?.total,
    });

    await db.settings.update('default', { lastVocalStyle: style });

    if (recordedClip?.audioDataUrl) {
      await db.voiceCheckpoints.add({
        date: today,
        createdAt: nowIso,
        saMidi: settings.saMidi,
        style,
        durationSec: recordedClip.durationSec,
        note: noteForTomorrow.trim() || `${style === 'hindustani' ? 'Hindustani' : 'Western'} weekly check-in`,
        audioDataUrl: recordedClip.audioDataUrl,
      });
    }

    onRefreshData();
    setSaving(false);
    if (goToKeyboard) {
      onFinishToKeyboard();
    } else {
      onFinishToDashboard();
    }
  };

  const vocalSongs = songs.filter(
    (s) => s.category === (style === 'hindustani' ? 'hindustani_vocal' : 'western_vocal')
  );

  if (inCheckin) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="studio-card rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/25">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-100">Session Complete!</h2>
              <p className="text-sm text-stone-400">
                {formatClock(totalElapsedSec)} logged ·{' '}
                {style === 'hindustani' ? 'Hindustani Classical' : 'Western Vocals'}
                {mode === 'quick5' ? ' (5-Min Streak Saver)' : ''}
              </p>
            </div>
          </div>

          {/* 10s Vocal Feel Check-in */}
          <div>
            <label className="block text-sm font-medium text-stone-200 mb-2.5">
              How did your voice feel today?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'tight', label: 'Tight / Cold', desc: 'Needed extra warmup' },
                  { id: 'warm', label: 'Warm & Steady', desc: 'Solid control' },
                  { id: 'open', label: 'Open & Resonant', desc: 'Effortless tone' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVocalFeel(opt.id)}
                  className={`rounded-xl p-3 text-left border transition cursor-pointer ${
                    vocalFeel === opt.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Note for Tomorrow */}
          <div>
            <label className="block text-sm font-medium text-stone-200 mb-1.5">
              1-line note for tomorrow (shown before your next session)
            </label>
            <input
              type="text"
              value={noteForTomorrow}
              onChange={(e) => setNoteForTomorrow(e.target.value)}
              placeholder="e.g., Stay lighter on Taar Sa; repeat Raag Yaman pakad slowly"
              className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Weekly 20s Voice Checkpoint */}
          <div className="rounded-2xl bg-stone-900/90 border border-stone-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-100">
                    Weekly 20s Voice Checkpoint
                  </span>
                  {needsWeeklyCheckpoint && (
                    <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5">
                      Due this week
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Record a quick scale or phrase so you can hear your tone evolve over months.
                </p>
              </div>

              {!recording ? (
                <button
                  type="button"
                  onClick={() => void startVoiceCheckpoint()}
                  className="flex items-center gap-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 px-3.5 py-2 text-xs font-semibold transition cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" /> {recordedClip ? 'Re-record' : 'Record 20s'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void stopVoiceCheckpoint()}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 text-white px-3.5 py-2 text-xs font-semibold animate-pulse cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop ({recordElapsed}s / 20s)
                </button>
              )}
            </div>

            {recordedClip && (
              <audio src={recordedClip.audioDataUrl} controls className="w-full h-9" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSession(false)}
              className="rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-medium px-5 py-2.5 text-sm transition cursor-pointer"
            >
              Save & Finish for Today
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSession(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 text-sm transition cursor-pointer studio-glow-amber"
            >
              Save & Continue to Keyboard Lab <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Session Header */}
      <div className="studio-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                style === 'hindustani'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-sky-500/20 text-sky-300'
              }`}
            >
              {style === 'hindustani' ? 'Hindustani Classical Day' : 'Western Vocals Day'}
            </span>
            {mode === 'quick5' && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 text-[11px] font-semibold">
                5-Min Streak Saver
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-stone-100 mt-1">
            Block {blockIdx + 1}/{blocks.length}: {currentBlock.title}
          </h2>
          <p className="text-xs text-stone-400">{currentBlock.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-amber-300">
              {formatClock(blockRemainingSec)}
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              Total: {formatClock(totalElapsedSec)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTimerRunning((r) => !r)}
            className="h-10 w-10 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-stone-200 cursor-pointer"
            title={timerRunning ? 'Pause timer' : 'Resume timer'}
          >
            {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={advanceBlock}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2.5 text-sm transition cursor-pointer"
          >
            {blockIdx < blocks.length - 1 ? 'Next Block' : 'Finish Session'}
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              tanpuraEngine.stop();
              synthEngine.stopSequence();
              onFinishToDashboard();
            }}
            className="h-10 w-10 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-200 cursor-pointer"
            title="Exit session"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Block Stepper */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {blocks.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBlockIdx(idx)}
            className={`rounded-xl px-3 py-2 text-left text-xs border transition cursor-pointer ${
              idx === blockIdx
                ? 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                : completedBlocks.includes(b.id)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-stone-900/70 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <div className="font-semibold truncate">
              {idx + 1}. {b.title}
            </div>
            <div className="text-[10px] opacity-75">{Math.round(b.durationSec / 60)} min</div>
          </button>
        ))}
      </div>

      {yesterdayNote && blockIdx === 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 text-xs text-amber-200">
          <span className="font-semibold">Your note from {yesterdayNote.date}:</span> “{yesterdayNote.note}”
        </div>
      )}

      {/* Persistent Tanpura & Live Tuner on vocal blocks */}
      {currentBlock.kind !== 'ear_sprint' && (
        <div className="space-y-3">
          <TanpuraBar
            saMidi={settings.saMidi}
            tanpuraType={settings.tanpuraType}
            onChangeSa={onChangeSa}
            onChangeType={onChangeTanpuraType}
          />
          <TunerBar
            saMidi={settings.saMidi}
            tuningMode={style === 'hindustani' ? 'just' : 'equal'}
            primarySystem={style}
          />
        </div>
      )}

      {/* Block Body */}
      {currentBlock.kind === 'ear_sprint' ? (
        <EarTraining
          saMidi={settings.saMidi}
          tanpuraType={settings.tanpuraType}
          tuningMode={style === 'hindustani' ? 'just' : 'equal'}
          earStats={earStats}
          onStatsUpdated={onRefreshData}
          embeddedMode
          defaultSystem={currentBlock.earSystem || style}
          targetQuestions={currentBlock.earQuestions || 8}
          onSprintComplete={(score, total) => setEarResult({ score, total })}
        />
      ) : currentBlock.kind === 'song_practice' ? (
        <div className="studio-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100">Your Vocal Repertoire</h3>
              <p className="text-xs text-stone-400">
                Focus on 1 tricky phrase or chorus. Use the tuner bar above to verify clean entries.
              </p>
            </div>
          </div>
          {vocalSongs.length === 0 ? (
            <p className="text-sm text-stone-400">
              No vocal songs logged yet—you can add songs anytime in the Keyboard & Repertoire tab, or sing any song freely with the live tuner above!
            </p>
          ) : (
            <div className="space-y-3">
              {vocalSongs.map((song) => (
                <div key={song.id} className="rounded-xl bg-stone-900/90 border border-stone-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-stone-100">{song.title}</div>
                    <span className="text-xs font-mono text-amber-300">{song.keyOrSa}</span>
                  </div>
                  {song.notes && <p className="text-xs text-stone-400 mt-1">{song.notes}</p>}
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {song.sections.map((sec) => (
                      <div key={sec.id} className="rounded-lg bg-stone-950/70 border border-stone-800 p-2.5 text-xs">
                        <div className="font-medium text-stone-200">{sec.name}</div>
                        {sec.notes && <div className="text-stone-400 mt-0.5">{sec.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tempo control for guided drills */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Guided Drill Cards
            </span>
            <div className="flex items-center gap-2 text-xs text-stone-300">
              <span>Guide Tempo:</span>
              <input
                type="range"
                min={45}
                max={132}
                value={drillBpm}
                onChange={(e) => setDrillBpm(Number(e.target.value))}
                className="w-28 accent-amber-400 cursor-pointer"
              />
              <span className="font-mono text-amber-300 w-16">{drillBpm} BPM</span>
            </div>
          </div>

          <div className="grid gap-3">
            {currentBlock.drills?.map((drill) => {
              const isSelected = activeDrillId === drill.id;
              const isPlaying = playingDrillId === drill.id;
              return (
                <div
                  key={drill.id}
                  onClick={() => {
                    setActiveDrillId(drill.id);
                    setDrillBpm(drill.defaultBpm);
                  }}
                  className={`studio-card rounded-2xl p-4 sm:p-5 transition cursor-pointer ${
                    isSelected ? 'border-amber-400/50' : 'hover:border-stone-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-stone-100">{drill.title}</h4>
                      <p className="text-xs text-stone-400">{drill.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayDrill(drill);
                      }}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                        isPlaying
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/25'
                      }`}
                    >
                      {isPlaying ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {isPlaying ? 'Stop Guide' : 'Play Reference'}
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl bg-stone-950/90 border border-stone-800 px-4 py-2.5 font-mono text-sm text-amber-200 tracking-wide">
                    {drill.notation}
                  </div>
                  <p className="mt-2.5 text-xs text-stone-300 leading-relaxed">{drill.instructions}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
