import { useEffect, useState } from 'react';
import { Volume2, Play, Square } from 'lucide-react';
import { tanpuraEngine } from '../audio/tanpuraEngine';
import { COMFORTABLE_SA_OPTIONS, midiToNoteName } from '../data/musicTheory';

interface TanpuraBarProps {
  saMidi: number;
  tanpuraType: 'Pa' | 'Ma';
  onChangeSa: (midi: number) => void;
  onChangeType: (t: 'Pa' | 'Ma') => void;
}

export function TanpuraBar({ saMidi, tanpuraType, onChangeSa, onChangeType }: TanpuraBarProps) {
  const [playing, setPlaying] = useState(tanpuraEngine.isPlaying());
  const [volume, setVolume] = useState(0.45);

  useEffect(() => {
    tanpuraEngine.updateTonic(saMidi, tanpuraType);
  }, [saMidi, tanpuraType]);

  const toggle = () => {
    if (tanpuraEngine.isPlaying()) {
      tanpuraEngine.stop();
      setPlaying(false);
    } else {
      tanpuraEngine.start(saMidi, tanpuraType, volume);
      setPlaying(true);
    }
  };

  const handleVolume = (v: number) => {
    setVolume(v);
    tanpuraEngine.setVolume(v);
  };

  return (
    <div className="studio-card rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition cursor-pointer ${
            playing
              ? 'bg-amber-500 text-stone-950 studio-glow-amber hover:bg-amber-400'
              : 'bg-stone-800 text-amber-200 border border-amber-500/25 hover:bg-stone-700'
          }`}
        >
          {playing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          Tanpura {playing ? 'On' : 'Off'}
        </button>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-400">Sa:</label>
          <select
            value={saMidi}
            onChange={(e) => onChangeSa(Number(e.target.value))}
            className="rounded-lg bg-stone-900 border border-stone-700 px-2.5 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-400"
          >
            {COMFORTABLE_SA_OPTIONS.map((opt) => (
              <option key={opt.midi} value={opt.midi}>
                {opt.label} — {opt.indianScaleHint}
              </option>
            ))}
          </select>
        </div>

        <div className="flex rounded-lg bg-stone-900 border border-stone-800 p-0.5 text-xs">
          {(['Pa', 'Ma'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChangeType(t)}
              className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                tanpuraType === t ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sa-{t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Volume2 className="h-4 w-4 text-stone-400" />
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolume(Number(e.target.value))}
          className="w-24 accent-amber-400 cursor-pointer"
          aria-label="Tanpura volume"
        />
        <span className="text-xs font-mono text-stone-400 w-10">
          {midiToNoteName(saMidi)}
        </span>
      </div>
    </div>
  );
}
