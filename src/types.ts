export type SystemState = 'NORMAL' | 'VERIFYING' | 'FALL_DETECTED';

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SIMULATED' | 'CONNECTING' | 'ERROR';

export type SoundProfile = 'classic' | 'digital' | 'chimes' | 'minimal';

export interface TelemetryData {
  speed: number; // in m/s (V0)
  distance: number; // in meters (V1)
  status: SystemState; // V2 normalized
  statusRaw: string;
  timestamp: number;
  angle: number; // azimuth angle (-60 to +60 degrees for radar scope)
  kineticSpike: boolean;
}

export interface AudioSettings {
  profile: SoundProfile;
  pitchShift: number; // 0.5 to 1.8
  volume: number; // 0 to 1
  isMuted: boolean;
}

export interface BlynkConfig {
  token: string;
  server: string;
  pollInterval: number; // milliseconds
}

export interface LogEvent {
  id: string;
  timestamp: string;
  rawTime: number;
  type: 'state_change' | 'kinetic_spike' | 'alarm_cancel' | 'sos' | 'connection' | 'info';
  title: string;
  description: string;
  level: 'info' | 'warning' | 'danger' | 'success';
}

export interface RoomDetails {
  roomName: string;
  patientName: string;
  patientPhone: string;
  sensorModel: string;
  firmwareVersion: string;
  mountingHeightMeters: number;
}

export interface TerminalEntry {
  id: string;
  timeStr: string;
  speed: number;
  distance: number;
  speedDelta: number;
  status: SystemState;
  isSpike: boolean;
}
