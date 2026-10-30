/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Sliders,
  Cloud,
  Volume2,
  VolumeX,
  Shield,
  User,
  MapPin,
  Clock,
  Sparkles,
  Terminal,
} from 'lucide-react';
import {
  AudioSettings,
  BlynkConfig,
  ConnectionStatus,
  LogEvent,
  RoomDetails,
  SystemState,
  TelemetryData,
  TerminalEntry,
} from './types';
import { audioSynthesizer } from './audio/audioSynthesizer';
import {
  parseBlynkStatus,
  isWatchdogTimedOut,
  detectKineticSpike,
  calculateSpeedDelta,
} from './utils/radarLogic';
import { StatusBanner } from './components/StatusBanner';
import { RadarSweeper } from './components/RadarSweeper';
import { SpeedGauge } from './components/SpeedGauge';
import { DistanceMeter } from './components/ProximityMeter';
import { TelemetryTerminal } from './components/TelemetryTerminal';
import { EmergencyControls } from './components/EmergencyControls';
import { SimulationPanel } from './components/SimulationPanel';
import { EventAuditLog } from './components/EventAuditLog';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { BlynkSettingsModal } from './components/BlynkSettingsModal';

const INITIAL_LOGS: LogEvent[] = [
  {
    id: 'log-1',
    timestamp: new Date().toLocaleTimeString(),
    rawTime: Date.now(),
    type: 'connection',
    title: 'Zen1 Radar System Boot',
    description: 'Firmware C4001 mmWave radar initialized. Virtual pins V0-V3 allocated.',
    level: 'info',
  },
  {
    id: 'log-2',
    timestamp: new Date().toLocaleTimeString(),
    rawTime: Date.now(),
    type: 'info',
    title: 'Web Audio Engine Ready',
    description: '3-stage native mathematical oscillator profiles active.',
    level: 'success',
  },
];

const INITIAL_TERMINAL_ENTRIES: TerminalEntry[] = [
  {
    id: 'term-init-1',
    timeStr: '11:00:10.2',
    speed: 0.36,
    distance: 2.38,
    speedDelta: 0.00,
    status: 'NORMAL',
    isSpike: false,
  },
  {
    id: 'term-init-2',
    timeStr: '11:00:11.2',
    speed: 0.39,
    distance: 2.36,
    speedDelta: 0.03,
    status: 'NORMAL',
    isSpike: false,
  },
  {
    id: 'term-init-3',
    timeStr: '11:00:12.2',
    speed: 0.42,
    distance: 2.35,
    speedDelta: 0.03,
    status: 'NORMAL',
    isSpike: false,
  },
];

