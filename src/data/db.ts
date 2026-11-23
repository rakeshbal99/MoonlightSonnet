import Dexie, { type Table } from 'dexie';
import type { TuningMode } from './musicTheory';
import type { VocalStyle } from './vocalCurriculum';

export interface UserSettings {
  id: 'default';
  onboardingCompleted: boolean;
  saMidi: number;
  tanpuraType: 'Pa' | 'Ma';
  tuningMode: TuningMode;
  weeklyTargetDays: number;
  dailyGoalMins: number;
  reminderTime: string; // HH:mm
  lastVocalStyle: VocalStyle;
  preferredStartStyle: VocalStyle;
}

export interface PracticeSession {
  id?: number;
  date: string; // YYYY-MM-DD local
  type: 'vocal' | 'keyboard' | 'quick5';
  vocalStyle?: VocalStyle;
  durationSec: number;
  completedAt: string; // ISO
  blocksCompleted: string[];
  vocalFeel?: 'tight' | 'warm' | 'open';
  noteForTomorrow?: string;
  earScore?: number;
  earTotal?: number;
}

export interface MissedDayLog {
  date: string; // YYYY-MM-DD primary key
  reason: 'busy' | 'tired' | 'voice_strained' | 'forgot' | 'rest';
  loggedAt: string;
}

export interface KeyboardExercise {
  id?: number;
  title: string;
  hand: 'RH' | 'LH' | 'Both';
  patternNotes: string;
  currentBpm: number;
  targetBpm: number;
  lastPracticedDate?: string;
  createdAt: string;
}

export interface SongSection {
  id: string;
  name: string;
  currentBpm: number;
  targetBpm: number;
  status: 'learning' | 'rough' | 'clean';
  notes: string;
}

export interface RepertoireSong {
  id?: number;
  title: string;
  category: 'keyboard' | 'hindustani_vocal' | 'western_vocal';
  keyOrSa: string;
  notes: string;
  sections: SongSection[];
  updatedAt: string;
}

export interface EarStat {
  id: string; // e.g., "hindustani:4", "interval:7", "chord:major"
  system: 'hindustani' | 'western_interval' | 'western_chord';
  label: string;
  attempts: number;
  correct: number;
  lastSeen: string;
}

export interface VoiceCheckpoint {
  id?: number;
  date: string;
  createdAt: string;
  saMidi: number;
  style: VocalStyle;
  durationSec: number;
  note: string;
  audioDataUrl: string;
}

export class SwaraKeysDB extends Dexie {
  settings!: Table<UserSettings, string>;
  sessions!: Table<PracticeSession, number>;
  missedDays!: Table<MissedDayLog, string>;
  keyboardExercises!: Table<KeyboardExercise, number>;
  songs!: Table<RepertoireSong, number>;
  earStats!: Table<EarStat, string>;
  voiceCheckpoints!: Table<VoiceCheckpoint, number>;

  constructor() {
    super('SwaraKeysDB');
    this.version(1).stores({
      settings: 'id',
      sessions: '++id, date, type, completedAt',
      missedDays: 'date',
      keyboardExercises: '++id, lastPracticedDate, createdAt',
      songs: '++id, category, updatedAt',
      earStats: 'id, system, lastSeen',
      voiceCheckpoints: '++id, date, createdAt',
    });
  }
}

export const db = new SwaraKeysDB();

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'default',
  onboardingCompleted: false,
  saMidi: 48, // C3
  tanpuraType: 'Pa',
  tuningMode: 'just',
  weeklyTargetDays: 5,
  dailyGoalMins: 18,
  reminderTime: '20:00',
  lastVocalStyle: 'western',
  preferredStartStyle: 'hindustani',
};

export function getTodayDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getOffsetDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getTodayDateStr(d);
}

