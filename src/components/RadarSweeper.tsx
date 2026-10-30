import React, { useEffect, useRef } from 'react';
import { SystemState } from '../types';

interface RadarSweeperProps {
  distance: number; // in meters (0 to 6+)
  speed: number; // in m/s
  angle: number; // degrees (-60 to +60)
  status: SystemState;
  isOnline: boolean;
  maxDistance?: number;
}

interface BlipHistoryPoint {
  x: number;
  y: number;
  alpha: number;
}

export const RadarSweeper: React.FC<RadarSweeperProps> = ({
  distance,
  speed,
  angle,
  status,
  isOnline,
  maxDistance = 6.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const historyRef = useRef<BlipHistoryPoint[]>([]);

  // Update target history trail
  useEffect(() => {
    if (!isOnline || distance <= 0.1) return;

    // Convert polar (distance, angle) to normalized Cartesian relative to center
    const rad = ((angle - 90) * Math.PI) / 180;
    const clampedDist = Math.min(distance, maxDistance);
    const normRadius = clampedDist / maxDistance;

    const px = Math.cos(rad) * normRadius;
    const py = Math.sin(rad) * normRadius;

    historyRef.current.unshift({ x: px, y: py, alpha: 1.0 });
    if (historyRef.current.length > 18) {
      historyRef.current.pop();
    }
  }, [distance, angle, isOnline, maxDistance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Rotate sweep beam (approx 45 RPM)
      if (isOnline) {
        sweepAngleRef.current = (sweepAngleRef.current + delta * 2.8) % (Math.PI * 2);
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height * 0.78; // Offset center towards bottom for standard 120-degree room fan scope
      const maxRadius = Math.min(width * 0.44, height * 0.7);

      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadius * 1.15);
      bgGrad.addColorStop(0, '#09131d');
      bgGrad.addColorStop(0.7, '#040b11');
      bgGrad.addColorStop(1, '#020609');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radar Field of View sector (120 degree cone for C4001 mmWave radar, from -60 to +60 degrees)
      const startAngle = ((-90 - 60) * Math.PI) / 180;
      const endAngle = ((-90 + 60) * Math.PI) / 180;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 78, 59, 0.08)';
      ctx.fill();
      ctx.restore();

      // Draw Concentric Distance Rings (1m, 2m, 3m, 4m, 5m, 6m)
      const ringCount = 6;
      for (let i = 1; i <= ringCount; i++) {
        const r = (i / ringCount) * maxRadius;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = i === ringCount ? 'rgba(52, 211, 153, 0.4)' : 'rgba(52, 211, 153, 0.15)';
        ctx.lineWidth = i === ringCount ? 1.5 : 1;
        ctx.setLineDash(i % 2 === 0 ? [] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring distance text labels
        ctx.fillStyle = 'rgba(110, 231, 183, 0.6)';
        ctx.font = '10px monospace';
        const labelX = cx + Math.cos(endAngle) * r + 6;
        const labelY = cy + Math.sin(endAngle) * r - 2;
        ctx.fillText(`${i}m`, labelX, labelY);
      }

      // Draw Radial Azimuth Angle Lines (-60°, -45°, -30°, 0°, +30°, +45°, +60°)
      const angles = [-60, -45, -30, 0, 30, 45, 60];
      angles.forEach((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * maxRadius, cy + Math.sin(rad) * maxRadius);
        ctx.strokeStyle = deg === 0 ? 'rgba(52, 211, 153, 0.35)' : 'rgba(52, 211, 153, 0.12)';
        ctx.lineWidth = deg === 0 ? 1.5 : 1;
        ctx.stroke();

        // Degree label
        const degX = cx + Math.cos(rad) * (maxRadius + 14);
        const degY = cy + Math.sin(rad) * (maxRadius + 14);
        ctx.fillStyle = 'rgba(110, 231, 183, 0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${deg > 0 ? '+' : ''}${deg}°`, degX, degY);
      });

      // Draw Rotating Sweep Beam (within active 120-degree sector)
      if (isOnline) {
        // Sweep oscillates or rotates through the sector
        const sweepRad = startAngle + ((Math.sin(time * 0.002) + 1) / 2) * (endAngle - startAngle);

        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        sweepGrad.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
        sweepGrad.addColorStop(0.8, 'rgba(52, 211, 153, 0.15)');
        sweepGrad.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxRadius, sweepRad - 0.22, sweepRad);
        ctx.closePath();
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        // Leading edge bright line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepRad) * maxRadius, cy + Math.sin(sweepRad) * maxRadius);
        ctx.strokeStyle = 'rgba(167, 243, 208, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Target Trail Blips
      historyRef.current.forEach((point, idx) => {
        point.alpha *= 0.94;
        if (point.alpha > 0.05) {
          const hx = cx + point.x * maxRadius;
          const hy = cy + point.y * maxRadius;
          ctx.beginPath();
          ctx.arc(hx, hy, 3 * point.alpha, 0, Math.PI * 2);
          ctx.fillStyle = status === 'FALL_DETECTED'
            ? `rgba(239, 68, 68, ${point.alpha * 0.45})`
            : status === 'VERIFYING'
            ? `rgba(245, 158, 11, ${point.alpha * 0.45})`
            : `rgba(52, 211, 153, ${point.alpha * 0.35})`;
          ctx.fill();
        }
      });

      // Draw Active Target Blip
      if (isOnline && distance > 0.1 && distance <= maxDistance * 1.2) {
        const rad = ((angle - 90) * Math.PI) / 180;
        const normDist = Math.min(distance, maxDistance) / maxDistance;
        const targetX = cx + Math.cos(rad) * normDist * maxRadius;
        const targetY = cy + Math.sin(rad) * normDist * maxRadius;

        // Blip Color based on state
        let blipColor = '#10b981'; // Green
        let glowColor = 'rgba(16, 185, 129, 0.5)';
        let outerWaveColor = 'rgba(16, 185, 129, 0.2)';

        if (status === 'FALL_DETECTED') {
          blipColor = '#ef4444'; // Red
          glowColor = 'rgba(239, 68, 68, 0.8)';
          outerWaveColor = 'rgba(239, 68, 68, 0.4)';
        } else if (status === 'VERIFYING') {
          blipColor = '#f59e0b'; // Amber
          glowColor = 'rgba(245, 158, 11, 0.7)';
          outerWaveColor = 'rgba(245, 158, 11, 0.3)';
        }

        // Expanding distress ripples if FALL_DETECTED or VERIFYING
        if (status === 'FALL_DETECTED' || status === 'VERIFYING') {
          const pulse = (time % 1200) / 1200;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 8 + pulse * 28, 0, Math.PI * 2);
          ctx.strokeStyle = outerWaveColor;
          ctx.lineWidth = 2 * (1 - pulse);
          ctx.stroke();

          // Second wave
          const pulse2 = ((time + 600) % 1200) / 1200;
          ctx.beginPath();
          ctx.arc(targetX, targetY, 8 + pulse2 * 28, 0, Math.PI * 2);
          ctx.strokeStyle = outerWaveColor;
          ctx.lineWidth = 2 * (1 - pulse2);
          ctx.stroke();
        }

        // Target glow core
        const targetGrad = ctx.createRadialGradient(targetX, targetY, 2, targetX, targetY, 14);
        targetGrad.addColorStop(0, blipColor);
        targetGrad.addColorStop(0.6, glowColor);
        targetGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(targetX, targetY, 14, 0, Math.PI * 2);
        ctx.fillStyle = targetGrad;
        ctx.fill();

        // Sharp solid inner blip dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Speed Vector Arrow (vector magnitude proportional to velocity)
        if (Math.abs(speed) > 0.15) {
          const vectorLen = Math.min(Math.abs(speed) * 22, 50);
          // Vector direction towards sensor if positive, away if negative
          const vectorAngle = speed >= 0 ? rad + Math.PI : rad;
          const arrowEndX = targetX + Math.cos(vectorAngle) * vectorLen;
          const arrowEndY = targetY + Math.sin(vectorAngle) * vectorLen;

          ctx.beginPath();
          ctx.moveTo(targetX, targetY);
          ctx.lineTo(arrowEndX, arrowEndY);
          ctx.strokeStyle = blipColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Arrow tip
          ctx.beginPath();
          ctx.arc(arrowEndX, arrowEndY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = blipColor;
          ctx.fill();
        }

        // Target Tag HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TARGET: ${distance.toFixed(1)}m | ${speed.toFixed(1)}m/s`, targetX + 12, targetY - 4);
      } else if (!isOnline) {
        // Offline radar watermark
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RADAR TELEMETRY OFFLINE', cx, cy - maxRadius * 0.5);
      }

      // Radar Sensor Origin Marker (ESP32-S3 Base)
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ESP32-S3 / C4001', cx, cy + 18);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [distance, speed, angle, status, isOnline, maxDistance]);

  return (
    <div
      className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden"
      data-testid="radar-sweeper-container"
    >
      <div className="w-full flex items-center justify-between pb-2 px-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono font-semibold tracking-wider text-slate-200">
            C4001 mmWAVE RADAR SCOPE
          </span>
        </div>
        <div className="font-mono text-slate-400 text-[11px] flex items-center gap-3">
          <span>FOV: 120°</span>
          <span>RANGE: 0-{maxDistance}m</span>
          <span className="text-emerald-400 font-bold">24GHz FMCW</span>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] max-h-[380px] flex items-center justify-center mt-1">
        <canvas
          ref={canvasRef}
          width={540}
          height={380}
          className="w-full h-full object-contain cursor-crosshair rounded-xl"
          role="img"
          aria-label={`Radar sweep display showing target at distance ${distance} meters and speed ${speed} meters per second`}
        />
      </div>

      {/* Radar Scope Footer Legend */}
      <div className="w-full grid grid-cols-3 gap-2 pt-2 px-1 text-center font-mono text-[11px] text-slate-400 border-t border-slate-800/80">
        <div className="bg-slate-800/50 rounded py-1 px-2">
          <span className="text-slate-500 block text-[9px]">AZIMUTH</span>
          <span className="text-slate-200 font-semibold">{angle > 0 ? `+${angle}°` : `${angle}°`}</span>
        </div>
        <div className="bg-slate-800/50 rounded py-1 px-2">
          <span className="text-slate-500 block text-[9px]">DISTANCE (V1)</span>
          <span className="text-emerald-300 font-semibold">{distance.toFixed(2)} m</span>
        </div>
        <div className="bg-slate-800/50 rounded py-1 px-2">
          <span className="text-slate-500 block text-[9px]">VELOCITY (V0)</span>
          <span className={`${Math.abs(speed) >= 1.8 ? 'text-amber-400 font-bold' : 'text-slate-200 font-semibold'}`}>
            {speed.toFixed(2)} m/s
          </span>
        </div>
      </div>
    </div>
  );
};
