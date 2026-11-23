import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Keyboard,
  Mic,
  Play,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { PracticeHeatmap } from '../components/PracticeHeatmap';
import { ReferenceKeyboard } from '../components/ReferenceKeyboard';
import { TanpuraBar } from '../components/TanpuraBar';
import { TunerBar } from '../components/TunerBar';
import {
  db,
  type MissedDayLog,
  type PracticeSession,
  type StreakStats,
  type UserSettings,
} from '../data/db';
import type { VocalStyle } from '../data/vocalCurriculum';

interface DashboardProps {
  settings: UserSettings;
  sessions: PracticeSession[];
  stats: StreakStats;
  recommendedStyle: VocalStyle;
  onStartSession: (style: VocalStyle, mode: 'full' | 'quick5') => void;
  onGoKeyboard: () => void;
  onGoVault: () => void;
  onChangeSa: (midi: number) => void;
  onChangeTanpuraType: (t: 'Pa' | 'Ma') => void;
  onRefreshData: () => void;
}

export function Dashboard({
  settings,
  sessions,
  stats,
  recommendedStyle,
  onStartSession,
  onGoKeyboard,
  onGoVault,
  onChangeSa,
  onChangeTanpuraType,
  onRefreshData,
}: DashboardProps) {
  const [selectedStyle, setSelectedStyle] = useState<VocalStyle>(recommendedStyle);
  const [showSandbox, setShowSandbox] = useState(false);

  const logMissedReason = async (reason: MissedDayLog['reason']) => {
    await db.missedDays.put({
      date: stats.yesterdayDateStr,
      reason,
      loggedAt: new Date().toISOString(),
    });
    onRefreshData();
  };

  const weeklyPct = Math.min(
    100,
    Math.round((stats.vocalDaysThisWeek / Math.max(1, settings.weeklyTargetDays)) * 100)
  );

  return (
    <div className="space-y-5">
      {/* Missed Yesterday Gentle Reflection */}
      {stats.missedYesterdayUnlogged && (
        <div className="studio-card rounded-2xl p-4 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-amber-200">
              Quick check-in: Yesterday ({stats.yesterdayDateStr}) had no vocal session logged
            </div>
            <div className="text-xs text-stone-400">
              No guilt—tag what got in the way so you spot patterns and bounce right back today:
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'busy', label: 'Busy' },
                { id: 'tired', label: 'Tired' },
                { id: 'voice_strained', label: 'Voice Rest' },
                { id: 'forgot', label: 'Forgot' },
                { id: 'rest', label: 'Planned Rest' },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => void logMissedReason(r.id)}
                className="rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2.5 py-1 text-xs text-stone-200 cursor-pointer"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Note from Previous Session */}
      {stats.latestNoteForTomorrow && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-amber-100">
            <span className="font-semibold text-amber-300">Note from {stats.latestNoteForTomorrow.date}:</span>{' '}
            “{stats.latestNoteForTomorrow.note}”
          </div>
        </div>
      )}

      {/* Hero Today's Session Card */}
      <div className="studio-card rounded-3xl p-6 sm:p-7 border border-amber-500/20 relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Today&apos;s Guided Habit
              </span>
              {stats.practicedVocalToday && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Vocal Goal Done Today
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              {selectedStyle === 'hindustani'
                ? 'Hindustani Classical + Ear Sprint'
                : 'Western Vocals + Ear Sprint'}
            </h1>
            <p className="text-sm text-stone-400 leading-relaxed">
              {selectedStyle === 'hindustani'
                ? 'Breath warmup → Swar Sadhana (Sa & Pa holds with Tanpura) → Bilawal Alankars & Raag phrases → 3-min Swara Ear Sprint.'
                : 'Breath & 5-tone sirens → Resonance & agility scales → Western song phrase focus → 3-min Intervals & Chords Sprint.'}
            </p>
          </div>

          {/* 1-click Style Override */}
          <div className="flex rounded-xl bg-stone-900 border border-stone-800 p-1 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedStyle('hindustani')}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                selectedStyle === 'hindustani'
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hindustani
            </button>
            <button
              type="button"
              onClick={() => setSelectedStyle('western')}
              className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                selectedStyle === 'western'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Western
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onStartSession(selectedStyle, 'full')}
            className="flex items-center gap-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-6 py-3.5 text-sm sm:text-base transition cursor-pointer studio-glow-amber"
          >
            <Play className="h-4 w-4 fill-current" />
            Start {settings.dailyGoalMins}-Min Vocal Session
          </button>

          <button
            type="button"
            onClick={() => onStartSession(selectedStyle, 'quick5')}
            className="flex items-center gap-2 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold px-4 py-3.5 text-sm transition cursor-pointer"
          >
            <Zap className="h-4 w-4 text-emerald-400" />
            5-Min Streak Saver
          </button>

          <button
            type="button"
            onClick={onGoKeyboard}
            className="flex items-center gap-2 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-sky-300 font-medium px-4 py-3.5 text-sm transition cursor-pointer"
          >
            <Keyboard className="h-4 w-4" />
            Keyboard Session
          </button>
        </div>
      </div>

      {/* Accountability Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="studio-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Vocal Streak</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-100">
            {stats.currentVocalStreak}{' '}
            <span className="text-sm font-normal text-stone-400">
              {stats.currentVocalStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {stats.practicedVocalToday ? 'Locked in for today' : 'Practice today to keep growing'}
          </div>
        </div>

        <div className="studio-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Weekly Commitment</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-100">
            {stats.vocalDaysThisWeek} / {settings.weeklyTargetDays}
            <span className="text-sm font-normal text-stone-400"> days</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-900 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${weeklyPct}%` }} />
          </div>
        </div>

        <div className="studio-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Last 7 Days</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-100">
            {stats.totalMinutesThisWeek} <span className="text-sm font-normal text-stone-400">mins</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            + {stats.keyboardSessionsThisWeek} keyboard sessions
          </div>
        </div>

        <button
          type="button"
          onClick={onGoVault}
          className="studio-card rounded-2xl p-4 text-left hover:border-amber-400/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Weekly Voice Clip</span>
            <Mic className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-stone-100">
            {stats.needsWeeklyVoiceCheckpoint ? 'Due This Week' : 'Recorded ✓'}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {stats.needsWeeklyVoiceCheckpoint
              ? 'Save a 20s clip after your session'
              : 'Listen back in Progress Vault →'}
          </div>
        </button>
      </div>

      {/* 12-Week Heatmap */}
      <PracticeHeatmap sessions={sessions} />

      {/* Collapsible Quick Studio Sandbox */}
      <div className="studio-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Quick Studio Sandbox</h3>
            <p className="text-xs text-stone-400">
              Open Tanpura, Live Pitch Tuner, and 2-Octave Reference Keyboard without starting a timer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSandbox((v) => !v)}
            className="rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3.5 py-2 text-xs font-medium text-stone-200 cursor-pointer"
          >
            {showSandbox ? 'Hide Sandbox' : 'Open Sandbox'}
          </button>
        </div>

        {showSandbox && (
          <div className="space-y-3 pt-2">
            <TanpuraBar
              saMidi={settings.saMidi}
              tanpuraType={settings.tanpuraType}
              onChangeSa={onChangeSa}
              onChangeType={onChangeTanpuraType}
            />
            <TunerBar
              saMidi={settings.saMidi}
              tuningMode={selectedStyle === 'hindustani' ? 'just' : 'equal'}
              primarySystem={selectedStyle}
            />
            <ReferenceKeyboard saMidi={settings.saMidi} startMidi={48} octaves={2} />
          </div>
        )}
      </div>
    </div>
  );
}
