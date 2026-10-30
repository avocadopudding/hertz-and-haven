import { AudioSettings } from '../types';
import { getAudioProfileConfig } from '../utils/radarLogic';

class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private verifyingIntervalId: number | null = null;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive = false;
  private currentState: string = 'NORMAL';

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): boolean {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return true;
    }
    return Boolean(ctx);
  }

  /**
   * Plays a single tick sound (used during VERIFYING FALL... window)
   */
  public playTick(settings: AudioSettings) {
    if (settings.isMuted || settings.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const config = getAudioProfileConfig(settings.profile, settings.pitchShift);
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = config.waveType;
      osc.frequency.setValueAtTime(config.tickFreq, now);

      // Soft envelope for warning tick
      const tickVolume = settings.volume * 0.28;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(tickVolume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + config.tickDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + config.tickDuration + 0.02);
    } catch (e) {
      console.warn('Audio tick playback error:', e);
    }
  }

  /**
   * Starts repeating tick loop for VERIFYING FALL...
   */
  public startVerifyingTick(settings: AudioSettings) {
    this.stopVerifyingTick();
    this.playTick(settings);
    this.verifyingIntervalId = window.setInterval(() => {
      this.playTick(settings);
    }, 800);
  }

  public stopVerifyingTick() {
    if (this.verifyingIntervalId !== null) {
      clearInterval(this.verifyingIntervalId);
      this.verifyingIntervalId = null;
    }
  }

  /**
   * Starts high-intensity dual-tone sweeping siren for FALL DETECTED!
   */
  public startEmergencySiren(settings: AudioSettings) {
    if (this.isSirenActive) return;
    if (settings.isMuted || settings.volume <= 0) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const config = getAudioProfileConfig(settings.profile, settings.pitchShift);
      const now = ctx.currentTime;

      this.sirenGain = ctx.createGain();
      const sirenVolume = settings.volume * 0.55;
      this.sirenGain.gain.setValueAtTime(0.01, now);
      this.sirenGain.gain.linearRampToValueAtTime(sirenVolume, now + 0.1);
      this.sirenGain.connect(ctx.destination);

      // Primary sweeping oscillator
      this.sirenOsc1 = ctx.createOscillator();
      this.sirenOsc1.type = config.waveType;
      this.sirenOsc1.frequency.setValueAtTime(config.sirenLow, now);

      // LFO for sweeping pitch modulation (European / Emergency Sweep)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(2.2, now); // 2.2 Hz sweep rate
      lfoGain.gain.setValueAtTime(config.sirenHigh - config.sirenLow, now);

      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc1.frequency);

      // Harmonizing second oscillator (a fifth higher for urgency)
      this.sirenOsc2 = ctx.createOscillator();
      this.sirenOsc2.type = config.waveType === 'square' ? 'sawtooth' : config.waveType;
      this.sirenOsc2.frequency.setValueAtTime(config.sirenLow * 1.33, now);
      lfoGain.connect(this.sirenOsc2.frequency);

      this.sirenOsc1.connect(this.sirenGain);
      this.sirenOsc2.connect(this.sirenGain);

      lfo.start(now);
      this.sirenOsc1.start(now);
      this.sirenOsc2.start(now);
      this.isSirenActive = true;
    } catch (e) {
      console.warn('Siren initialization error:', e);
    }
  }

  public stopEmergencySiren() {
    if (!this.isSirenActive) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx && this.sirenGain) {
        const now = ctx.currentTime;
        this.sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      }
      setTimeout(() => {
        try {
          this.sirenOsc1?.stop();
          this.sirenOsc2?.stop();
          this.sirenOsc1?.disconnect();
          this.sirenOsc2?.disconnect();
          this.sirenGain?.disconnect();
        } catch {
          // ignore
        }
        this.sirenOsc1 = null;
        this.sirenOsc2 = null;
        this.sirenGain = null;
        this.isSirenActive = false;
      }, 120);
    } catch {
      this.isSirenActive = false;
    }
  }

  /**
   * Plays calming resolution chime:
   * 4-note ascending major chord arpeggio (C5 -> E5 -> G5 -> C6) with smooth exponential decay.
   */
  public playResolutionChime(settings: AudioSettings) {
    if (settings.isMuted || settings.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const config = getAudioProfileConfig(settings.profile, settings.pitchShift);
      const noteDelay = 0.11; // 110ms spacing between notes in the arpeggio
      const noteDuration = 0.75;
      const baseTime = ctx.currentTime;

      config.chimeFrequencies.forEach((freq, idx) => {
        const noteStartTime = baseTime + idx * noteDelay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Chimes use sine or gentle harmonics for calming timbre
        osc.type = settings.profile === 'classic' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, noteStartTime);

        const chordVolume = settings.volume * 0.35;
        gain.gain.setValueAtTime(0.001, noteStartTime);
        gain.gain.linearRampToValueAtTime(chordVolume, noteStartTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStartTime);
        osc.stop(noteStartTime + noteDuration + 0.05);
      });
    } catch (e) {
      console.warn('Resolution chime error:', e);
    }
  }

  /**
   * Synchronizes synthesizer playback with state transitions.
   */
  public handleStateTransition(
    oldState: string,
    newState: string,
    settings: AudioSettings
  ) {
    this.currentState = newState;

    if (newState === 'VERIFYING') {
      this.stopEmergencySiren();
      this.startVerifyingTick(settings);
    } else if (newState === 'FALL_DETECTED') {
      this.stopVerifyingTick();
      this.startEmergencySiren(settings);
    } else if (newState === 'NORMAL') {
      this.stopVerifyingTick();
      this.stopEmergencySiren();

      // Play calming resolution chime only if coming from an emergency or verifying alert
      if (oldState === 'FALL_DETECTED' || oldState === 'VERIFYING') {
        this.playResolutionChime(settings);
      }
    }
  }

  public updateVolumeOrMute(settings: AudioSettings) {
    if (settings.isMuted) {
      this.stopVerifyingTick();
      this.stopEmergencySiren();
    } else {
      if (this.currentState === 'VERIFYING' && !this.verifyingIntervalId) {
        this.startVerifyingTick(settings);
      } else if (this.currentState === 'FALL_DETECTED' && !this.isSirenActive) {
        this.startEmergencySiren(settings);
      }
    }
  }

  public stopAll() {
    this.stopVerifyingTick();
    this.stopEmergencySiren();
  }
}

export const audioSynthesizer = new WebAudioSynthesizer();
