import React from 'react';
import { X, Volume2, Sliders, Music, Play, Square } from 'lucide-react';
import { AudioSettings, SoundProfile } from '../types';
import { audioSynthesizer } from '../audio/audioSynthesizer';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onUpdateSettings: (newSettings: AudioSettings) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [isPlayingSiren, setIsPlayingSiren] = React.useState(false);

  if (!isOpen) return null;

  const profiles: { id: SoundProfile; name: string; desc: string; wave: string }[] = [
    {
      id: 'classic',
      name: 'Classic Synth',
      desc: 'Traditional dual-tone square wave alarm tones with high clarity',
      wave: 'Square Wave (880Hz)',
    },
    {
      id: 'digital',
      name: 'Digital Pulse',
      desc: 'Crisp, high-frequency electronic beep ticks and sawtooth siren',
      wave: 'Sawtooth Pulse (1400Hz)',
    },
    {
      id: 'chimes',
      name: 'Soft Chimes',
      desc: 'Resonant, warm sine wave musical chords and soothing arpeggios',
      wave: 'Sine Chimes (523Hz)',
    },
    {
      id: 'minimal',
      name: 'Modern Minimal',
      desc: 'Subdued, low-frequency woodblock / triangle tones for quiet spaces',
      wave: 'Triangle Woodblock (330Hz)',
    },
  ];

  const handleProfileSelect = (profile: SoundProfile) => {
    const updated = { ...settings, profile };
    onUpdateSettings(updated);
    audioSynthesizer.unlockAudio();
    audioSynthesizer.playResolutionChime(updated);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pitchShift = parseFloat(e.target.value);
    onUpdateSettings({ ...settings, pitchShift });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    const updated = { ...settings, volume, isMuted: volume === 0 };
    onUpdateSettings(updated);
  };

  const testTick = () => {
    audioSynthesizer.unlockAudio();
    audioSynthesizer.playTick(settings);
  };

  const toggleTestSiren = () => {
    audioSynthesizer.unlockAudio();
    if (isPlayingSiren) {
      audioSynthesizer.stopEmergencySiren();
      setIsPlayingSiren(false);
    } else {
      audioSynthesizer.startEmergencySiren(settings);
      setIsPlayingSiren(true);
      setTimeout(() => {
        audioSynthesizer.stopEmergencySiren();
        setIsPlayingSiren(false);
      }, 3500);
    }
  };

  const testChime = () => {
    audioSynthesizer.unlockAudio();
    audioSynthesizer.playResolutionChime(settings);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Audio Synthesizer Settings"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Web Audio Synthesizer Controls
              </h2>
              <p className="text-xs text-slate-400">
                Custom mathematical oscillators (Native Web Audio API)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Close audio settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Distinct Sound Profiles */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            1. Alert Sound Profile (4 Options)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {profiles.map((p) => {
              const isSelected = settings.profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProfileSelect(p.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">{p.name}</span>
                    <span className="text-[10px] font-mono text-purple-400">{p.wave}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pitch Shift & Volume Sliders */}
        <div className="mt-5 space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-medium text-slate-300">Tone Pitch Shift</span>
              <span className="font-mono text-purple-400 font-bold">
                {settings.pitchShift.toFixed(2)}x (
                {settings.pitchShift < 0.8
                  ? 'Deep Low-Freq'
                  : settings.pitchShift > 1.2
                  ? 'High-Pitch'
                  : 'Standard'}
                )
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={settings.pitchShift}
              onChange={handlePitchChange}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>0.5x (Bass Rumble)</span>
              <span>1.0x (Nominal)</span>
              <span>1.8x (Piercing)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" /> Master Volume
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={handleVolumeChange}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Interactive Sound Previews */}
        <div className="mt-5">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            2. Interactive Sound Previews
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={testTick}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/80 transition-all active:scale-98"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Verifying Tick</span>
            </button>

            <button
              type="button"
              onClick={toggleTestSiren}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-98 ${
                isPlayingSiren
                  ? 'bg-red-600 text-white border-red-500 animate-pulse'
                  : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-800/80'
              }`}
            >
              {isPlayingSiren ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingSiren ? 'Stop Siren' : 'Fall Siren'}</span>
            </button>

            <button
              type="button"
              onClick={testChime}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/80 transition-all active:scale-98"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Resolution Chime</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
