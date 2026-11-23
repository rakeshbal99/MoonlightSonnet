export type VocalStyle = 'hindustani' | 'western';

export interface DrillItem {
  id: string;
  title: string;
  subtitle: string;
  style: VocalStyle | 'warmup';
  notation: string;
  instructions: string;
  /** Semitone offsets from tonic Sa (or scale root) for audio playback */
  semitones: number[];
  defaultBpm: number;
  useTanpura: boolean;
  tuning: 'just' | 'equal';
}

export const WARMUP_DRILLS: DrillItem[] = [
  {
    id: 'warmup_breath',
    title: 'Diaphragmatic Breath & Hum',
    subtitle: 'Relax jaw, drop shoulders, center airflow',
    style: 'warmup',
    notation: 'Inhale 4s  →  Hold 2s  →  Hum "Mmm" on Sa (8s)',
    instructions: 'Take 5 slow belly breaths, then hum gently on your tonic Sa feeling buzz in the lips and nose—zero throat push.',
    semitones: [0, 0],
    defaultBpm: 55,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'warmup_trill',
    title: '5-Tone Lip Trill / Gentle Siren',
    subtitle: 'Smooth vocal fold closure & range wakeup',
    style: 'warmup',
    notation: 'S  R  G  m  P  m  G  R  S   (1 - 2 - 3 - 4 - 5 - 4 - 3 - 2 - 1)',
    instructions: 'Keep cheeks relaxed and airflow steady. If lip trills stop, switch to a soft "Vvv" or "Ng" hum.',
    semitones: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    defaultBpm: 92,
    useTanpura: false,
    tuning: 'equal',
  },
];

export const HINDUSTANI_DRILLS: DrillItem[] = [
  {
    id: 'hind_sa_hold',
    title: 'Swar Sadhana — Steady Sa & Pa',
    subtitle: 'Lock pitch stability into the Tanpura drone',
    style: 'hindustani',
    notation: 'S — — —   |   P — — —   |   S — — —',
    instructions: 'Sing "Aa" or "Om" on Sa for one full breath. Watch the tuner bar stay inside the green ±15c zone without wavering.',
    semitones: [0, 7, 0],
    defaultBpm: 45,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'hind_alankar_1',
    title: 'Alankar 1 — Bilawal Straight Scale',
    subtitle: 'All Shuddha swaras (Major scale)',
    style: 'hindustani',
    notation: 'S R G m P D N S\'  |  S\' N D P m G R S',
    instructions: 'Sing clean, distinct swaras on the beat. Keep larynx relaxed as you approach D, N, and Taar Sa (S\').',
    semitones: [0, 2, 4, 5, 7, 9, 11, 12, 12, 11, 9, 7, 5, 4, 2, 0],
    defaultBpm: 80,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'hind_alankar_3',
    title: 'Alankar 2 — 3-Note Wave Pattern',
    subtitle: 'Classic agility & transition control',
    style: 'hindustani',
    notation: 'SRG  RGm  GmP  mPD  PDN  DNS\'  |  S\'ND  NDP  DPm  PmG  mGR  GRS',
    instructions: 'Maintain even volume across every triplet. Start slow at 76 BPM before nudging speed up.',
    semitones: [0, 2, 4, 2, 4, 5, 4, 5, 7, 5, 7, 9, 7, 9, 11, 9, 11, 12, 12, 11, 9, 11, 9, 7, 9, 7, 5, 7, 5, 4, 5, 4, 2, 4, 2, 0],
    defaultBpm: 88,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'hind_alankar_skip',
    title: 'Alankar 3 — Thirds Skip Pattern',
    subtitle: 'Strengthens interval accuracy & ear-voice link',
    style: 'hindustani',
    notation: 'SG  Rm  GP  mD  PN  DS\'  |  S\'D  NP  Dm  PG  mR  GS',
    instructions: 'Land cleanly on each upper note without scooping underneath. Listen for the resonant blend with the drone.',
    semitones: [0, 4, 2, 5, 4, 7, 5, 9, 7, 11, 9, 12, 12, 9, 11, 7, 9, 5, 7, 4, 5, 2, 4, 0],
    defaultBpm: 76,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'hind_raag_yaman',
    title: 'Raag Yaman — Chalan & Pakad',
    subtitle: 'Evening raag featuring Teevra Ma (M)',
    style: 'hindustani',
    notation: '.N R G M D N S\'  |  S\' N D P M G R S   (Pakad: .N R G R S, P M G R S)',
    instructions: 'Feel the serene lift on Teevra Ma (M) and rest gently on Ga (G) and Ni (N). Notice how M is a Tritone above Sa.',
    semitones: [-1, 2, 4, 6, 9, 11, 12, 12, 11, 9, 7, 6, 4, 2, 0],
    defaultBpm: 72,
    useTanpura: true,
    tuning: 'just',
  },
  {
    id: 'hind_raag_bhupali',
    title: 'Raag Bhupali — Pentatonic Flow',
    subtitle: '5-note raag (S R G P D — omits Ma & Ni)',
    style: 'hindustani',
    notation: 'S R G P D S\'  |  S\' D P G R S   (Phrase: G R S .D S R G, P G D P G R S)',
    instructions: 'Use gentle glides (meend) between G→R and D→P. Identical note set to the Western Major Pentatonic!',
    semitones: [0, 2, 4, 7, 9, 12, 12, 9, 7, 4, 2, 0],
    defaultBpm: 74,
    useTanpura: true,
    tuning: 'just',
  },
];

