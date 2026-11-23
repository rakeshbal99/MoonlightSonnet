export type TuningMode = 'just' | 'equal';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface SwarDef {
  semitone: number;
  short: string;
  name: string;
  hindustaniType: 'achal' | 'shuddha' | 'komal' | 'teevra';
  westernIntervalShort: string;
  westernIntervalName: string;
  justRatio: number;
  justRatioLabel: string;
}

export const SWARAS: SwarDef[] = [
  { semitone: 0, short: 'S', name: 'Sa (Shadja)', hindustaniType: 'achal', westernIntervalShort: 'P1', westernIntervalName: 'Unison', justRatio: 1, justRatioLabel: '1:1' },
  { semitone: 1, short: 'r', name: 'Komal Re', hindustaniType: 'komal', westernIntervalShort: 'm2', westernIntervalName: 'Minor 2nd', justRatio: 16 / 15, justRatioLabel: '16:15' },
  { semitone: 2, short: 'R', name: 'Shuddha Re', hindustaniType: 'shuddha', westernIntervalShort: 'M2', westernIntervalName: 'Major 2nd', justRatio: 9 / 8, justRatioLabel: '9:8' },
  { semitone: 3, short: 'g', name: 'Komal Ga', hindustaniType: 'komal', westernIntervalShort: 'm3', westernIntervalName: 'Minor 3rd', justRatio: 6 / 5, justRatioLabel: '6:5' },
  { semitone: 4, short: 'G', name: 'Shuddha Ga', hindustaniType: 'shuddha', westernIntervalShort: 'M3', westernIntervalName: 'Major 3rd', justRatio: 5 / 4, justRatioLabel: '5:4' },
  { semitone: 5, short: 'm', name: 'Shuddha Ma', hindustaniType: 'shuddha', westernIntervalShort: 'P4', westernIntervalName: 'Perfect 4th', justRatio: 4 / 3, justRatioLabel: '4:3' },
  { semitone: 6, short: 'M', name: 'Teevra Ma', hindustaniType: 'teevra', westernIntervalShort: 'TT', westernIntervalName: 'Tritone', justRatio: 45 / 32, justRatioLabel: '45:32' },
  { semitone: 7, short: 'P', name: 'Pa (Pancham)', hindustaniType: 'achal', westernIntervalShort: 'P5', westernIntervalName: 'Perfect 5th', justRatio: 3 / 2, justRatioLabel: '3:2' },
  { semitone: 8, short: 'd', name: 'Komal Dha', hindustaniType: 'komal', westernIntervalShort: 'm6', westernIntervalName: 'Minor 6th', justRatio: 8 / 5, justRatioLabel: '8:5' },
  { semitone: 9, short: 'D', name: 'Shuddha Dha', hindustaniType: 'shuddha', westernIntervalShort: 'M6', westernIntervalName: 'Major 6th', justRatio: 5 / 3, justRatioLabel: '5:3' },
  { semitone: 10, short: 'n', name: 'Komal Ni', hindustaniType: 'komal', westernIntervalShort: 'm7', westernIntervalName: 'Minor 7th', justRatio: 9 / 5, justRatioLabel: '9:5' },
  { semitone: 11, short: 'N', name: 'Shuddha Ni', hindustaniType: 'shuddha', westernIntervalShort: 'M7', westernIntervalName: 'Major 7th', justRatio: 15 / 8, justRatioLabel: '15:8' },
];

export interface WesternIntervalDef {
  semitones: number;
  short: string;
  name: string;
  swarBridge: string;
}

