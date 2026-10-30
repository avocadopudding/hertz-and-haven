import React, { useMemo } from 'react';
import { Activity, Flame } from 'lucide-react';

interface SpeedGaugeProps {
  speed: number; // in m/s
  history: number[]; // recent speed readings
  peakSpeed: number;
  kineticSpike: boolean;
  onResetPeak?: () => void;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  speed,
  history,
  peakSpeed,
  kineticSpike,
  onResetPeak,
}) => {
  const maxScale = 4.0; // max gauge speed in m/s
  const absSpeed = Math.abs(speed);
  const percentage = Math.min((absSpeed / maxScale) * 100, 100);

  // SVG Semi-circle gauge geometry
  const radius = 64;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // 180 degrees
  const strokeDashoffset = circumference - (circumference * percentage) / 100;

  // Gauge color based on velocity
  const gaugeColor = useMemo(() => {
    if (absSpeed >= 2.0) return '#ef4444'; // Red
    if (absSpeed >= 1.2) return '#f59e0b'; // Amber
    if (absSpeed >= 0.4) return '#10b981'; // Green
    return '#64748b'; // Slate / static
  }, [absSpeed]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
      {/* Background kinetic flare glow */}
      {kineticSpike && (
        <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Target Velocity (V0)
            </h3>
            <p className="text-[10px] text-slate-400">C4001 mmWave Kinetic Doppler</p>
          </div>
        </div>

        {kineticSpike ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-full animate-bounce">
            <Flame className="w-3.5 h-3.5 text-red-400 fill-red-400" /> KINETIC SURGE
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Threshold: 1.8 m/s
          </span>
        )}
      </div>

      {/* Main Semi-Circular Gauge */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <svg className="w-44 h-24 overflow-visible" viewBox="0 0 160 90">
          {/* Background Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Velocity Arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center Digital Value Display */}
        <div className="absolute bottom-0 flex flex-col items-center text-center">
          <div className="flex items-baseline gap-1">
            <span
              className="font-mono text-3xl font-extrabold tracking-tight"
              style={{ color: gaugeColor }}
            >
              {absSpeed.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400 font-semibold">m/s</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {absSpeed < 0.2 ? 'Motionless / Rest' : absSpeed < 1.2 ? 'Normal Gait' : absSpeed < 2.0 ? 'Rapid Movement' : 'Critical Impact!'}
          </span>
        </div>
      </div>

      {/* Velocity History Sparkline */}
      <div className="mt-1 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-400 font-mono text-[10px]">RECENT SAMPLES (20s)</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[10px]">
              PEAK: <strong className="text-amber-400">{peakSpeed.toFixed(2)} m/s</strong>
            </span>
            {onResetPeak && peakSpeed > 0 && (
              <button
                type="button"
                onClick={onResetPeak}
                className="text-[9px] text-slate-500 hover:text-slate-300 underline"
                title="Reset Peak Counter"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Mini SVG Sparkline */}
        <div className="h-9 w-full bg-slate-950/50 rounded-lg p-1 flex items-end">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
            {history.length > 1 && (
              <polyline
                fill="none"
                stroke={kineticSpike ? '#ef4444' : '#10b981'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={history
                  .map((val, idx) => {
                    const x = (idx / (Math.max(history.length - 1, 1))) * 100;
                    const y = 30 - Math.min((Math.abs(val) / maxScale) * 26, 28);
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
