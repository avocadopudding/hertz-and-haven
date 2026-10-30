import React from 'react';
import { Ruler } from 'lucide-react';

interface DistanceMeterProps {
  distance: number; // in meters
}

export const DistanceMeter: React.FC<DistanceMeterProps> = ({ distance }) => {
  const maxDistance = 6.0;
  const clampedDist = Math.min(Math.max(distance, 0), maxDistance);
  const fillPercent = (clampedDist / maxDistance) * 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Distance from Sensor (V1)
            </h3>
            <p className="text-[10px] text-slate-400">Target Range</p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          Max: 6.0m
        </span>
      </div>

      {/* Main Distance Readout */}
      <div className="my-3 flex items-baseline justify-start">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-extrabold text-blue-400">
            {distance > 0 ? distance.toFixed(2) : '--'}
          </span>
          <span className="text-sm font-mono text-slate-400 font-semibold">meters</span>
        </div>
      </div>

      {/* Distance Progress Bar */}
      <div className="mt-2 space-y-1.5">
        <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        {/* Simple Range Scale */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
          <span>0m</span>
          <span>2m</span>
          <span>4m</span>
          <span>6m</span>
        </div>
      </div>
    </div>
  );
};
