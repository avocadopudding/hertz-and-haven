import { SoundProfile, SystemState } from '../types';

/**
 * Normalizes raw Blynk V2 virtual pin values into typed SystemState.
 * Supports string literals ("NORMAL", "VERIFYING FALL...", "FALL DETECTED!")
 * as well as numeric indices (0, 1, 2) or standard shorthand terms.
 */
export function parseBlynkStatus(rawStatus: unknown): SystemState {
  if (rawStatus === null || rawStatus === undefined) {
    return 'NORMAL';
  }

  const str = String(rawStatus).trim().toUpperCase();

  if (str === '2' || str.includes('FALL DETECTED') || str === 'FALL' || str === 'EMERGENCY') {
    return 'FALL_DETECTED';
  }

  if (str === '1' || str.includes('VERIFYING') || str.includes('COUNTDOWN') || str === 'ALERT') {
    return 'VERIFYING';
  }

  return 'NORMAL';
}

/**
 * Watchdog timeout evaluation:
 * Flags hardware as offline if elapsed delta since last received packet > threshold (default 5000ms).
 */
export function isWatchdogTimedOut(
  lastPacketTimestamp: number,
  currentTimestamp: number,
  thresholdMs: number = 5000
): boolean {
  if (!lastPacketTimestamp || lastPacketTimestamp <= 0) return true;
  return (currentTimestamp - lastPacketTimestamp) > thresholdMs;
}

/**
 * Classifies room proximity range into functional physical monitoring zones.
 */
export function classifyProximityZone(distance: number): {
  zone: 'Near' | 'Mid' | 'Far' | 'Out of Range';
  color: string;
  description: string;
} {
  if (distance <= 0) {
    return {
      zone: 'Out of Range',
      color: '#64748b', // Slate
      description: 'No target detected in radar beam',
    };
  }
  if (distance < 1.5) {
    return {
      zone: 'Near',
      color: '#ef4444', // Red / Critical proximity
      description: 'Immediate bedside / floor impact zone (< 1.5m)',
    };
  }
  if (distance <= 3.5) {
    return {
      zone: 'Mid',
      color: '#3b82f6', // Blue / Active room center
      description: 'Central room walking zone (1.5m - 3.5m)',
    };
  }
  if (distance <= 6.0) {
    return {
      zone: 'Far',
      color: '#10b981', // Emerald
      description: 'Room perimeter / doorway zone (3.5m - 6.0m)',
    };
  }
  return {
    zone: 'Out of Range',
    color: '#64748b',
    description: 'Target beyond 6.0m radar boundary',
  };
}

/**
 * Checks if target speed constitutes a kinetic fall spike.
 * C4001 mmWave radar reports sudden vertical/horizontal descent velocity.
 */
export function detectKineticSpike(speed: number, threshold: number = 1.8): boolean {
  return Math.abs(speed) >= threshold;
}

/**
 * Computes frequency and oscillator configuration based on sound profile and pitch shift.
 */
export function getAudioProfileConfig(profile: SoundProfile, pitchShift: number) {
  const clampPitch = Math.min(Math.max(pitchShift, 0.5), 1.8);

  switch (profile) {
    case 'classic':
      return {
        waveType: 'square' as OscillatorType,
        tickFreq: 680 * clampPitch,
        tickDuration: 0.08,
        sirenLow: 740 * clampPitch,
        sirenHigh: 1100 * clampPitch,
        chimeFrequencies: [523.25, 659.25, 783.99, 1046.5].map((f) => f * clampPitch),
      };
    case 'digital':
      return {
        waveType: 'sawtooth' as OscillatorType,
        tickFreq: 1400 * clampPitch,
        tickDuration: 0.04,
        sirenLow: 880 * clampPitch,
        sirenHigh: 1320 * clampPitch,
        chimeFrequencies: [587.33, 739.99, 880.0, 1174.66].map((f) => f * clampPitch),
      };
    case 'chimes':
      return {
        waveType: 'sine' as OscillatorType,
        tickFreq: 440 * clampPitch,
        tickDuration: 0.12,
        sirenLow: 620 * clampPitch,
        sirenHigh: 932 * clampPitch,
        chimeFrequencies: [523.25, 659.25, 783.99, 1046.5].map((f) => f * clampPitch),
      };
    case 'minimal':
    default:
      return {
        waveType: 'triangle' as OscillatorType,
        tickFreq: 330 * clampPitch,
        tickDuration: 0.06,
        sirenLow: 520 * clampPitch,
        sirenHigh: 820 * clampPitch,
        chimeFrequencies: [440, 554.37, 659.25, 880].map((f) => f * clampPitch),
      };
  }
}

/**
 * Calculates the delta in speed between two consecutive telemetry readings.
 */
export function calculateSpeedDelta(currentSpeed: number, previousSpeed: number): number {
  return Number((currentSpeed - previousSpeed).toFixed(2));
}

/**
 * Formats speed delta with explicit +/- sign and units.
 */
export function formatSpeedDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)} m/s`;
}
