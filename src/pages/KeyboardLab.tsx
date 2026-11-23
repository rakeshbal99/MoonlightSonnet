import { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Edit3,
  Music,
  Play,
  Plus,
  Square,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { MetronomeRunner } from '../audio/synthEngine';
import { ReferenceKeyboard } from '../components/ReferenceKeyboard';
import {
  db,
  getTodayDateStr,
  type KeyboardExercise,
  type RepertoireSong,
  type SongSection,
} from '../data/db';

interface KeyboardLabProps {
  saMidi: number;
  exercises: KeyboardExercise[];
  songs: RepertoireSong[];
  onRefreshData: () => void;
}

export function KeyboardLab({ saMidi, exercises, songs, onRefreshData }: KeyboardLabProps) {
  const [activeTab, setActiveTab] = useState<'exercises' | 'songs'>('exercises');
  const [showKeyboard, setShowKeyboard] = useState(true);

  // Metronome + Auto-Ramp state
  const metroRef = useRef<MetronomeRunner | null>(null);
  const [metroRunning, setMetroRunning] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [liveBpm, setLiveBpm] = useState(72);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [autoRamp, setAutoRamp] = useState(true);
  const [rampEveryBars, setRampEveryBars] = useState(4);
  const [rampStepBpm, setRampStepBpm] = useState(4);
  const [maxBpm, setMaxBpm] = useState(112);

  // Active keyboard session elapsed timer
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessionLoggedBanner, setSessionLoggedBanner] = useState(false);

  // Add/Edit Exercise form
  const [showExForm, setShowExForm] = useState(false);
  const [editingExId, setEditingExId] = useState<number | null>(null);
  const [exTitle, setExTitle] = useState('');
  const [exHand, setExHand] = useState<'RH' | 'LH' | 'Both'>('Both');
  const [exNotes, setExNotes] = useState('');
  const [exCurrentBpm, setExCurrentBpm] = useState(64);
  const [exTargetBpm, setExTargetBpm] = useState(100);

  // Add Song form
  const [showSongForm, setShowSongForm] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songCategory, setSongCategory] = useState<'keyboard' | 'western_vocal' | 'hindustani_vocal'>('keyboard');
  const [songKey, setSongKey] = useState('C Major');
  const [songNotes, setSongNotes] = useState('');

  // Quick Add Section state per song
  const [addingSecSongId, setAddingSecSongId] = useState<number | null>(null);
  const [newSecName, setNewSecName] = useState('');
  const [newSecBpm, setNewSecBpm] = useState(70);
  const [newSecTarget, setNewSecTarget] = useState(96);
  const [newSecNotes, setNewSecNotes] = useState('');

  // Tap tempo timestamps
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      window.clearInterval(id);
      metroRef.current?.stop();
    };
  }, []);

  const toggleMetronome = () => {
    if (!metroRef.current) metroRef.current = new MetronomeRunner();
    if (metroRunning) {
      metroRef.current.stop();
      setMetroRunning(false);
      setCurrentBeat(0);
    } else {
      setLiveBpm(bpm);
      setCurrentBar(1);
      metroRef.current.start(
        { bpm, beatsPerBar, autoRamp, rampEveryBars, rampStepBpm, maxBpm },
        (tick) => {
          setCurrentBeat(tick.beat);
          setCurrentBar(tick.bar);
          setLiveBpm(tick.bpm);
        }
      );
      setMetroRunning(true);
    }
  };

  const applyBpmChange = (next: number) => {
    const clamped = Math.max(36, Math.min(220, next));
    setBpm(clamped);
    setLiveBpm(clamped);
    if (metroRunning) {
      metroRef.current?.updateConfig({ bpm: clamped });
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent.slice(-5);
    if (recent.length >= 2) {
      const diffs = recent.slice(1).map((t, i) => t - recent[i]);
      const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      applyBpmChange(Math.round(60000 / avgMs));
    }
  };

  const loadIntoMetronome = (startBpm: number, targetBpm: number) => {
    setBpm(startBpm);
    setLiveBpm(startBpm);
    setMaxBpm(Math.max(startBpm, targetBpm));
    if (metroRunning) {
      metroRef.current?.updateConfig({ bpm: startBpm, maxBpm: Math.max(startBpm, targetBpm) });
    }
  };

  const openEditExercise = (ex: KeyboardExercise) => {
    setEditingExId(ex.id ?? null);
    setExTitle(ex.title);
    setExHand(ex.hand);
    setExNotes(ex.patternNotes);
    setExCurrentBpm(ex.currentBpm);
    setExTargetBpm(ex.targetBpm);
    setShowExForm(true);
  };

  const resetExForm = () => {
    setEditingExId(null);
    setExTitle('');
    setExHand('Both');
    setExNotes('');
    setExCurrentBpm(64);
    setExTargetBpm(100);
    setShowExForm(false);
  };

  const saveExercise = async () => {
    if (!exTitle.trim()) return;
    if (editingExId !== null) {
      await db.keyboardExercises.update(editingExId, {
        title: exTitle.trim(),
        hand: exHand,
        patternNotes: exNotes.trim(),
        currentBpm: exCurrentBpm,
        targetBpm: exTargetBpm,
      });
    } else {
      await db.keyboardExercises.add({
        title: exTitle.trim(),
        hand: exHand,
        patternNotes: exNotes.trim(),
        currentBpm: exCurrentBpm,
        targetBpm: exTargetBpm,
        createdAt: new Date().toISOString(),
      });
    }
    resetExForm();
    onRefreshData();
  };

  const bumpExerciseBpm = async (ex: KeyboardExercise, delta: number) => {
    if (!ex.id) return;
    await db.keyboardExercises.update(ex.id, {
      currentBpm: Math.max(36, ex.currentBpm + delta),
      lastPracticedDate: getTodayDateStr(),
    });
    onRefreshData();
  };

  const markExercisePracticed = async (ex: KeyboardExercise) => {
    if (!ex.id) return;
    await db.keyboardExercises.update(ex.id, {
      lastPracticedDate: getTodayDateStr(),
    });
    onRefreshData();
  };

  const deleteExercise = async (id?: number) => {
    if (!id) return;
    await db.keyboardExercises.delete(id);
    onRefreshData();
  };

  const saveSong = async () => {
    if (!songTitle.trim()) return;
    await db.songs.add({
      title: songTitle.trim(),
      category: songCategory,
      keyOrSa: songKey.trim() || 'C Major',
      notes: songNotes.trim(),
      sections: [
        {
          id: `sec-${Date.now()}`,
          name: 'Main Theme / Section 1',
          currentBpm: 72,
          targetBpm: 96,
          status: 'learning',
          notes: '',
        },
      ],
      updatedAt: new Date().toISOString(),
    });
    setSongTitle('');
    setSongNotes('');
    setShowSongForm(false);
    onRefreshData();
  };

  const addSectionToSong = async (song: RepertoireSong) => {
    if (!song.id || !newSecName.trim()) return;
    const nextSec: SongSection = {
      id: `sec-${Date.now()}`,
      name: newSecName.trim(),
      currentBpm: newSecBpm,
      targetBpm: newSecTarget,
      status: 'learning',
      notes: newSecNotes.trim(),
    };
    await db.songs.update(song.id, {
      sections: [...song.sections, nextSec],
      updatedAt: new Date().toISOString(),
    });
    setAddingSecSongId(null);
    setNewSecName('');
    setNewSecNotes('');
    onRefreshData();
  };

  const updateSection = async (song: RepertoireSong, secId: string, patch: Partial<SongSection>) => {
    if (!song.id) return;
    const updated = song.sections.map((s) => (s.id === secId ? { ...s, ...patch } : s));
    await db.songs.update(song.id, {
      sections: updated,
      updatedAt: new Date().toISOString(),
    });
    onRefreshData();
  };

  const deleteSong = async (id?: number) => {
    if (!id) return;
    await db.songs.delete(id);
    onRefreshData();
  };

  const logKeyboardSession = async () => {
    await db.sessions.add({
      date: getTodayDateStr(),
      type: 'keyboard',
      durationSec: Math.max(300, elapsedSec),
      completedAt: new Date().toISOString(),
      blocksCompleted: ['keyboard_lab'],
    });
    setElapsedSec(0);
    setSessionLoggedBanner(true);
    onRefreshData();
    window.setTimeout(() => setSessionLoggedBanner(false), 4000);
  };

  const today = getTodayDateStr();

  return (
    <div className="space-y-5">
      {/* Top Bar: Session Timer & Log Button */}
      <div className="studio-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-100">Keyboard Practice Companion</h2>
          <p className="text-xs text-stone-400">
            Log your own finger exercises, break songs into chunks, and build speed with auto-BPM ramping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-stone-400 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2">
            Session: <span className="text-sky-300 font-bold">{Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s</span>
          </div>
          <button
            type="button"
            onClick={() => void logKeyboardSession()}
            className="flex items-center gap-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-semibold px-4 py-2 text-sm transition cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" /> Log Keyboard Session
          </button>
        </div>
      </div>

      {sessionLoggedBanner && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Keyboard session logged to your Practice Heatmap!
        </div>
      )}

      {/* Auto-BPM Ramp Metronome Studio Card */}
      <div className="studio-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMetronome}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                metroRunning
                  ? 'bg-amber-500 text-stone-950 studio-glow-amber'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/25'
              }`}
            >
              {metroRunning ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              {metroRunning ? 'Stop Metronome' : 'Start Metronome'}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyBpmChange(bpm - 4)}
                className="rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1.5 text-xs font-mono text-stone-300 cursor-pointer"
              >
                -4
              </button>
              <div className="px-3 text-center">
                <div className="text-2xl font-mono font-bold text-amber-300 leading-none">
                  {metroRunning ? liveBpm : bpm}
                </div>
                <div className="text-[10px] text-stone-500 uppercase">BPM</div>
              </div>
              <button
                type="button"
                onClick={() => applyBpmChange(bpm + 4)}
                className="rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1.5 text-xs font-mono text-stone-300 cursor-pointer"
              >
                +4
              </button>
            </div>

            <button
              type="button"
              onClick={handleTapTempo}
              className="rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 px-3 py-2 text-xs text-stone-300 cursor-pointer"
            >
              Tap Tempo
            </button>
          </div>

          {/* Visual Beat LEDs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {Array.from({ length: beatsPerBar }, (_, i) => i + 1).map((b) => {
                const active = metroRunning && currentBeat === b;
                return (
                  <span
                    key={b}
                    className={`h-3.5 w-3.5 rounded-full transition-all ${
                      active
                        ? b === 1
                          ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                          : 'bg-sky-400 scale-110'
                        : 'bg-stone-800 border border-stone-700'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-mono text-stone-400">Bar {currentBar}</span>
            <select
              value={beatsPerBar}
              onChange={(e) => setBeatsPerBar(Number(e.target.value))}
              className="rounded-lg bg-stone-900 border border-stone-700 px-2 py-1 text-xs text-stone-200"
            >
              <option value={4}>4/4</option>
              <option value={3}>3/4</option>
              <option value={6}>6/8</option>
              <option value={2}>2/4</option>
            </select>
          </div>
        </div>

        {/* Slider & Auto-Ramp Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-800/80">
          <input
            type="range"
            min={40}
            max={180}
            value={bpm}
            onChange={(e) => applyBpmChange(Number(e.target.value))}
            className="flex-1 min-w-[180px] accent-amber-400 cursor-pointer"
          />

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRamp}
                onChange={(e) => setAutoRamp(e.target.checked)}
                className="accent-amber-400 rounded"
              />
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              Auto-Ramp:
            </label>
            <span>+</span>
            <input
              type="number"
              min={1}
              max={20}
              value={rampStepBpm}
              onChange={(e) => setRampStepBpm(Number(e.target.value) || 4)}
              className="w-12 rounded-md bg-stone-900 border border-stone-700 px-1.5 py-1 text-center font-mono"
            />
            <span>BPM every</span>
            <input
              type="number"
              min={1}
              max={16}
              value={rampEveryBars}
              onChange={(e) => setRampEveryBars(Number(e.target.value) || 4)}
              className="w-12 rounded-md bg-stone-900 border border-stone-700 px-1.5 py-1 text-center font-mono"
            />
            <span>bars up to</span>
            <input
              type="number"
              min={50}
              max={220}
              value={maxBpm}
              onChange={(e) => setMaxBpm(Number(e.target.value) || 120)}
              className="w-14 rounded-md bg-stone-900 border border-stone-700 px-1.5 py-1 text-center font-mono"
            />
          </div>
        </div>
      </div>

      {/* Collapsible Clickable Reference Keyboard */}
      <div className="studio-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stone-300">
            Clickable Reference Keyboard (Western + Sargam relative to your Sa)
          </span>
          <button
            type="button"
            onClick={() => setShowKeyboard((s) => !s)}
            className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
          >
            {showKeyboard ? 'Hide' : 'Show'}
          </button>
        </div>
        {showKeyboard && <ReferenceKeyboard saMidi={saMidi} startMidi={48} octaves={2} />}
      </div>

      {/* Tabs: My Finger Exercises vs My Songs & Tunes */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('exercises')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'exercises'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
            }`}
          >
            My Finger Exercises ({exercises.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('songs')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'songs'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
            }`}
          >
            Songs & Tunes ({songs.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            activeTab === 'exercises'
              ? (resetExForm(), setShowExForm(true))
              : setShowSongForm((v) => !v)
          }
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-3.5 py-2 text-xs sm:text-sm transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {activeTab === 'exercises' ? 'Add Finger Exercise' : 'Add Song / Tune'}
        </button>
      </div>

      {/* Exercises Tab */}
      {activeTab === 'exercises' && (
        <div className="space-y-3">
          {showExForm && (
            <div className="studio-card rounded-2xl p-5 space-y-3 border border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-200">
                {editingExId ? 'Edit Finger Exercise' : 'Log Your Own Finger Exercise'}
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                  placeholder="Exercise title (e.g., Hanon #1 or 1-3-2-4 drill)"
                  className="sm:col-span-2 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                />
                <select
                  value={exHand}
                  onChange={(e) => setExHand(e.target.value as 'RH' | 'LH' | 'Both')}
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="Both">Both Hands</option>
                  <option value="RH">Right Hand (RH)</option>
                  <option value="LH">Left Hand (LH)</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={exNotes}
                onChange={(e) => setExNotes(e.target.value)}
                placeholder="Fingering numbers, notes, or reminders (e.g., RH 1-2-3-4-5, watch 4th finger lift)"
                className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
              />
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
                <label className="flex items-center gap-2">
                  Current BPM:
                  <input
                    type="number"
                    value={exCurrentBpm}
                    onChange={(e) => setExCurrentBpm(Number(e.target.value) || 60)}
                    className="w-20 rounded-lg bg-stone-900 border border-stone-700 px-2 py-1 font-mono"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Target BPM:
                  <input
                    type="number"
                    value={exTargetBpm}
                    onChange={(e) => setExTargetBpm(Number(e.target.value) || 100)}
                    className="w-20 rounded-lg bg-stone-900 border border-stone-700 px-2 py-1 font-mono"
                  />
                </label>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={resetExForm}
                    className="rounded-xl px-3.5 py-2 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveExercise()}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-xs cursor-pointer"
                  >
                    Save Exercise
                  </button>
                </div>
              </div>
            </div>
          )}

          {exercises.map((ex) => {
            const pct = Math.min(100, Math.round((ex.currentBpm / Math.max(1, ex.targetBpm)) * 100));
            const doneToday = ex.lastPracticedDate === today;

            return (
              <div key={ex.id} className="studio-card rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-stone-100">{ex.title}</h4>
                      <span className="rounded-md bg-stone-800 px-2 py-0.5 text-[11px] font-mono text-stone-300">
                        {ex.hand}
                      </span>
                      {doneToday && (
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5">
                          Practiced Today
                        </span>
                      )}
                    </div>
                    {ex.patternNotes && (
                      <p className="text-xs text-stone-400 mt-1">{ex.patternNotes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadIntoMetronome(ex.currentBpm, ex.targetBpm)}
                      className="rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2.5 py-1.5 text-xs text-amber-200 cursor-pointer"
                    >
                      Load Metronome
                    </button>
                    <button
                      type="button"
                      onClick={() => void bumpExerciseBpm(ex, 4)}
                      className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 px-2.5 py-1.5 text-xs font-mono text-emerald-300 cursor-pointer"
                    >
                      +4 BPM
                    </button>
                    <button
                      type="button"
                      onClick={() => void markExercisePracticed(ex)}
                      className="h-8 w-8 rounded-lg bg-stone-900 hover:bg-emerald-500/20 border border-stone-700 flex items-center justify-center text-stone-300 hover:text-emerald-300 cursor-pointer"
                      title="Mark practiced today"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditExercise(ex)}
                      className="h-8 w-8 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-200 cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteExercise(ex.id)}
                      className="h-8 w-8 rounded-lg bg-stone-900 hover:bg-rose-500/20 border border-stone-700 flex items-center justify-center text-stone-400 hover:text-rose-300 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-stone-400 mb-1">
                    <span>Current: {ex.currentBpm} BPM</span>
                    <span>Target: {ex.targetBpm} BPM ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Songs & Tunes Tab */}
      {activeTab === 'songs' && (
        <div className="space-y-4">
          {showSongForm && (
            <div className="studio-card rounded-2xl p-5 space-y-3 border border-amber-500/30">
              <h3 className="text-sm font-semibold text-amber-200">Add a Song or Tune</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="Song or tune name"
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                />
                <select
                  value={songCategory}
                  onChange={(e) =>
                    setSongCategory(e.target.value as 'keyboard' | 'western_vocal' | 'hindustani_vocal')
                  }
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="keyboard">Keyboard Song / Tune</option>
                  <option value="western_vocal">Western Vocal Song</option>
                  <option value="hindustani_vocal">Hindustani Bandish / Song</option>
                </select>
                <input
                  type="text"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                  placeholder="Key or Sa (e.g., G Major / Sa=C#)"
                  className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
                />
              </div>
              <input
                type="text"
                value={songNotes}
                onChange={(e) => setSongNotes(e.target.value)}
                placeholder="Chords, Sargam notes, or goal..."
                className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-sm text-stone-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSongForm(false)}
                  className="rounded-xl px-3.5 py-2 text-xs text-stone-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveSong()}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-4 py-2 text-xs cursor-pointer"
                >
                  Save Song
                </button>
              </div>
            </div>
          )}

          {songs.map((song) => (
            <div key={song.id} className="studio-card rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-300 shrink-0">
                    <Music className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-stone-100">{song.title}</h4>
                      <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[10px] font-medium text-stone-300">
                        {song.category === 'keyboard'
                          ? 'Keyboard'
                          : song.category === 'western_vocal'
                            ? 'Western Vocal'
                            : 'Hindustani Vocal'}
                      </span>
                      <span className="text-xs font-mono text-amber-300">{song.keyOrSa}</span>
                    </div>
                    {song.notes && <p className="text-xs text-stone-400 mt-1">{song.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAddingSecSongId(addingSecSongId === song.id ? null : (song.id ?? null))
                    }
                    className="rounded-lg bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 text-xs text-stone-200 cursor-pointer"
                  >
                    + Section
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSong(song.id)}
                    className="h-8 w-8 rounded-lg bg-stone-900 hover:bg-rose-500/20 border border-stone-700 flex items-center justify-center text-stone-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {addingSecSongId === song.id && (
                <div className="rounded-xl bg-stone-950/80 border border-stone-700 p-3 grid sm:grid-cols-4 gap-2 text-xs">
                  <input
                    type="text"
                    value={newSecName}
                    onChange={(e) => setNewSecName(e.target.value)}
                    placeholder="Section name (e.g., Chorus)"
                    className="sm:col-span-2 rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 text-stone-100"
                  />
                  <input
                    type="number"
                    value={newSecBpm}
                    onChange={(e) => setNewSecBpm(Number(e.target.value) || 70)}
                    placeholder="Cur BPM"
                    className="rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 font-mono text-stone-100"
                  />
                  <input
                    type="number"
                    value={newSecTarget}
                    onChange={(e) => setNewSecTarget(Number(e.target.value) || 96)}
                    placeholder="Target BPM"
                    className="rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 font-mono text-stone-100"
                  />
                  <input
                    type="text"
                    value={newSecNotes}
                    onChange={(e) => setNewSecNotes(e.target.value)}
                    placeholder="Notes (chords, left-hand pattern, lyrics cue...)"
                    className="sm:col-span-3 rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => void addSectionToSong(song)}
                    className="rounded-lg bg-amber-500 text-stone-950 font-semibold py-1.5 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="grid gap-2">
                {song.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="rounded-xl bg-stone-900/80 border border-stone-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-200">{sec.name}</div>
                      {sec.notes && <div className="text-xs text-stone-400">{sec.notes}</div>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => loadIntoMetronome(sec.currentBpm, sec.targetBpm)}
                        className="rounded-md bg-stone-800 hover:bg-stone-700 px-2 py-1 font-mono text-amber-200 cursor-pointer"
                      >
                        {sec.currentBpm} / {sec.targetBpm} BPM
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSection(song, sec.id, { currentBpm: sec.currentBpm + 4 })
                        }
                        className="rounded-md bg-emerald-500/15 text-emerald-300 px-2 py-1 font-mono cursor-pointer"
                      >
                        +4
                      </button>
                      <select
                        value={sec.status}
                        onChange={(e) =>
                          void updateSection(song, sec.id, {
                            status: e.target.value as SongSection['status'],
                          })
                        }
                        className={`rounded-md border px-2 py-1 text-xs cursor-pointer ${
                          sec.status === 'clean'
                            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                            : sec.status === 'rough'
                              ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                              : 'bg-stone-950 border-stone-700 text-stone-300'
                        }`}
                      >
                        <option value="learning">Learning</option>
                        <option value="rough">Rough</option>
                        <option value="clean">Clean</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
