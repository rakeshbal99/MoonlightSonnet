import { useState } from 'react';
import { Calendar, Check, Music2, Sparkles, Volume2 } from 'lucide-react';
import { tanpuraEngine } from '../audio/tanpuraEngine';
import { generateDailyReminderIcs, type UserSettings } from '../data/db';
import { COMFORTABLE_SA_OPTIONS } from '../data/musicTheory';
import type { VocalStyle } from '../data/vocalCurriculum';

interface OnboardingModalProps {
  initialSettings: UserSettings;
  onComplete: (updated: UserSettings) => void;
}

export function OnboardingModal({ initialSettings, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saMidi, setSaMidi] = useState(initialSettings.saMidi);
  const [weeklyTargetDays, setWeeklyTargetDays] = useState(initialSettings.weeklyTargetDays);
  const [dailyGoalMins, setDailyGoalMins] = useState(initialSettings.dailyGoalMins);
  const [preferredStartStyle, setPreferredStartStyle] = useState<VocalStyle>(
    initialSettings.preferredStartStyle
  );
  const [reminderTime, setReminderTime] = useState(initialSettings.reminderTime);
  const [downloadedIcs, setDownloadedIcs] = useState(false);

  const handleDownloadIcs = () => {
    const ics = generateDailyReminderIcs(reminderTime, dailyGoalMins);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moonlightsonnet-daily-practice.ics';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedIcs(true);
  };

  const finish = () => {
    onComplete({
      ...initialSettings,
      onboardingCompleted: true,
      saMidi,
      weeklyTargetDays,
      dailyGoalMins,
      preferredStartStyle,
      reminderTime,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="studio-card w-full max-w-xl rounded-3xl p-6 sm:p-8 border border-amber-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100">Welcome to MoonlightSonnet</h2>
              <p className="text-xs text-stone-400">Step {step} of 3 · 1-minute studio calibration</p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? 'w-7 bg-amber-400' : s < step ? 'w-2 bg-emerald-400' : 'w-2 bg-stone-700'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-stone-100">1. Find your comfortable tonic (Sa)</h3>
              <p className="text-sm text-stone-400 mt-1">
                Tap a note below and hum gently along. Your comfortable Sa anchors both Hindustani Swaras and Western scales—you can change this anytime.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {COMFORTABLE_SA_OPTIONS.map((opt) => {
                const selected = saMidi === opt.midi;
                return (
                  <button
                    key={opt.midi}
                    type="button"
                    onClick={() => {
                      setSaMidi(opt.midi);
                      tanpuraEngine.playTestTone(opt.midi, 1.5);
                    }}
                    className={`rounded-xl p-2.5 text-left border transition cursor-pointer ${
                      selected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                        : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{opt.label}</span>
                      <Volume2 className="h-3.5 w-3.5 opacity-65" />
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{opt.indianScaleHint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-stone-100">2. Set your daily commitment</h3>
              <p className="text-sm text-stone-400 mt-1">
                Your 15–20 min Vocal + Ear session drives your streak (Keyboard can be added anytime). Hindustani & Western days alternate automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-2">
                Weekly vocal target: <span className="text-amber-300 font-semibold">{weeklyTargetDays} days / week</span>
              </label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWeeklyTargetDays(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      weeklyTargetDays === d
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-2">
                Daily vocal session duration
              </label>
              <div className="flex gap-2">
                {[15, 18, 20].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDailyGoalMins(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      dailyGoalMins === m
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-2">
                Start Day 1 with:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPreferredStartStyle('hindustani')}
                  className={`rounded-xl p-3 text-left border transition cursor-pointer ${
                    preferredStartStyle === 'hindustani'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-stone-900 border-stone-800 text-stone-300'
                  }`}
                >
                  <div className="font-semibold text-sm">Hindustani Classical</div>
                  <div className="text-xs text-stone-400 mt-0.5">Tanpura, Swar Sadhana, Alankars</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredStartStyle('western')}
                  className={`rounded-xl p-3 text-left border transition cursor-pointer ${
                    preferredStartStyle === 'western'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                      : 'bg-stone-900 border-stone-800 text-stone-300'
                  }`}
                >
                  <div className="font-semibold text-sm">Western Vocals</div>
                  <div className="text-xs text-stone-400 mt-0.5">Resonance, Scales, Song Phrases</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-stone-100">3. Lock in your daily reminder</h3>
              <p className="text-sm text-stone-400 mt-1">
                Pick a consistent daily time. Download the recurring macOS Calendar file so Apple Calendar nudges you even when your browser is closed.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm text-stone-300">Daily practice time:</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="rounded-2xl bg-stone-900/90 border border-stone-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-100">macOS Calendar Daily Alert (.ics)</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  Double-click the downloaded file to add a daily {reminderTime} reminder.
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 px-4 py-2 text-sm font-medium text-amber-200 transition cursor-pointer shrink-0"
              >
                {downloadedIcs ? <Check className="h-4 w-4 text-emerald-400" /> : <Calendar className="h-4 w-4" />}
                {downloadedIcs ? 'Downloaded' : 'Download .ics'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              className="rounded-xl px-4 py-2 text-sm text-stone-400 hover:text-stone-100 transition cursor-pointer"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 text-sm transition cursor-pointer"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-5 py-2.5 text-sm transition cursor-pointer studio-glow-amber"
            >
              <Sparkles className="h-4 w-4" /> Enter Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
