import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Ear, Flame, Home, Keyboard, Music2 } from 'lucide-react';
import { OnboardingModal } from './components/OnboardingModal';
import {
  computeStreakStats,
  db,
  ensureInitialized,
  getRecommendedTodayStyle,
  type EarStat,
  type KeyboardExercise,
  type MissedDayLog,
  type PracticeSession,
  type RepertoireSong,
  type UserSettings,
  type VoiceCheckpoint,
} from './data/db';
import type { VocalStyle } from './data/vocalCurriculum';
import { Dashboard } from './pages/Dashboard';
import { EarTraining } from './pages/EarTraining';
import { KeyboardLab } from './pages/KeyboardLab';
import { ProgressVault } from './pages/ProgressVault';
import { SessionRunner } from './pages/SessionRunner';

type NavView = 'dashboard' | 'session' | 'ear' | 'keyboard' | 'vault';

export function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<NavView>('dashboard');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [missedDays, setMissedDays] = useState<MissedDayLog[]>([]);
  const [exercises, setExercises] = useState<KeyboardExercise[]>([]);
  const [songs, setSongs] = useState<RepertoireSong[]>([]);
  const [earStats, setEarStats] = useState<EarStat[]>([]);
  const [checkpoints, setCheckpoints] = useState<VoiceCheckpoint[]>([]);

  // Active guided session launch params
  const [activeSessionStyle, setActiveSessionStyle] = useState<VocalStyle>('hindustani');
  const [activeSessionMode, setActiveSessionMode] = useState<'full' | 'quick5'>('full');

  const refreshAll = useCallback(async () => {
    const s = await ensureInitialized();
    const [sess, missed, ex, sg, ear, cp] = await Promise.all([
      db.sessions.toArray(),
      db.missedDays.toArray(),
      db.keyboardExercises.toArray(),
      db.songs.toArray(),
      db.earStats.toArray(),
      db.voiceCheckpoints.toArray(),
    ]);
    setSettings(s);
    setSessions(sess);
    setMissedDays(missed);
    setExercises(ex);
    setSongs(sg);
    setEarStats(ear);
    setCheckpoints(cp);
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const updateSettings = async (patch: Partial<UserSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    await db.settings.put(next);
    setSettings(next);
  };

  const stats = useMemo(
    () => computeStreakStats(sessions, checkpoints, missedDays),
    [sessions, checkpoints, missedDays]
  );

  const recommendedStyle = useMemo(
    () => (settings ? getRecommendedTodayStyle(settings, sessions) : 'hindustani'),
    [settings, sessions]
  );

  if (!ready || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0e0d] text-stone-400 text-sm">
        Warming up SwaraKeys Studio…
      </div>
    );
  }

  const navItems: Array<{ id: NavView; label: string; icon: typeof Home }> = [
    { id: 'dashboard', label: 'Today', icon: Home },
    { id: 'ear', label: 'Ear Training', icon: Ear },
    { id: 'keyboard', label: 'Keyboard & Songs', icon: Keyboard },
    { id: 'vault', label: 'Vault & Settings', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-[#0f0e0d] text-[#f3efe8] flex flex-col">
      {!settings.onboardingCompleted && (
        <OnboardingModal
          initialSettings={settings}
          onComplete={(updated) => void updateSettings(updated)}
        />
      )}

      {/* Top Studio Header */}
      <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#0f0e0d]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-300">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold tracking-tight text-stone-100 leading-none">
                SwaraKeys
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Vocal · Ear · Keyboard</div>
            </div>
          </button>

          {view !== 'session' && (
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                        : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="hidden md:flex items-center gap-2 rounded-full bg-stone-900 border border-stone-800 px-3 py-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-bold text-amber-300">{stats.currentVocalStreak}d</span>
            <span className="text-stone-500">streak</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {view === 'dashboard' && (
          <Dashboard
            settings={settings}
            sessions={sessions}
            stats={stats}
            recommendedStyle={recommendedStyle}
            onStartSession={(style, mode) => {
              setActiveSessionStyle(style);
              setActiveSessionMode(mode);
              setView('session');
            }}
            onGoKeyboard={() => setView('keyboard')}
            onGoVault={() => setView('vault')}
            onChangeSa={(midi) => void updateSettings({ saMidi: midi })}
            onChangeTanpuraType={(t) => void updateSettings({ tanpuraType: t })}
            onRefreshData={() => void refreshAll()}
          />
        )}

        {view === 'session' && (
          <SessionRunner
            settings={settings}
            style={activeSessionStyle}
            mode={activeSessionMode}
            needsWeeklyCheckpoint={stats.needsWeeklyVoiceCheckpoint}
            yesterdayNote={stats.latestNoteForTomorrow}
            songs={songs}
            earStats={earStats}
            onChangeSa={(midi) => void updateSettings({ saMidi: midi })}
            onChangeTanpuraType={(t) => void updateSettings({ tanpuraType: t })}
            onRefreshData={() => void refreshAll()}
            onFinishToDashboard={() => setView('dashboard')}
            onFinishToKeyboard={() => setView('keyboard')}
          />
        )}

        {view === 'ear' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-stone-100">Dual-System Ear Training</h2>
              <p className="text-xs text-stone-400">
                Train Hindustani Swaras over the Tanpura alongside Western intervals & chords—with bridge hints connecting both systems.
              </p>
            </div>
            <EarTraining
              saMidi={settings.saMidi}
              tanpuraType={settings.tanpuraType}
              tuningMode={settings.tuningMode}
              earStats={earStats}
              onStatsUpdated={() => void refreshAll()}
              defaultSystem={recommendedStyle}
            />
          </div>
        )}

        {view === 'keyboard' && (
          <KeyboardLab
            saMidi={settings.saMidi}
            exercises={exercises}
            songs={songs}
            onRefreshData={() => void refreshAll()}
          />
        )}

        {view === 'vault' && (
          <ProgressVault
            settings={settings}
            sessions={sessions}
            checkpoints={checkpoints}
            earStats={earStats}
            onUpdateSettings={(patch) => void updateSettings(patch)}
            onRefreshData={() => void refreshAll()}
          />
        )}
      </main>
    </div>
  );
}

export default App;
