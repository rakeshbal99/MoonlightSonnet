import { useState } from 'react';
import { synthEngine } from '../audio/synthEngine';
import {
  formatSwarWithOctave,
  getSwarForMidi,
  midiToFreq,
  midiToNoteName,
} from '../data/musicTheory';

interface ReferenceKeyboardProps {
  saMidi: number;
  startMidi?: number;
  octaves?: number;
  highlightedMidis?: number[];
  onKeyClick?: (midi: number) => void;
}

const BLACK_KEY_OFFSETS = new Set([1, 3, 6, 8, 10]);

export function ReferenceKeyboard({
  saMidi,
  startMidi = 48, // C3
  octaves = 2,
  highlightedMidis = [],
  onKeyClick,
}: ReferenceKeyboardProps) {
  const [activeMidi, setActiveMidi] = useState<number | null>(null);
  const highlightedSet = new Set(highlightedMidis);

  const keys: number[] = [];
  for (let i = 0; i < octaves * 12 + 1; i++) {
    keys.push(startMidi + i);
  }

  const whiteKeys = keys.filter((m) => !BLACK_KEY_OFFSETS.has(m % 12));

  const triggerKey = (midi: number) => {
    synthEngine.playNote(midiToFreq(midi), 0.75, 0, 0.28);
    setActiveMidi(midi);
    onKeyClick?.(midi);
    window.setTimeout(() => {
      setActiveMidi((curr) => (curr === midi ? null : curr));
    }, 220);
  };

  return (
    <div className="select-none overflow-x-auto pb-1">
      <div className="relative flex min-w-[600px] h-36 rounded-xl overflow-hidden border border-stone-700/80 bg-stone-950 p-1">
        {whiteKeys.map((midi) => {
          const { swar, octaveOffset } = getSwarForMidi(midi, saMidi);
          const isSa = swar.semitone === 0;
          const isActive = activeMidi === midi;
          const isHighlighted = highlightedSet.has(midi);
          const nextMidi = midi + 1;
          const hasBlackRight =
            nextMidi <= startMidi + octaves * 12 && BLACK_KEY_OFFSETS.has(nextMidi % 12);

          return (
            <div key={midi} className="relative flex-1 flex">
              <button
                type="button"
                onClick={() => triggerKey(midi)}
                className={`flex-1 mx-[1px] rounded-b-lg flex flex-col justify-end items-center pb-2 transition cursor-pointer border ${
                  isActive
                    ? 'bg-amber-300 border-amber-400 text-stone-950'
                    : isHighlighted
                      ? 'bg-emerald-100 border-emerald-400 text-stone-900'
                      : isSa
                        ? 'bg-amber-50 border-amber-400/70 text-stone-900 hover:bg-amber-100'
                        : 'bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200'
                }`}
              >
                <span
                  className={`text-xs font-bold leading-none ${
                    isSa ? 'text-amber-700' : 'text-stone-700'
                  }`}
                >
                  {formatSwarWithOctave(swar.short, octaveOffset)}
                </span>
                <span className="text-[10px] font-mono text-stone-500 mt-0.5">
                  {midiToNoteName(midi)}
                </span>
              </button>

              {hasBlackRight && (
                <BlackKey
                  midi={nextMidi}
                  saMidi={saMidi}
                  isActive={activeMidi === nextMidi}
                  isHighlighted={highlightedSet.has(nextMidi)}
                  onTrigger={triggerKey}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlackKey({
  midi,
  saMidi,
  isActive,
  isHighlighted,
  onTrigger,
}: {
  midi: number;
  saMidi: number;
  isActive: boolean;
  isHighlighted: boolean;
  onTrigger: (midi: number) => void;
}) {
  const { swar, octaveOffset } = getSwarForMidi(midi, saMidi);
  const isSa = swar.semitone === 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTrigger(midi);
      }}
      className={`absolute -right-[32%] top-0 z-10 h-[62%] w-[64%] rounded-b-md flex flex-col justify-end items-center pb-1.5 transition cursor-pointer border ${
        isActive
          ? 'bg-amber-400 border-amber-300 text-stone-950'
          : isHighlighted
            ? 'bg-emerald-500 border-emerald-300 text-stone-950'
            : isSa
              ? 'bg-amber-900 border-amber-500 text-amber-200 hover:bg-amber-800'
              : 'bg-stone-900 border-stone-700 text-stone-300 hover:bg-stone-800'
      }`}
    >
      <span className="text-[10px] font-bold leading-none">
        {formatSwarWithOctave(swar.short, octaveOffset)}
      </span>
      <span className="text-[8px] font-mono opacity-75 mt-0.5">
        {midiToNoteName(midi).replace(/\d+/, '')}
      </span>
    </button>
  );
}
