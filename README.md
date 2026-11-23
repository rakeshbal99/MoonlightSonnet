# MoonlightSonnet — Daily Vocal, Ear & Keyboard Practice Studio

A calm, local-first web app built for consistent **15–20 minute daily vocal practice** (bridging **Hindustani Classical** and **Western vocals**), **dual-system ear training**, and a **standalone keyboard practice companion** with accountability tracking.

## Features

- **Guided 15–20 Min Daily Vocal + Ear Session:** Automatically alternates between **Hindustani Classical** (Tanpura drone, *Swar Sadhana*, Bilawal *Alankars*, *Raag Yaman / Bhupali* phrases) and **Western Vocals** (warmups, 5-tone placement, octave arpeggios, minor agility, song phrase practice), with a **5-Min Streak Saver** mode for busy days.
- **Built-In Web Audio Studio:**
  - Continuous synthesized **Tanpura drone** (*Sa–Pa* or *Sa–Ma*) tunable to any comfortable tonic *Sa*.
  - Lightweight live **Note-Accuracy Tuner Bar** (`pitchy` McLeod Pitch Method) showing both **Sargam** (Just Intonation) and **Western notes** (12-TET) with a `±15c` target band.
  - **Piano reference synth** & clickable 2-octave Sargam/Western keyboard.
- **Dual-System Ear Training:** Adaptive drills for Hindustani *Swaras* over the Tanpura, Western intervals, and chord qualities—with click answers, Hindustani ↔ Western bridge hints, and optional **mic sing-back verification**.
- **Custom Keyboard Practice Companion:** Log your own finger exercises and break songs/tunes into sections with current vs. target BPM tracking and an **Auto-BPM Ramp Metronome** (+BPM every N bars).
- **Local-First Accountability Engine:** Daily vocal streak, 12-week practice heatmap, post-session reflection & next-day notes, 20-second **Weekly Voice Checkpoint** recorder, recurring **macOS Calendar (`.ics`)** reminder export, and **1-click JSON backup/restore** (IndexedDB via Dexie.js).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **React 19 + TypeScript + Vite 6 + Tailwind CSS v4**
- **Web Audio API + `pitchy`** (client-side Tanpura, piano synth, metronome, pitch detection)
- **Dexie.js (IndexedDB)** for offline-first persistence & local audio checkpoints
