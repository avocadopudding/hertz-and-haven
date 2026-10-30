import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Pause,
  Play,
  Trash2,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TerminalEntry } from '../types';
import { formatSpeedDelta } from '../utils/radarLogic';

interface TelemetryTerminalProps {
  entries: TerminalEntry[];
  currentSpeed: number;
  currentDistance: number;
  currentSpeedDelta: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}

export const TelemetryTerminal: React.FC<TelemetryTerminalProps> = ({
  entries,
  currentSpeed,
  currentDistance,
  currentSpeedDelta,
  isPaused,
  onTogglePause,
  onClear,
  isMinimized,
  onToggleMinimize,
  onClose,
}) => {
  // Default auto-scroll to false so the user's viewport and container never move unexpectedly
  const [autoScroll, setAutoScroll] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // SAFE auto-scroll: strictly sets container scrollTop.
  // Never uses scrollIntoView() to prevent shifting the outer browser window!
  useEffect(() => {
    if (autoScroll && !isMinimized && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [entries, autoScroll, isMinimized]);

  // If user scrolls up manually, gracefully pause autoScroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 35;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleCopy = () => {
    const textLines = [
      '# ESP32-S3 + C4001 mmWave Radar Telemetry Log',
      '# Timestamp\tSpeed (m/s)\tDistance (m)\tSpeed Delta (m/s)\tStatus',
      ...entries.map(
        (e) =>
          `${e.timeStr}\t${e.speed.toFixed(2)}\t${e.distance.toFixed(2)}\t${formatSpeedDelta(
            e.speedDelta
          )}\t${e.status}`
      ),
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textLines).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDeltaColor = (delta: number) => {
    if (Math.abs(delta) < 0.02) return 'text-slate-400';
    if (delta > 0.8) return 'text-red-400 font-bold';
    if (delta > 0) return 'text-amber-400 font-semibold';
    if (delta < -0.8) return 'text-purple-400 font-bold';
    return 'text-sky-400 font-semibold';
  };

  const getDeltaIcon = (delta: number) => {
    if (Math.abs(delta) < 0.02) return <Minus className="w-3 h-3 inline text-slate-500" />;
    if (delta > 0) return <ArrowUpRight className="w-3 h-3 inline text-amber-400" />;
    return <ArrowDownRight className="w-3 h-3 inline text-sky-400" />;
  };

  // Minimized View: Compact Title Strip with live metrics and expand controls
  if (isMinimized) {
    return (
      <div
        className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 sm:px-4 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs select-none transition-all"
        data-testid="telemetry-terminal-minimized"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors"
              title="Close terminal"
              aria-label="Close terminal"
            />
            <button
              type="button"
              onClick={onToggleMinimize}
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-400 transition-colors"
              title="Restore / Expand terminal"
              aria-label="Restore terminal"
            />
            <button
              type="button"
              onClick={onToggleMinimize}
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
              title="Restore / Expand terminal"
              aria-label="Restore terminal"
            />
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              c4001-telemetry <span className="text-slate-500 text-[10px]">[MINIMIZED]</span>
            </span>
          </div>
        </div>

        {/* Live HUD Quick Readouts */}
        <div className="flex items-center gap-2 text-[11px] bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-400">
            SPEED: <strong className="text-emerald-400 font-bold">{currentSpeed.toFixed(2)} m/s</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            DIST: <strong className="text-sky-400 font-bold">{currentDistance.toFixed(2)} m</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <span>Δv:</span>
            <strong className={`font-bold ${getDeltaColor(currentSpeedDelta)}`}>
              {formatSpeedDelta(currentSpeedDelta)}
            </strong>
            {getDeltaIcon(currentSpeedDelta)}
          </span>
        </div>

        {/* Restore & Close Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Expand terminal console"
            aria-label="Expand terminal console"
          >
            <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Expand</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            title="Close terminal"
            aria-label="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View: Full Terminal Window
  return (
    <div
      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono transition-all"
      data-testid="telemetry-terminal"
    >
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 select-none">
        {/* Terminal Window Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1.5">
            <button
              type="button"
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors"
              title="Close terminal"
              aria-label="Close terminal"
            />
            <button
              type="button"
              onClick={onToggleMinimize}
              className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-400 transition-colors"
              title="Minimize terminal"
              aria-label="Minimize terminal"
            />
            <button
              type="button"
              onClick={onToggleMinimize}
              className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
              title="Expand / restore terminal"
              aria-label="Expand terminal"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              esp32s3@zen1: <span className="text-emerald-400">~/c4001-telemetry</span>
            </span>
          </div>
        </div>

        {/* Live HUD Quick Readouts */}
        <div className="flex items-center gap-2 text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-400">
            SPEED: <strong className="text-emerald-400 font-bold">{currentSpeed.toFixed(2)} m/s</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            DIST: <strong className="text-sky-400 font-bold">{currentDistance.toFixed(2)} m</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 flex items-center gap-1">
            <span>Δv:</span>
            <strong className={`font-bold ${getDeltaColor(currentSpeedDelta)}`}>
              {formatSpeedDelta(currentSpeedDelta)}
            </strong>
            {getDeltaIcon(currentSpeedDelta)}
          </span>
        </div>

        {/* Terminal Actions & Window Control Buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={onTogglePause}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
              isPaused
                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/80'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isPaused ? 'Resume live terminal stream' : 'Pause terminal stream'}
            aria-label={isPaused ? 'Resume terminal stream' : 'Pause terminal stream'}
          >
            {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-slate-400" />}
            <span>{isPaused ? 'Paused' : 'Live'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              autoScroll
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Toggle auto-scroll inside container"
            aria-label="Toggle auto scroll"
          >
            Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy terminal contents to clipboard"
            aria-label="Copy terminal text"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 transition-colors"
            title="Clear terminal buffer"
            aria-label="Clear terminal log"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={onToggleMinimize}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Minimize terminal"
            aria-label="Minimize terminal"
          >
            <ChevronUp className="w-3 h-3" />
            <span className="hidden sm:inline">Minimize</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            title="Close terminal"
            aria-label="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="p-3 sm:p-4 text-[11px] sm:text-xs leading-relaxed max-h-[300px] overflow-y-auto space-y-1 scrollbar-thin text-slate-300"
        role="log"
        aria-live="polite"
        aria-label="Real-time speed, distance, and speed delta telemetry stream"
      >
        <div className="text-slate-500 mb-2 select-none border-b border-slate-900 pb-2">
          <div>$ c4001_radar_stream --pins=V0,V1,V2 --track=speed,distance,delta</div>
          <div>[INFO] Sensor baud 115200 bps | 24GHz FMCW Doppler Target Tracker online</div>
          <div className="grid grid-cols-12 gap-2 text-slate-400 font-bold mt-1.5 pt-1 border-t border-slate-900 text-[10px] sm:text-[11px]">
            <span className="col-span-3">TIMESTAMP</span>
            <span className="col-span-3">SPEED (V0)</span>
            <span className="col-span-3">DISTANCE (V1)</span>
            <span className="col-span-3">SPEED DELTA (Δv)</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-slate-600 py-6 text-center">
            No telemetry stream packets received yet. Waiting for ESP32-S3 / C4001 packets...
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`grid grid-cols-12 gap-2 py-0.5 px-1.5 rounded transition-colors ${
                entry.isSpike
                  ? 'bg-red-950/40 border border-red-800/50'
                  : 'hover:bg-slate-900/60'
              }`}
            >
              {/* Timestamp */}
              <span className="col-span-3 text-slate-400 truncate">
                {entry.timeStr}
              </span>

              {/* Speed */}
              <span
                className={`col-span-3 font-semibold ${
                  entry.isSpike ? 'text-red-400 font-bold' : 'text-emerald-400'
                }`}
              >
                {entry.speed.toFixed(2)} m/s
                {entry.isSpike && <span className="ml-1 text-[9px] text-red-400 font-extrabold">[SURGE]</span>}
              </span>

              {/* Distance */}
              <span className="col-span-3 text-sky-400 font-semibold">
                {entry.distance.toFixed(2)} m
              </span>

              {/* Speed Delta */}
              <span className={`col-span-3 flex items-center gap-1 ${getDeltaColor(entry.speedDelta)}`}>
                <span>{formatSpeedDelta(entry.speedDelta)}</span>
                {getDeltaIcon(entry.speedDelta)}
              </span>
            </div>
          ))
        )}

        {/* Command line prompt with blinking cursor */}
        <div className="pt-2 text-slate-500 flex items-center gap-1 text-[11px] select-none">
          <span className="text-emerald-400">c4001@zen1:~$</span>
          <span>tail -f /dev/ttyRadar</span>
          <span className="w-2 h-3.5 bg-emerald-400 inline-block animate-pulse ml-0.5"></span>
        </div>
      </div>

      {/* Terminal Footer Info Bar */}
      <div className="bg-slate-900/60 border-t border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 select-none">
        <div className="flex items-center gap-3">
          <span>BUFFER: {entries.length} PACKETS</span>
          <span>RATE: ~1.0 Hz</span>
          <span>UART: TX/RX GPIO 17/18</span>
        </div>
        <div className="font-mono text-emerald-400/80">
          STATUS: {isPaused ? 'STREAM PAUSED' : 'STREAMING LIVE'}
        </div>
      </div>
    </div>
  );
};
