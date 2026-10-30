import React from 'react';
import { PlayCircle, ShieldAlert, Footprints, WifiOff, RefreshCw } from 'lucide-react';
import { SystemState } from '../types';

interface SimulationPanelProps {
  isSimulation: boolean;
  onToggleSimulation: (val: boolean) => void;
  onSimulateFall: () => void;
  onSimulateFalseAlarm: () => void;
  onSimulateNormalMotion: () => void;
  onSimulateDisconnect: () => void;
  currentStatus: SystemState;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  isSimulation,
  onToggleSimulation,
  onSimulateFall,
  onSimulateFalseAlarm,
  onSimulateNormalMotion,
  onSimulateDisconnect,
  currentStatus,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <PlayCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Hardware-Free Simulation Engine
            </h3>
            <p className="text-[10px] text-slate-400">
              Synthetic mmWave telemetry &amp; state machine testing
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSimulation}
            onChange={(e) => onToggleSimulation(e.target.checked)}
            className="sr-only peer"
            aria-label="Toggle Hardware Simulation Mode"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          <span className="ml-2 text-xs font-medium text-slate-300">
            {isSimulation ? 'Active' : 'Off'}
          </span>
        </label>
      </div>

      {isSimulation ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={onSimulateFall}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/80 transition-all text-xs font-semibold active:scale-95"
            title="Simulate sudden impact velocity spike leading to confirmed fall"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Simulate Fall</span>
          </button>

          <button
            type="button"
            onClick={onSimulateFalseAlarm}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-800/80 transition-all text-xs font-semibold active:scale-95"
            title="Simulate kinetic spike verifying window for testing false alarm cancel"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>False Alarm</span>
          </button>

          <button
            type="button"
            onClick={onSimulateNormalMotion}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/80 transition-all text-xs font-semibold active:scale-95"
            title="Simulate ordinary room pacing (0.4 - 1.1 m/s)"
          >
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>Normal Pacing</span>
          </button>

          <button
            type="button"
            onClick={onSimulateDisconnect}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-xs font-semibold active:scale-95"
            title="Simulate packet drop > 5s to trigger watchdog offline warning"
          >
            <WifiOff className="w-4 h-4 text-slate-400" />
            <span>Simulate Drop</span>
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400">
          Simulation mode is disabled. The dashboard is listening for live ESP32-S3 packets via Blynk Cloud REST API. Enable simulation above to test without hardware.
        </div>
      )}
    </div>
  );
};