export const WESTERN_DRILLS: DrillItem[] = [
  {
    id: 'west_5tone',
    title: '5-Tone Vowel Placement ("Nay" / "Gee")',
    subtitle: 'Forward resonance & clean intonation',
    style: 'western',
    notation: '1 - 2 - 3 - 4 - 5 - 4 - 3 - 2 - 1   (C D E F G F E D C)',
    instructions: 'Sing on a bright "Gee" or light "Nay" to keep tone forward. Avoid pushing volume on the 5th degree.',
    semitones: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    defaultBpm: 96,
    useTanpura: false,
    tuning: 'equal',
  },
  {
    id: 'west_arpeggio',
    title: 'Octave Major Arpeggio ("Mah / Goo")',
    subtitle: 'Chest-to-mix smooth bridging',
    style: 'western',
    notation: '1 - 3 - 5 - 8 - 5 - 3 - 1   (S - G - P - S\' - P - G - S)',
    instructions: 'Lighten weight as you jump from 5 to 8. Think "narrow & easy" on the top note instead of louder.',
    semitones: [0, 4, 7, 12, 7, 4, 0],
    defaultBpm: 84,
    useTanpura: false,
    tuning: 'equal',
  },
  {
    id: 'west_minor_agility',
    title: 'Natural Minor Pop Agility Run',
    subtitle: 'Contemporary R&B / Pop phrasing control',
    style: 'western',
    notation: '1 - 2 - b3 - 4 - 5 - 4 - b3 - 2 - 1   (S R g m P m g R S)',
    instructions: 'Articulate each note cleanly on "Duh" or "La" without sliding lazily between b3 (komal Ga) and 2.',
    semitones: [0, 2, 3, 5, 7, 5, 3, 2, 0],
    defaultBpm: 96,
    useTanpura: false,
    tuning: 'equal',
  },
  {
    id: 'west_9note',
    title: '9-Note Scale Stretch',
    subtitle: 'Upper-middle range comfort & breath economy',
    style: 'western',
    notation: '1 - 2 - 3 - 4 - 5 - 6 - 7 - 8 - 9 - 8 - 7 - 6 - 5 - 4 - 3 - 2 - 1',
    instructions: 'Take one calm breath and glide smoothly up to the 9th (upper Re) on a rounded "Ooh" or "Oh" vowel.',
    semitones: [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0],
    defaultBpm: 108,
    useTanpura: false,
    tuning: 'equal',
  },
];