export async function ensureInitialized(): Promise<UserSettings> {
  let settings = await db.settings.get('default');
  if (!settings) {
    settings = { ...DEFAULT_SETTINGS };
    await db.settings.put(settings);
  }

  const exCount = await db.keyboardExercises.count();
  if (exCount === 0) {
    const now = new Date().toISOString();
    await db.keyboardExercises.bulkAdd([
      {
        title: 'Starter: 5-Finger Independence (Editable)',
        hand: 'Both',
        patternNotes: '1-2-3-4-5-4-3-2-1 in C Major. Keep wrists level and fingers curved. Replace with your own drill!',
        currentBpm: 64,
        targetBpm: 100,
        createdAt: now,
      },
      {
        title: 'Starter: C Major Scale — 1 Octave (Editable)',
        hand: 'RH',
        patternNotes: 'Fingering RH: 1-2-3-(thumb under)1-2-3-4-5. Descending: 5-4-3-2-1-3-2-1.',
        currentBpm: 72,
        targetBpm: 112,
        createdAt: now,
      },
    ]);
  }

  const songCount = await db.songs.count();
  if (songCount === 0) {
    const now = new Date().toISOString();
    await db.songs.bulkAdd([
      {
        title: 'My First Practice Song (Edit or Delete)',
        category: 'keyboard',
        keyOrSa: 'C Major (Sa = C)',
        notes: 'Break your current tune into small loops and bump BPM by +4 once clean.',
        sections: [
          { id: 'sec-1', name: 'Intro / Right Hand Melody', currentBpm: 68, targetBpm: 92, status: 'learning', notes: 'Focus on smooth fingering' },
          { id: 'sec-2', name: 'Left Hand Chords', currentBpm: 68, targetBpm: 92, status: 'learning', notes: 'I - V - vi - IV' },
          { id: 'sec-3', name: 'Hands Together', currentBpm: 56, targetBpm: 92, status: 'rough', notes: 'Go slow first' },
        ],
        updatedAt: now,
      },
      {
        title: 'Current Western Vocal Song (Edit or Delete)',
        category: 'western_vocal',
        keyOrSa: 'G Major',
        notes: 'Focus on relaxed chorus high notes and clean breath entries.',
        sections: [
          { id: 'vsec-1', name: 'Verse 1 Pitch & Phrasing', currentBpm: 80, targetBpm: 80, status: 'learning', notes: 'Light conversational chest voice' },
          { id: 'vsec-2', name: 'Chorus Peak Line', currentBpm: 80, targetBpm: 80, status: 'rough', notes: 'Keep vowel rounded on high note' },
        ],
        updatedAt: now,
      },
    ]);
  }

  return settings;
}

export function getRecommendedTodayStyle(
  settings: UserSettings,
  sessions: PracticeSession[]
): VocalStyle {
  const vocalSessions = sessions
    .filter((s) => s.type === 'vocal' || s.type === 'quick5')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  if (vocalSessions.length === 0) {
    return settings.preferredStartStyle;
  }

  const today = getTodayDateStr();
  const latest = vocalSessions[0];
  if (latest.date === today) {
    // Already did one today, suggest the opposite if doing a bonus session
    return latest.vocalStyle === 'hindustani' ? 'western' : 'hindustani';
  }
  return latest.vocalStyle === 'hindustani' ? 'western' : 'hindustani';
}

export interface StreakStats {
  currentVocalStreak: number;
  practicedVocalToday: boolean;
  practicedKeyboardToday: boolean;
  vocalDaysThisWeek: number;
  keyboardSessionsThisWeek: number;
  totalMinutesThisWeek: number;
  needsWeeklyVoiceCheckpoint: boolean;
  missedYesterdayUnlogged: boolean;
  yesterdayDateStr: string;
  latestNoteForTomorrow?: { note: string; date: string };
}

export function computeStreakStats(
  sessions: PracticeSession[],
  checkpoints: VoiceCheckpoint[],
  missedDays: MissedDayLog[]
): StreakStats {
  const vocalDates = new Set(
    sessions.filter((s) => s.type === 'vocal' || s.type === 'quick5').map((s) => s.date)
  );
  const keyboardDates = new Set(
    sessions.filter((s) => s.type === 'keyboard').map((s) => s.date)
  );

  const today = getTodayDateStr();
  const yesterday = getOffsetDateStr(1);

  const practicedVocalToday = vocalDates.has(today);
  const practicedKeyboardToday = keyboardDates.has(today);

  // Compute consecutive vocal streak ending today or yesterday
  let streak = 0;
  let offset = practicedVocalToday ? 0 : 1;
  while (vocalDates.has(getOffsetDateStr(offset))) {
    streak++;
    offset++;
  }

  // Rolling 7 days
  const last7Dates = new Set(Array.from({ length: 7 }, (_, i) => getOffsetDateStr(i)));
  const vocalDaysThisWeek = Array.from(last7Dates).filter((d) => vocalDates.has(d)).length;
  const weekSessions = sessions.filter((s) => last7Dates.has(s.date));
  const keyboardSessionsThisWeek = weekSessions.filter((s) => s.type === 'keyboard').length;
  const totalMinutesThisWeek = Math.round(
    weekSessions.reduce((acc, s) => acc + s.durationSec, 0) / 60
  );

  // Weekly voice checkpoint check (if none in last 7 days)
  const hasRecentCheckpoint = checkpoints.some((c) => last7Dates.has(c.date));
  const needsWeeklyVoiceCheckpoint = !hasRecentCheckpoint;

  // Missed yesterday reflection check (only if user has at least 1 prior session)
  const missedSet = new Set(missedDays.map((m) => m.date));
  const hasAnyPriorSession = sessions.some((s) => s.date < yesterday);
  const missedYesterdayUnlogged =
    hasAnyPriorSession && !vocalDates.has(yesterday) && !missedSet.has(yesterday);

  // Latest note for tomorrow from previous sessions
  const sortedNotes = sessions
    .filter((s) => s.noteForTomorrow && s.noteForTomorrow.trim().length > 0)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return {
    currentVocalStreak: streak,
    practicedVocalToday,
    practicedKeyboardToday,
    vocalDaysThisWeek,
    keyboardSessionsThisWeek,
    totalMinutesThisWeek,
    needsWeeklyVoiceCheckpoint,
    missedYesterdayUnlogged,
    yesterdayDateStr: yesterday,
    latestNoteForTomorrow: sortedNotes[0]
      ? { note: sortedNotes[0].noteForTomorrow!, date: sortedNotes[0].date }
      : undefined,
  };
}

