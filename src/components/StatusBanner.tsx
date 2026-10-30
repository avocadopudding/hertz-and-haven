import React from 'react';
import { ShieldCheck, AlertTriangle, Siren, Wifi, WifiOff, Clock } from 'lucide-react';
import { ConnectionStatus, SystemState } from '../types';

interface StatusBannerProps {
  status: SystemState;
  connection: ConnectionStatus;
  latencyMs: number;
  lastPacketTime: number;
  countdownSeconds: number; // For VERIFYING state
  isSimulation: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  connection,
  latencyMs,
  lastPacketTime,
  countdownSeconds,
  isSimulation,
}) => {
  const isOffline = connection === 'OFFLINE' || connection === 'ERROR';

  // Config based on status
  let bannerBg = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300';
  let badgeColor = 'bg-emerald-500 text-slate-950';
  let title = 'NORMAL - ROOM MONITORING ACTIVE';
  let subtitle = 'mmWave radar active. Kinetic speeds within safety envelope.';
  let Icon = ShieldCheck;

  if (status === 'VERIFYING') {
    bannerBg = 'bg-amber-950/60 border-amber-500/60 text-amber-200 animate-pulse';
    badgeColor = 'bg-amber-500 text-slate-950';
    title = 'VERIFYING FALL...';
    subtitle = `Kinetic surge tripped. Confirming target posture in ${countdownSeconds}s...`;
    Icon = AlertTriangle;
  } else if (status === 'FALL_DETECTED') {
    bannerBg = 'bg-red-950/80 border-red-500 text-red-100 ring-2 ring-red-500 animate-[pulse_1s_infinite]';
    badgeColor = 'bg-red-500 text-white';
    title = 'FALL DETECTED! EMERGENCY ALERT';
    subtitle = 'High-velocity impact followed by motionless target. Immediate response required!';
    Icon = Siren;
  }

  // Connection badge styling
  const getConnectionBadge = () => {
    if (isSimulation) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-purple-900/40 text-purple-300 border border-purple-500/30">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          SIMULATION ACTIVE
        </span>
      );
    }
    if (isOffline) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-900/60 text-red-200 border border-red-500 animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
          HARDWARE OFFLINE (&gt;5s DROP)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        BLYNK CLOUD ONLINE ({latencyMs}ms)
      </span>
    );
  };

  return (
    <div
      className={`w-full rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-xl ${bannerBg}`}
      data-testid="status-banner"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status Indicator */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-3 rounded-xl shadow-md ${badgeColor}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-wide font-mono">
                {title}
              </h2>
              {status === 'VERIFYING' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-bold text-xs">
                  {countdownSeconds}s REMAINING
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Connection & Watchdog Status */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          {getConnectionBadge()}

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-800">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              {lastPacketTime > 0
                ? `${Math.max(0, Math.round((Date.now() - lastPacketTime) / 1000))}s ago`
                : 'No sync yet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
