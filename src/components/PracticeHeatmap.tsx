import { useMemo } from 'react';
import { getOffsetDateStr, type PracticeSession } from '../data/db';

interface PracticeHeatmapProps {
  sessions: PracticeSession[];
  weeks?: number;
}

export function PracticeHeatmap({ sessions, weeks = 12 }: PracticeHeatmapProps) {
  const daysData = useMemo(() => {
    const map = new Map<string, { vocal: boolean; keyboard: boolean; mins: number }>();
    sessions.forEach((s) => {
      const prev = map.get(s.date) || { vocal: false, keyboard: false, mins: 0 };
      if (s.type === 'vocal' || s.type === 'quick5') prev.vocal = true;
      if (s.type === 'keyboard') prev.keyboard = true;
      prev.mins += Math.round(s.durationSec / 60);
      map.set(s.date, prev);
    });

    const totalDays = weeks * 7;
    const list: Array<{
      date: string;
      vocal: boolean;
      keyboard: boolean;
      mins: number;
    }> = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = getOffsetDateStr(i);
      const entry = map.get(date) || { vocal: false, keyboard: false, mins: 0 };
      list.push({ date, ...entry });
    }
    return list;
  }, [sessions, weeks]);

  // Group into columns of 7 days
  const columns = useMemo(() => {
    const cols: Array<typeof daysData> = [];
    for (let i = 0; i < daysData.length; i += 7) {
      cols.push(daysData.slice(i, i + 7));
    }
    return cols;
  }, [daysData]);

  return (
    <div className="studio-card rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Consistency Heatmap</h3>
          <p className="text-xs text-stone-400">Last {weeks} weeks of daily practice</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-stone-800 border border-stone-700" /> None
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/85" /> Vocals
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500/80" /> Keyboard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Both
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {columns.map((col, cIdx) => (
          <div key={cIdx} className="flex flex-col gap-1.5">
            {col.map((day) => {
              let colorClass = 'bg-stone-800/75 border-stone-800';
              if (day.vocal && day.keyboard) {
                colorClass = 'bg-emerald-400 border-emerald-300/60';
              } else if (day.vocal) {
                colorClass = 'bg-amber-500/85 border-amber-400/50';
              } else if (day.keyboard) {
                colorClass = 'bg-sky-500/80 border-sky-400/50';
              }

              const label =
                day.vocal && day.keyboard
                  ? `Vocals + Keyboard (${day.mins}m)`
                  : day.vocal
                    ? `Vocals (${day.mins}m)`
                    : day.keyboard
                      ? `Keyboard (${day.mins}m)`
                      : 'No practice logged';

              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${label}`}
                  className={`h-3.5 w-3.5 rounded-[4px] border transition-transform hover:scale-125 ${colorClass}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