export async function exportAllDataJson(): Promise<string> {
  const [settings, sessions, missedDays, keyboardExercises, songs, earStats, voiceCheckpoints] =
    await Promise.all([
      db.settings.toArray(),
      db.sessions.toArray(),
      db.missedDays.toArray(),
      db.keyboardExercises.toArray(),
      db.songs.toArray(),
      db.earStats.toArray(),
      db.voiceCheckpoints.toArray(),
    ]);

  return JSON.stringify(
    {
      app: 'SwaraKeys',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        sessions,
        missedDays,
        keyboardExercises,
        songs,
        earStats,
        voiceCheckpoints,
      },
    },
    null,
    2
  );
}

export async function importAllDataJson(rawJson: string): Promise<void> {
  const parsed = JSON.parse(rawJson);
  const data = parsed?.data;
  if (!data || !Array.isArray(data.sessions)) {
    throw new Error('Invalid SwaraKeys backup file.');
  }

  await db.transaction(
    'rw',
    [
      db.settings,
      db.sessions,
      db.missedDays,
      db.keyboardExercises,
      db.songs,
      db.earStats,
      db.voiceCheckpoints,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.sessions.clear(),
        db.missedDays.clear(),
        db.keyboardExercises.clear(),
        db.songs.clear(),
        db.earStats.clear(),
        db.voiceCheckpoints.clear(),
      ]);
      if (data.settings?.length) await db.settings.bulkPut(data.settings);
      if (data.sessions?.length) await db.sessions.bulkPut(data.sessions);
      if (data.missedDays?.length) await db.missedDays.bulkPut(data.missedDays);
      if (data.keyboardExercises?.length) await db.keyboardExercises.bulkPut(data.keyboardExercises);
      if (data.songs?.length) await db.songs.bulkPut(data.songs);
      if (data.earStats?.length) await db.earStats.bulkPut(data.earStats);
      if (data.voiceCheckpoints?.length) await db.voiceCheckpoints.bulkPut(data.voiceCheckpoints);
    }
  );
}

export function generateDailyReminderIcs(reminderTime: string, dailyGoalMins: number): string {
  const [hhStr, mmStr] = reminderTime.split(':');
  const hh = String(Number(hhStr) || 20).padStart(2, '0');
  const mm = String(Number(mmStr) || 0).padStart(2, '0');

  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const dtStart = `${y}${mo}${da}T${hh}${mm}00`;

  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hh), Number(mm) + dailyGoalMins);
  const eh = String(endDate.getHours()).padStart(2, '0');
  const em = String(endDate.getMinutes()).padStart(2, '0');
  const dtEnd = `${y}${mo}${da}T${eh}${em}00`;

  const uid = `swarakeys-daily-${Date.now()}@local`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SwaraKeys//Daily Music Practice//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:SwaraKeys: Daily Vocal & Ear Practice (15-20m)',
    'DESCRIPTION:Open SwaraKeys (http://localhost:5173) for your daily Hindustani/Western vocal practice & ear sprint. Even 5-Min Streak Saver counts!',
    'BEGIN:VALARM',
    'TRIGGER:-PT5M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time for your daily SwaraKeys vocal practice!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