export const WESTERN_INTERVALS: WesternIntervalDef[] = [
  { semitones: 1, short: 'm2', name: 'Minor 2nd', swarBridge: 'Komal Re (r)' },
  { semitones: 2, short: 'M2', name: 'Major 2nd', swarBridge: 'Shuddha Re (R)' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd', swarBridge: 'Komal Ga (g)' },
  { semitones: 4, short: 'M3', name: 'Major 3rd', swarBridge: 'Shuddha Ga (G)' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th', swarBridge: 'Shuddha Ma (m)' },
  { semitones: 6, short: 'TT', name: 'Tritone', swarBridge: 'Teevra Ma (M)' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th', swarBridge: 'Pancham (P)' },
  { semitones: 8, short: 'm6', name: 'Minor 6th', swarBridge: 'Komal Dha (d)' },
  { semitones: 9, short: 'M6', name: 'Major 6th', swarBridge: 'Shuddha Dha (D)' },
  { semitones: 10, short: 'm7', name: 'Minor 7th', swarBridge: 'Komal Ni (n)' },
  { semitones: 11, short: 'M7', name: 'Major 7th', swarBridge: 'Shuddha Ni (N)' },
  { semitones: 12, short: 'P8', name: 'Octave', swarBridge: 'Taar Sa (Ṡ)' },
];

export interface ChordQualityDef {
  id: string;
  name: string;
  short: string;
  semitones: number[];
  hint: string;
}

export const CHORD_QUALITIES: ChordQualityDef[] = [
  { id: 'major', name: 'Major Triad', short: 'Maj', semitones: [0, 4, 7], hint: 'Bright, stable (S - G - P)' },
  { id: 'minor', name: 'Minor Triad', short: 'Min', semitones: [0, 3, 7], hint: 'Warm, melancholic (S - g - P)' },
  { id: 'dim', name: 'Diminished', short: 'Dim', semitones: [0, 3, 6], hint: 'Tense, compact (S - g - M)' },
  { id: 'aug', name: 'Augmented', short: 'Aug', semitones: [0, 4, 8], hint: 'Dreamy, unresolved (S - G - d)' },
  { id: 'dom7', name: 'Dominant 7th', short: '7', semitones: [0, 4, 7, 10], hint: 'Bluesy pull home (S - G - P - n)' },
];

export interface SaOption {
  midi: number;
  label: string;
  indianScaleHint: string;
}

export const COMFORTABLE_SA_OPTIONS: SaOption[] = [
  { midi: 45, label: 'A2', indianScaleHint: 'Low Baritone' },
  { midi: 46, label: 'A#2', indianScaleHint: 'Kali 5 (Low)' },
  { midi: 47, label: 'B2', indianScaleHint: 'Safed 7 (Low)' },
  { midi: 48, label: 'C3', indianScaleHint: 'Safed 1 (Common Male)' },
  { midi: 49, label: 'C#3', indianScaleHint: 'Kali 1 (Classic Male)' },
  { midi: 50, label: 'D3', indianScaleHint: 'Safed 2 (Male)' },
  { midi: 51, label: 'D#3', indianScaleHint: 'Kali 2 (Higher Male)' },
  { midi: 52, label: 'E3', indianScaleHint: 'Safed 3' },
  { midi: 53, label: 'F3', indianScaleHint: 'Safed 4' },
  { midi: 54, label: 'F#3', indianScaleHint: 'Kali 3 (Low Female)' },
  { midi: 55, label: 'G3', indianScaleHint: 'Safed 5 (Common Female)' },
  { midi: 56, label: 'G#3', indianScaleHint: 'Kali 4 (Classic Female)' },
  { midi: 57, label: 'A3', indianScaleHint: 'Safed 6 (Female)' },
  { midi: 58, label: 'A#3', indianScaleHint: 'Kali 5' },
  { midi: 59, label: 'B3', indianScaleHint: 'Safed 7' },
  { midi: 60, label: 'C4', indianScaleHint: 'Middle C (High Female)' },
];

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${note}${octave}`;
}

export function getSwarForMidi(midi: number, saMidi: number): { swar: SwarDef; octaveOffset: number } {
  const diff = Math.round(midi) - saMidi;
  const semitone = ((diff % 12) + 12) % 12;
  const octaveOffset = Math.floor(diff / 12);
  return { swar: SWARAS[semitone], octaveOffset };
}

export function formatSwarWithOctave(short: string, octaveOffset: number): string {
  if (octaveOffset < 0) return `.${short}`;
  if (octaveOffset > 0) return `${short}'`;
  return short;
}

export function getSwarFreq(saMidi: number, semitoneOffset: number, tuning: TuningMode = 'just'): number {
  if (tuning === 'equal') {
    return midiToFreq(saMidi + semitoneOffset);
  }
  const saFreq = midiToFreq(saMidi);
  const octaveShift = Math.floor(semitoneOffset / 12);
  const chromatic = ((semitoneOffset % 12) + 12) % 12;
  return saFreq * SWARAS[chromatic].justRatio * Math.pow(2, octaveShift);
}

export interface PitchAnalysis {
  freq: number;
  midiFloat: number;
  nearestMidi: number;
  westernNote: string;
  centsWestern: number;
  swar: SwarDef;
  swarOctaveOffset: number;
  swarDisplay: string;
  centsSwar: number;
  activeCents: number;
}

export function analyzePitch(freq: number, saMidi: number, tuning: TuningMode): PitchAnalysis {
  const midiFloat = freqToMidi(freq);
  const nearestMidi = Math.round(midiFloat);
  const centsWestern = Math.round((midiFloat - nearestMidi) * 100);
  const westernNote = midiToNoteName(nearestMidi);

  const saFreq = midiToFreq(saMidi);
  const octavesFromSa = Math.log2(freq / saFreq);
  const octaveOffset = Math.floor(octavesFromSa);
  const ratioInOctave = freq / (saFreq * Math.pow(2, octaveOffset));

  let bestSemitone = 0;
  let bestCents = 1200;

  for (let i = 0; i <= 12; i++) {
    const targetRatio =
      i === 12
        ? 2
        : tuning === 'just'
          ? SWARAS[i].justRatio
          : Math.pow(2, i / 12);
    const centsDiff = 1200 * Math.log2(ratioInOctave / targetRatio);
    if (Math.abs(centsDiff) < Math.abs(bestCents)) {
      bestCents = centsDiff;
      bestSemitone = i;
    }
  }

  let finalOctave = octaveOffset;
  let finalSemitone = bestSemitone;
  if (bestSemitone === 12) {
    finalSemitone = 0;
    finalOctave += 1;
  }

  const swar = SWARAS[finalSemitone];
  const centsSwar = Math.round(bestCents);

  return {
    freq,
    midiFloat,
    nearestMidi,
    westernNote,
    centsWestern,
    swar,
    swarOctaveOffset: finalOctave,
    swarDisplay: formatSwarWithOctave(swar.short, finalOctave),
    centsSwar,
    activeCents: tuning === 'just' ? centsSwar : centsWestern,
  };
}