export interface SessionBlock {
  id: string;
  title: string;
  durationSec: number;
  kind: 'warmup' | 'vocal_drill' | 'song_practice' | 'ear_sprint';
  description: string;
  drills?: DrillItem[];
  earSystem?: 'hindustani' | 'western';
  earQuestions?: number;
}

export function buildDailySessionBlocks(
  style: VocalStyle,
  mode: 'full' | 'quick5'
): SessionBlock[] {
  if (mode === 'quick5') {
    return [
      {
        id: 'q_warmup',
        title: 'Quick Warmup & Breath',
        durationSec: 90,
        kind: 'warmup',
        description: 'Reset posture, 3 deep belly breaths, and gentle humming on Sa.',
        drills: WARMUP_DRILLS,
      },
      {
        id: 'q_core',
        title: style === 'hindustani' ? 'Sa Hold & 1 Alankar' : '5-Tone Scale & Arpeggio',
        durationSec: 150,
        kind: 'vocal_drill',
        description:
          style === 'hindustani'
            ? 'Lock your voice into the Tanpura on Sa and run one clean Alankar.'
            : 'Focus on clean, centered pitch on 5-tone and octave arpeggio drills.',
        drills: style === 'hindustani' ? HINDUSTANI_DRILLS.slice(0, 2) : WESTERN_DRILLS.slice(0, 2),
      },
      {
        id: 'q_ear',
        title: '5-Question Ear Sprint',
        durationSec: 60,
        kind: 'ear_sprint',
        description: 'Quick 5-question ear wake-up to keep your relative pitch sharp.',
        earSystem: style,
        earQuestions: 5,
      },
    ];
  }

  if (style === 'hindustani') {
    return [
      {
        id: 'h_warmup',
        title: 'Breath & Warmup on Sa',
        durationSec: 180,
        kind: 'warmup',
        description: '3 minutes of relaxed diaphragmatic breathing, lip trills, and gentle humming on Sa.',
        drills: WARMUP_DRILLS,
      },
      {
        id: 'h_swar',
        title: 'Swar Sadhana (Sa & Pa Holds)',
        durationSec: 240,
        kind: 'vocal_drill',
        description: '4 minutes anchoring long, steady breaths on Sa and Pa using the live tuner bar.',
        drills: [HINDUSTANI_DRILLS[0]],
      },
      {
        id: 'h_alankar',
        title: 'Alankars & Raag Phrases',
        durationSec: 480,
        kind: 'vocal_drill',
        description: '8 minutes cycling through Bilawal Alankars and Raag Yaman / Bhupali phrases.',
        drills: HINDUSTANI_DRILLS.slice(1),
      },
      {
        id: 'h_ear',
        title: 'Hindustani Swara Ear Sprint',
        durationSec: 180,
        kind: 'ear_sprint',
        description: '3 minutes identifying Swaras over the Tanpura (click or sing back).',
        earSystem: 'hindustani',
        earQuestions: 8,
      },
    ];
  }

  return [
    {
      id: 'w_warmup',
      title: 'Breath & Vocal Sirens',
      durationSec: 180,
      kind: 'warmup',
      description: '3 minutes of diaphragmatic breath pacing and light 5-tone lip trills.',
      drills: WARMUP_DRILLS,
    },
    {
      id: 'w_scales',
      title: 'Pitch, Resonance & Agility',
      durationSec: 360,
      kind: 'vocal_drill',
      description: '6 minutes of 5-tone vowels, octave arpeggios, and minor agility runs.',
      drills: WESTERN_DRILLS,
    },
    {
      id: 'w_songs',
      title: 'Western Song Phrase Practice',
      durationSec: 360,
      kind: 'song_practice',
      description: '6 minutes working on a chorus or tricky phrase from your vocal repertoire.',
    },
    {
      id: 'w_ear',
      title: 'Western Intervals & Chords Sprint',
      durationSec: 180,
      kind: 'ear_sprint',
      description: '3 minutes training intervals and chord qualities with Hindustani Swara bridge hints.',
      earSystem: 'western',
      earQuestions: 8,
    },
  ];
}
