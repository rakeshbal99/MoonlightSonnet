import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Download,
  Mic,
  Settings,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import { VoiceClipRecorder } from '../audio/recorder';
import {
  db,
  exportAllDataJson,
  generateDailyReminderIcs,
  getTodayDateStr,
  importAllDataJson,
  type EarStat,
  type PracticeSession,
  type UserSettings,
  type VoiceCheckpoint,
} from '../data/db';
import { COMFORTABLE_SA_OPTIONS, midiToNoteName } from '../data/musicTheory';

interface ProgressVaultProps {
  settings: UserSettings;
  sessions: PracticeSession[];
  checkpoints: VoiceCheckpoint[];
  earStats: EarStat[];
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onRefreshData: () => void;
}

export function ProgressVault({
  settings,
  sessions,
  checkpoints,
  earStats,
  onUpdateSettings,
  onRefreshData,
}: ProgressVaultProps) {
  const recorderRef = useRef<VoiceClipRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clipNote, setClipNote] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((e) => Math.min(20, e + 1)), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const startRec = async () => {
    if (!recorderRef.current) recorderRef.current = new VoiceClipRecorder();
    setElapsed(0);
    try {
      await recorderRef.current.start(20, async (clip) => {
        setRecording(false);
        await saveCheckpoint(clip.audioDataUrl, clip.durationSec);
      });
      setRecording(true);
    } catch {
      setStatusMsg('Could not access microphone.');
    }
  };

  const stopRec = async () => {
    const clip = await recorderRef.current?.stop();
    setRecording(false);
    if (clip) {
      await saveCheckpoint(clip.audioDataUrl, clip.durationSec);
    }
  };

  const saveCheckpoint = async (audioDataUrl: string, durationSec: number) => {
    await db.voiceCheckpoints.add({
      date: getTodayDateStr(),
      createdAt: new Date().toISOString(),
      saMidi: settings.saMidi,
      style: settings.lastVocalStyle,
      durationSec,
      note: clipNote.trim() || 'Voice checkpoint',
      audioDataUrl,
    });
    setClipNote('');
    onRefreshData();
    setStatusMsg('Saved 20s voice checkpoint locally.');
  };

  const deleteCheckpoint = async (id?: number) => {
    if (!id) return;
    await db.voiceCheckpoints.delete(id);
    onRefreshData();
  };

  const handleExportJson = async () => {
    const json = await exportAllDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moonlightsonnet-backup-${getTodayDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Backup JSON downloaded.');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      await importAllDataJson(text);
      onRefreshData();
      setStatusMsg('Backup restored successfully!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Failed to import backup.');
    }
  };

  const handleDownloadIcs = () => {
    const ics = generateDailyReminderIcs(settings.reminderTime, settings.dailyGoalMins);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moonlightsonnet-daily-practice.ics';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Downloaded macOS Calendar (.ics) recurring reminder.');
  };

  const handleTestNotification = async () => {
    if (!('Notification' in window)) {
      setStatusMsg('Browser notifications are not supported here.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('MoonlightSonnet Reminder', {
        body: 'Time for your 15–20 min vocal & ear practice! Even 5-Min Streak Saver counts.',
      });
      setStatusMsg('Browser notification permission granted.');
    } else {
      setStatusMsg('Notification permission denied.');
    }
  };

  const sortedEar = [...earStats]
    .filter((s) => s.attempts > 0)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);

  const recentSessions = [...sessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 15);

  return (
    <div className="space-y-5">
      {statusMsg && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-500/35 px-4 py-2.5 text-sm text-amber-200 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Checkpoints Vault */}
      <div className="studio-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-100">Voice Checkpoint Vault</h2>
            <p className="text-xs text-stone-400">
              Record a 20-second clip every week to hear your pitch stability and tone grow over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={clipNote}
              onChange={(e) => setClipNote(e.target.value)}
              placeholder="Clip label (e.g., Bilawal Sa-Pa)"
              className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100"
            />
            {!recording ? (
              <button
                type="button"
                onClick={() => void startRec()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" /> Record 20s Clip
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void stopRec()}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 text-white px-3.5 py-2 text-xs font-semibold animate-pulse cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Stop ({elapsed}s / 20s)
              </button>
            )}
          </div>
        </div>

        {checkpoints.length === 0 ? (
          <p className="text-sm text-stone-500">
            No voice checkpoints recorded yet. Record your Week 1 baseline today!
          </p>
        ) : (
          <div className="space-y-2.5">
            {[...checkpoints]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((cp) => (
                <div
                  key={cp.id}
                  className="rounded-xl bg-stone-900/90 border border-stone-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-stone-100">{cp.note}</div>
                    <div className="text-xs text-stone-400">
                      {cp.date} · Sa = {midiToNoteName(cp.saMidi)} · {cp.durationSec}s
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio src={cp.audioDataUrl} controls className="h-9 max-w-[260px]" />
                    <button
                      type="button"
                      onClick={() => void deleteCheckpoint(cp.id)}
                      className="h-8 w-8 rounded-lg bg-stone-950 hover:bg-rose-500/20 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Ear Training Weak Spots & Session Log */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="studio-card rounded-2xl p-5 space-y-3">
          <h3 className="text-base font-semibold text-stone-100">Ear Training Accuracy</h3>
          <p className="text-xs text-stone-400">
            Sorted from weakest to strongest—items at the top appear more often in Ear Sprints.
          </p>
          {sortedEar.length === 0 ? (
            <p className="text-sm text-stone-500">Complete an Ear Training drill to populate stats.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sortedEar.map((stat) => {
                const pct = Math.round((stat.correct / stat.attempts) * 100);
                return (
                  <div
                    key={stat.id}
                    className="rounded-xl bg-stone-900/80 border border-stone-800 px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-stone-200">{stat.label}</div>
                      <div className="text-[10px] text-stone-500">
                        {stat.correct}/{stat.attempts} correct
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        pct >= 80 ? 'text-emerald-400' : pct >= 55 ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="studio-card rounded-2xl p-5 space-y-3">
          <h3 className="text-base font-semibold text-stone-100">Recent Practice Log</h3>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-stone-500">Your completed sessions will appear here.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl bg-stone-900/80 border border-stone-800 px-3.5 py-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200">
                      {s.type === 'keyboard'
                        ? 'Keyboard Session'
                        : s.type === 'quick5'
                          ? `5-Min Streak Saver (${s.vocalStyle})`
                          : `${s.vocalStyle === 'hindustani' ? 'Hindustani' : 'Western'} Vocal Session`}
                    </span>
                    <span className="font-mono text-stone-400">
                      {s.date} · {Math.max(1, Math.round(s.durationSec / 60))}m
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-stone-400">
                    {s.vocalFeel && <span>Voice: {s.vocalFeel}</span>}
                    {s.earTotal ? (
                      <span>
                        Ear: {s.earScore}/{s.earTotal}
                      </span>
                    ) : null}
                  </div>
                  {s.noteForTomorrow && (
                    <p className="text-[11px] text-amber-300/90 italic">“{s.noteForTomorrow}”</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Studio Settings, Reminders & JSON Backup */}
      <div className="studio-card rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-amber-300" />
          <h3 className="text-base font-semibold text-stone-100">Studio Settings, Reminders & Backup</h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Default Sa (Tonic)</label>
            <select
              value={settings.saMidi}
              onChange={(e) => onUpdateSettings({ saMidi: Number(e.target.value) })}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100"
            >
              {COMFORTABLE_SA_OPTIONS.map((opt) => (
                <option key={opt.midi} value={opt.midi}>
                  {opt.label} ({opt.indianScaleHint})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Weekly Vocal Target</label>
            <select
              value={settings.weeklyTargetDays}
              onChange={(e) => onUpdateSettings({ weeklyTargetDays: Number(e.target.value) })}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100"
            >
              {[3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d} days / week
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Daily Goal Minutes</label>
            <select
              value={settings.dailyGoalMins}
              onChange={(e) => onUpdateSettings({ dailyGoalMins: Number(e.target.value) })}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100"
            >
              {[15, 18, 20].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Daily Reminder Time</label>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => onUpdateSettings({ reminderTime: e.target.value })}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="flex items-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 px-4 py-2 text-xs font-medium text-amber-200 cursor-pointer"
          >
            <Calendar className="h-4 w-4" /> Download macOS Calendar (.ics)
          </button>

          <button
            type="button"
            onClick={() => void handleTestNotification()}
            className="flex items-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 px-4 py-2 text-xs font-medium text-stone-200 cursor-pointer"
          >
            <Bell className="h-4 w-4" /> Enable Browser Reminder
          </button>

          <div className="sm:ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleExportJson()}
              className="flex items-center gap-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 px-4 py-2 text-xs font-semibold text-emerald-200 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Export JSON Backup
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportJson(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 px-4 py-2 text-xs font-medium text-stone-300 cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Import Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