export default function App() {
  // Telemetry & State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speed: 0.42,
    distance: 2.35,
    status: 'NORMAL',
    statusRaw: 'NORMAL',
    timestamp: Date.now(),
    angle: 5,
    kineticSpike: false,
  });

  const [prevDistance, setPrevDistance] = useState<number>(2.35);
  const [speedHistory, setSpeedHistory] = useState<number[]>([0.2, 0.4, 0.35, 0.42]);
  const [peakSpeed, setPeakSpeed] = useState<number>(0.42);

  // Terminal Telemetry State (speed, distance, speed delta)
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>(INITIAL_TERMINAL_ENTRIES);
  const [isTerminalPaused, setIsTerminalPaused] = useState<boolean>(false);
  const [currentSpeedDelta, setCurrentSpeedDelta] = useState<number>(0.03);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState<boolean>(false);
  const isTerminalPausedRef = useRef<boolean>(false);
  const prevSpeedRef = useRef<number>(0.42);

  // Connection & Watchdog
  const [connection, setConnection] = useState<ConnectionStatus>('SIMULATED');
  const [latencyMs, setLatencyMs] = useState<number>(38);
  const [lastPacketTime, setLastPacketTime] = useState<number>(Date.now());
  const [isSimulation, setIsSimulation] = useState<boolean>(true);

  // Verification Countdown (10 seconds window)
  const [verifyingCountdown, setVerifyingCountdown] = useState<number>(10);
  const verifyingTimerRef = useRef<number | null>(null);

  // Audio Settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    profile: 'classic',
    pitchShift: 1.0,
    volume: 0.75,
    isMuted: false,
  });

  // Blynk REST Config
  const [blynkConfig, setBlynkConfig] = useState<BlynkConfig>({
    token: '',
    server: 'https://blynk.cloud',
    pollInterval: 1000,
  });

  // Room / Resident Metadata
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({
    roomName: 'Suite 204 - Bedroom',
    patientName: 'Eleanor Vance',
    patientPhone: '+1 (555) 382-9014',
    sensorModel: 'ESP32-S3 + C4001 mmWave',
    firmwareVersion: 'Zen1-v2.4.1',
    mountingHeightMeters: 1.5,
  });

  // Logs
  const [logs, setLogs] = useState<LogEvent[]>(INITIAL_LOGS);

  // Modals & UI Controls
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isBlynkModalOpen, setIsBlynkModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Ref to track old state for transition chimes
  const prevStateRef = useRef<SystemState>('NORMAL');
  const wasOfflineRef = useRef<boolean>(false);
  const simPausedRef = useRef<boolean>(false);

  // Helper to append a new packet to the telemetry terminal
  const logTelemetryPacket = useCallback(
    (newSpeed: number, newDistance: number, status: SystemState, isSpike: boolean) => {
      const delta = calculateSpeedDelta(newSpeed, prevSpeedRef.current);
      prevSpeedRef.current = newSpeed;
      setCurrentSpeedDelta(delta);

      if (!isTerminalPausedRef.current) {
        const now = new Date();
        const timeStr = `${now.toTimeString().split(' ')[0]}.${Math.floor(now.getMilliseconds() / 100)}`;
        const entry: TerminalEntry = {
          id: `term-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timeStr,
          speed: newSpeed,
          distance: newDistance,
          speedDelta: delta,
          status,
          isSpike,
        };
        setTerminalEntries((prev) => [...prev.slice(-149), entry]);
      }
    },
    []
  );

  // Helper to add log entries
  const addLog = useCallback(
    (
      type: LogEvent['type'],
      title: string,
      description: string,
      level: LogEvent['level'] = 'info'
    ) => {
      const newEntry: LogEvent = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        rawTime: Date.now(),
        type,
        title,
        description,
        level,
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 99)]);
    },
    []
  );

  // Unlock Audio on first interaction
  const handleUserGesture = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      audioSynthesizer.unlockAudio();
    }
  };

  // State Transition Audio and Logic Handler
  const transitionToState = useCallback(
    (newState: SystemState) => {
      const oldState = prevStateRef.current;
      if (oldState === newState) return;

      prevStateRef.current = newState;
      setTelemetry((prev) => ({ ...prev, status: newState }));

      // Manage countdown timer for verification
      if (newState === 'VERIFYING') {
        setVerifyingCountdown(10);
        if (verifyingTimerRef.current) clearInterval(verifyingTimerRef.current);
        verifyingTimerRef.current = window.setInterval(() => {
          setVerifyingCountdown((prev) => {
            if (prev <= 1) {
              if (verifyingTimerRef.current) clearInterval(verifyingTimerRef.current);
              verifyingTimerRef.current = null;
              // Countdown expired -> Target motionless -> FALL CONFIRMED!
              transitionToState('FALL_DETECTED');
              addLog(
                'state_change',
                'FALL DETECTED! (Countdown Expired)',
                'No recovery motion detected within 10s verification window. Emergency sirens active.',
                'danger'
              );
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (verifyingTimerRef.current) {
          clearInterval(verifyingTimerRef.current);
          verifyingTimerRef.current = null;
        }
      }

      // Trigger Web Audio Synthesizer
      audioSynthesizer.handleStateTransition(oldState, newState, audioSettings);
    },
    [audioSettings, addLog]
  );

  // Remote Alarm Cancellation (V3)
  const handleCancelAlarm = async () => {
    handleUserGesture();
    setIsCancelling(true);

    try {
      if (!isSimulation && blynkConfig.token) {
        // Send V3 = 1 to Blynk HTTP REST API
        const cancelUrl = `${blynkConfig.server.replace(/\/$/, '')}/external/api/update?token=${encodeURIComponent(
          blynkConfig.token
        )}&v3=1`;
        await fetch(cancelUrl, { method: 'GET' }).catch(() => {});

        // Also reset V2 to NORMAL
        const resetStatusUrl = `${blynkConfig.server.replace(/\/$/, '')}/external/api/update?token=${encodeURIComponent(
          blynkConfig.token
        )}&v2=NORMAL`;
        await fetch(resetStatusUrl, { method: 'GET' }).catch(() => {});
      }

      // Reset local state machine
      transitionToState('NORMAL');
      addLog(
        'alarm_cancel',
        'Alarm Cancelled via Remote Reset (V3)',
        'Caregiver acknowledged alert and issued hardware reset signal. Calming resolution chime sounded.',
        'success'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Manual SOS Emergency Trigger
  const handleTriggerSOS = () => {
    handleUserGesture();
    transitionToState('FALL_DETECTED');
    addLog(
      'sos',
      'MANUAL SOS EMERGENCY ACTIVATED',
      'Caregiver or resident manually triggered emergency distress alert.',
      'danger'
    );
  };

  // Toggle Mute
  const handleToggleMute = () => {
    handleUserGesture();
    setAudioSettings((prev) => {
      const updated = { ...prev, isMuted: !prev.isMuted };
      audioSynthesizer.updateVolumeOrMute(updated);
      return updated;
    });
  };

  // Simulation Mode Engine
  useEffect(() => {
    if (!isSimulation) return;
    setConnection('SIMULATED');

    const simInterval = window.setInterval(() => {
      if (simPausedRef.current) {
        // Simulate disconnection packet drop
        return;
      }

      setLastPacketTime(Date.now());

      setTelemetry((prev) => {
        let newDist = prev.distance;
        let newSpeed = prev.speed;
        let newAngle = prev.angle;
        let spike = false;

        if (prev.status === 'FALL_DETECTED') {
          // Fallen resident is motionless near floor (< 0.9m)
          newSpeed = Number((Math.random() * 0.05).toFixed(2));
          newDist = Number((0.65 + Math.sin(Date.now() * 0.001) * 0.04).toFixed(2));
        } else if (prev.status === 'VERIFYING') {
          // Low kinetic jitter during verification countdown
          newSpeed = Number((0.15 + Math.random() * 0.1).toFixed(2));
          newDist = Number((prev.distance + (Math.random() - 0.5) * 0.05).toFixed(2));
        } else {
          // Normal human movement within room
          const speedDrift = (Math.random() - 0.48) * 0.15;
          newSpeed = Number(Math.max(0.1, Math.min(1.2, prev.speed + speedDrift)).toFixed(2));

          const distDrift = (Math.random() - 0.5) * 0.2;
          newDist = Number(Math.max(0.8, Math.min(4.8, prev.distance + distDrift)).toFixed(2));

          const angleDrift = (Math.random() - 0.5) * 4;
          newAngle = Math.max(-55, Math.min(55, Math.round(prev.angle + angleDrift)));

          spike = detectKineticSpike(newSpeed);
        }

        setPrevDistance(prev.distance);
        setSpeedHistory((history) => [...history.slice(-24), newSpeed]);
        setPeakSpeed((curr) => Math.max(curr, Math.abs(newSpeed)));

        logTelemetryPacket(newSpeed, newDist, prev.status, spike);

        return {
          ...prev,
          speed: newSpeed,
          distance: newDist,
          angle: newAngle,
          timestamp: Date.now(),
          kineticSpike: spike,
        };
      });
    }, 1000);

    return () => clearInterval(simInterval);
  }, [isSimulation, logTelemetryPacket]);

  // Live Blynk Cloud Polling Engine
  useEffect(() => {
    if (isSimulation || !blynkConfig.token) return;

    setConnection('CONNECTING');
    let isMounted = true;

    const pollBlynk = async () => {
      const startTime = performance.now();
      try {
        const url = `${blynkConfig.server.replace(/\/$/, '')}/external/api/get?token=${encodeURIComponent(
          blynkConfig.token
        )}&v0&v1&v2`;

        const response = await fetch(url);
        const duration = Math.round(performance.now() - startTime);
        if (!isMounted) return;

        if (response.ok) {
          const text = await response.text();
          setLatencyMs(duration);
          setLastPacketTime(Date.now());
          setConnection('ONLINE');

          // Blynk returns either string or JSON array/object
          let v0 = 0;
          let v1 = 0;
          let v2 = 'NORMAL';

          try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              v0 = parseFloat(data[0]) || 0;
              v1 = parseFloat(data[1]) || 0;
              v2 = String(data[2] ?? 'NORMAL');
            } else if (typeof data === 'object') {
              v0 = parseFloat(data.v0) || 0;
              v1 = parseFloat(data.v1) || 0;
              v2 = String(data.v2 ?? 'NORMAL');
            }
          } catch {
            // Raw text response e.g. "0.45" or similar
            v0 = parseFloat(text) || 0;
          }

          const parsedState = parseBlynkStatus(v2);
          const isSpike = detectKineticSpike(v0);

          setTelemetry((prev) => {
            setPrevDistance(prev.distance);
            setSpeedHistory((history) => [...history.slice(-24), v0]);
            setPeakSpeed((curr) => Math.max(curr, Math.abs(v0)));

            const activeDist = v1 > 0 ? v1 : prev.distance;
            logTelemetryPacket(v0, activeDist, parsedState, isSpike);

            return {
              speed: v0,
              distance: activeDist,
              status: parsedState,
              statusRaw: v2,
              timestamp: Date.now(),
              angle: prev.angle,
              kineticSpike: isSpike,
            };
          });

          if (parsedState !== prevStateRef.current) {
            transitionToState(parsedState);
            addLog(
              'state_change',
              `Blynk State Update: ${parsedState}`,
              `Hardware V2 Pin reported status "${v2}".`,
              parsedState === 'FALL_DETECTED' ? 'danger' : parsedState === 'VERIFYING' ? 'warning' : 'success'
            );
          }
        } else {
          setConnection('ERROR');
        }
      } catch (err) {
        if (isMounted) {
          setConnection('ERROR');
        }
      }
    };

    pollBlynk();
    const interval = window.setInterval(pollBlynk, blynkConfig.pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimulation, blynkConfig, transitionToState, addLog, logTelemetryPacket]);

  // Connection Watchdog Timer (Checks for > 5s hardware drops)
  useEffect(() => {
    const watchdogInterval = window.setInterval(() => {
      const isTimedOut = isWatchdogTimedOut(lastPacketTime, Date.now(), 5000);

      if (isTimedOut && !wasOfflineRef.current) {
        wasOfflineRef.current = true;
        setConnection('OFFLINE');
        addLog(
          'connection',
          'Watchdog Alert: Hardware Offline (>5s Drop)',
          'ESP32-S3 mmWave radar packet stream interrupted. Verify power & Wi-Fi connection.',
          'danger'
        );
      } else if (!isTimedOut && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setConnection(isSimulation ? 'SIMULATED' : 'ONLINE');
        addLog(
          'connection',
          'Watchdog Restored: Hardware Stream Active',
          'Telemetry connection re-established with ESP32-S3 sensor.',
          'success'
        );
      }
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [lastPacketTime, isSimulation, addLog]);

  // Simulation Trigger Handlers
  const handleSimulateFall = () => {
    handleUserGesture();
    simPausedRef.current = false;
    setLastPacketTime(Date.now());

    // 1. Kinetic velocity spike (3.2 m/s impact)
    const spikeSpeed = 3.25;
    logTelemetryPacket(spikeSpeed, 0.85, 'VERIFYING', true);
    setTelemetry((prev) => ({
      ...prev,
      speed: spikeSpeed,
      distance: 0.85,
      kineticSpike: true,
      timestamp: Date.now(),
    }));
    setSpeedHistory((history) => [...history.slice(-24), spikeSpeed]);
    setPeakSpeed((curr) => Math.max(curr, spikeSpeed));

    addLog(
      'kinetic_spike',
      'Simulated Kinetic Surge: 3.25 m/s',
      'Rapid downward descent detected by C4001 mmWave radar. Initiating verification countdown.',
      'warning'
    );

    // 2. Transition to VERIFYING FALL... state
    transitionToState('VERIFYING');
  };

  const handleSimulateFalseAlarm = () => {
    handleUserGesture();
    simPausedRef.current = false;
    setLastPacketTime(Date.now());

    const spikeSpeed = 2.1;
    logTelemetryPacket(spikeSpeed, 1.4, 'VERIFYING', true);
    setTelemetry((prev) => ({
      ...prev,
      speed: spikeSpeed,
      distance: 1.4,
      kineticSpike: true,
      timestamp: Date.now(),
    }));
    setSpeedHistory((history) => [...history.slice(-24), spikeSpeed]);
    setPeakSpeed((curr) => Math.max(curr, spikeSpeed));

    addLog(
      'kinetic_spike',
      'Simulated Transient Surge: 2.10 m/s',
      'Trip-and-catch scenario. Verification countdown started for caregiver testing.',
      'warning'
    );

    transitionToState('VERIFYING');
  };

  const handleSimulateNormalMotion = () => {
    handleUserGesture();
    simPausedRef.current = false;
    setLastPacketTime(Date.now());
    transitionToState('NORMAL');
    logTelemetryPacket(0.65, 2.4, 'NORMAL', false);
    setTelemetry((prev) => ({
      ...prev,
      speed: 0.65,
      distance: 2.4,
      kineticSpike: false,
    }));
    addLog(
      'info',
      'Normal Room Pacing Resumed',
      'Target moving within safe velocity envelope (0.65 m/s).',
      'info'
    );
  };

  const handleSimulateDisconnect = () => {
    handleUserGesture();
    simPausedRef.current = true;
    // Set lastPacketTime into past to trip the watchdog
    setLastPacketTime(Date.now() - 5500);
    addLog(
      'connection',
      'Simulated Packet Stream Halt',
      'Watchdog timer will trip immediately due to 5.5s simulated delta.',
      'warning'
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950"
      onClick={handleUserGesture}
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                  HERTZ &amp; HAVEN <span className="text-emerald-400 font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30">ZEN1</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>C4001 mmWave Radar Fall Hub</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-emerald-400/90">{roomDetails.sensorModel}</span>
              </p>
            </div>
          </div>

          {/* Quick Context & Config Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Room / Resident Tag */}
            <div className="hidden md:flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300 font-medium">{roomDetails.roomName}</span>
              <span className="text-slate-600">|</span>
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300 font-medium">{roomDetails.patientName}</span>
            </div>

            {/* Audio Settings Button */}
            <button
              type="button"
              onClick={() => {
                handleUserGesture();
                setIsAudioModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              aria-label="Open audio synthesizer settings"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Audio Synthesizer</span>
              <span className="sm:hidden">Audio</span>
            </button>

            {/* Blynk Config Button */}
            <button
              type="button"
              onClick={() => {
                handleUserGesture();
                setIsBlynkModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              aria-label="Open Blynk Cloud hardware settings"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Blynk Cloud</span>
              <span className="sm:hidden">Blynk</span>
            </button>

            {/* Terminal Toggle Button */}
            <button
              type="button"
              onClick={() => {
                handleUserGesture();
                setIsTerminalOpen((prev) => {
                  const next = !prev;
                  if (next) setIsTerminalMinimized(false);
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isTerminalOpen
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isTerminalOpen ? 'Hide Telemetry Terminal' : 'Show Telemetry Terminal'}
              aria-label={isTerminalOpen ? 'Hide Telemetry Terminal' : 'Show Telemetry Terminal'}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Terminal</span>
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-2 rounded-xl text-xs border transition-colors ${
                audioSettings.isMuted
                  ? 'bg-amber-950/50 text-amber-300 border-amber-800/80'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={audioSettings.isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
              aria-label={audioSettings.isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            >
              {audioSettings.isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Dynamic System Status Banner */}
        <StatusBanner
          status={telemetry.status}
          connection={connection}
          latencyMs={latencyMs}
          lastPacketTime={lastPacketTime}
          countdownSeconds={verifyingCountdown}
          isSimulation={isSimulation}
        />

        {/* 2-Column Responsive Monitoring Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left / Center Major Column: Radar Scope & Telemetry Gauges (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-5">
            {/* HTML5 Canvas Radar Sweeper */}
            <RadarSweeper
              distance={telemetry.distance}
              speed={telemetry.speed}
              angle={telemetry.angle}
              status={telemetry.status}
              isOnline={connection !== 'OFFLINE' && connection !== 'ERROR'}
              maxDistance={6.0}
            />

            {/* Real-Time Movement Metrics Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SpeedGauge
                speed={telemetry.speed}
                history={speedHistory}
                peakSpeed={peakSpeed}
                kineticSpike={telemetry.kineticSpike}
                onResetPeak={() => setPeakSpeed(Math.abs(telemetry.speed))}
              />

              <DistanceMeter
                distance={telemetry.distance}
              />
            </div>

            {/* Real-Time Telemetry Terminal (Speed, Distance & Speed Delta) */}
            {isTerminalOpen ? (
              <TelemetryTerminal
                entries={terminalEntries}
                currentSpeed={telemetry.speed}
                currentDistance={telemetry.distance}
                currentSpeedDelta={currentSpeedDelta}
                isPaused={isTerminalPaused}
                onTogglePause={() => {
                  setIsTerminalPaused((prev) => {
                    const next = !prev;
                    isTerminalPausedRef.current = next;
                    return next;
                  });
                }}
                onClear={() => setTerminalEntries([])}
                isMinimized={isTerminalMinimized}
                onToggleMinimize={() => setIsTerminalMinimized((prev) => !prev)}
                onClose={() => setIsTerminalOpen(false)}
              />
            ) : (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-3 sm:px-4 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-400">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Telemetry Terminal is closed</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTerminalOpen(true);
                    setIsTerminalMinimized(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/80 transition-colors active:scale-95"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open Terminal</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Emergency Controls, Simulation Engine & Activity Stream (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-5 flex flex-col">
            {/* Emergency Controls (V3 Reset, Direct Call & SOS) */}
            <EmergencyControls
              status={telemetry.status}
              isMuted={audioSettings.isMuted}
              onToggleMute={handleToggleMute}
              onCancelAlarm={handleCancelAlarm}
              onTriggerSOS={handleTriggerSOS}
              isCancelling={isCancelling}
              patientName={roomDetails.patientName}
              patientPhone={roomDetails.patientPhone}
              onLogCall={(name, phone) => {
                addLog(
                  'caregiver',
                  `Direct Call Placed: ${name}`,
                  `Caregiver initiated telephone call to ${phone}.`,
                  'info'
                );
              }}
            />

            {/* Hardware-Free Simulation Engine Panel */}
            <SimulationPanel
              isSimulation={isSimulation}
              onToggleSimulation={(val) => {
                setIsSimulation(val);
                if (val) {
                  setConnection('SIMULATED');
                  simPausedRef.current = false;
                  setLastPacketTime(Date.now());
                } else {
                  setConnection(blynkConfig.token ? 'CONNECTING' : 'OFFLINE');
                }
              }}
              onSimulateFall={handleSimulateFall}
              onSimulateFalseAlarm={handleSimulateFalseAlarm}
              onSimulateNormalMotion={handleSimulateNormalMotion}
              onSimulateDisconnect={handleSimulateDisconnect}
              currentStatus={telemetry.status}
            />

            {/* Timestamped Activity Feed & Audit Stream */}
            <div className="flex-1 min-h-[300px]">
              <EventAuditLog
                logs={logs}
                onClearLogs={() => setLogs([])}
              />
            </div>
          </div>
        </div>

        {/* System Architecture & Virtual Pin Hardware Information Bar */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>System Architecture:</strong> ESP32-S3 + DFRobot C4001 mmWave (24GHz) &rarr; Blynk Cloud REST API &rarr; Web Dashboard &rarr; Web Audio Engine.
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> V0: Velocity ($m/s$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> V1: Range ($m$)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> V2: State Sync
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> V3: Remote Reset
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          Hertz &amp; Haven Zen1 Autonomous Fall Monitor • Native Web Audio Synthesizer • No External Audio Assets Required
        </p>
      </footer>

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        settings={audioSettings}
        onUpdateSettings={(newSettings) => {
          setAudioSettings(newSettings);
          audioSynthesizer.updateVolumeOrMute(newSettings);
        }}
      />

      {/* Blynk Cloud Settings Modal */}
      <BlynkSettingsModal
        isOpen={isBlynkModalOpen}
        onClose={() => setIsBlynkModalOpen(false)}
        config={blynkConfig}
        onSaveConfig={(newConfig) => {
          setBlynkConfig(newConfig);
          if (newConfig.token) {
            setIsSimulation(false);
          }
        }}
        roomDetails={roomDetails}
        onSaveRoomDetails={setRoomDetails}
      />
    </div>
  );
}
