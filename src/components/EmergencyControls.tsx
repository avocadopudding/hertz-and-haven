import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, AlertOctagon, CheckCircle2, PhoneCall, PhoneForwarded, PhoneOff } from 'lucide-react';
import { SystemState } from '../types';

interface EmergencyControlsProps {
  status: SystemState;
  isMuted: boolean;
  onToggleMute: () => void;
  onCancelAlarm: () => Promise<void>;
  onTriggerSOS: () => void;
  isCancelling: boolean;
  patientName: string;
  patientPhone: string;
  onLogCall: (name: string, phone: string) => void;
}

export const EmergencyControls: React.FC<EmergencyControlsProps> = ({
  status,
  isMuted,
  onToggleMute,
  onCancelAlarm,
  onTriggerSOS,
  isCancelling,
  patientName,
  patientPhone,
  onLogCall,
}) => {
  const [showConfirmSOS, setShowConfirmSOS] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call timer simulation if in-app active
  React.useEffect(() => {
    let interval: number | null = null;
    if (isCalling) {
      interval = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCalling]);

  const handleCancelClick = async () => {
    await onCancelAlarm();
    setCancelSuccessMsg(true);
    setTimeout(() => setCancelSuccessMsg(false), 3000);
  };

  const handleStartCall = () => {
    setIsCalling(true);
    onLogCall(patientName, patientPhone);

    // Also trigger native tel: protocol for real mobile/tablet dialer
    if (typeof window !== 'undefined' && patientPhone) {
      const cleanPhone = patientPhone.replace(/[^\d+]/g, '');
      const link = document.createElement('a');
      link.href = `tel:${cleanPhone}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEndCall = () => {
    setIsCalling(false);
  };

  const isAlarmActive = status === 'FALL_DETECTED' || status === 'VERIFYING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            CAREGIVER EMERGENCY COMMAND
          </h3>
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label={isMuted ? 'Unmute alerts' : 'Mute alerts'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Alerts Muted' : 'Audio On'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Direct hardware actuation via Blynk Pin V3 &amp; resident emergency voice link.
        </p>
      </div>

      {cancelSuccessMsg && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>V3 Remote Hardware Reset Signal Transmitted. Normal State Restored.</span>
        </div>
      )}

      {/* Direct Call Monitored Person Card */}
      {!isCalling ? (
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                Direct Resident Contact
              </span>
              <span className="text-xs font-semibold text-slate-200 block truncate">
                {patientName} <span className="text-slate-400 font-mono font-normal">({patientPhone})</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartCall}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/50 transition-all shrink-0 active:scale-95"
            aria-label={`Direct call to ${patientName}`}
          >
            <PhoneForwarded className="w-3.5 h-3.5" />
            <span>Call Resident</span>
          </button>
        </div>
      ) : (
        <div className="bg-blue-950/50 border border-blue-500/50 rounded-xl p-3 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500 text-white shrink-0">
              <PhoneCall className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-blue-300 block">
                Calling {patientName}...
              </span>
              <span className="text-xs font-mono font-bold text-white">
                Line Active ({Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEndCall}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white transition-all shrink-0 active:scale-95"
            aria-label="End phone call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Remote Alarm Cancellation (V3) */}
        <button
          type="button"
          onClick={handleCancelClick}
          disabled={isCancelling}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-98 ${
            isAlarmActive
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
          aria-label="Cancel alarm and reset hardware via Blynk V3"
        >
          <RotateCcw className={`w-4 h-4 ${isCancelling ? 'animate-spin' : ''}`} />
          <span>
            {isCancelling
              ? 'Sending V3 Reset...'
              : isAlarmActive
              ? 'Reset / Cancel Alarm (V3)'
              : 'Remote Reset (V3)'}
          </span>
        </button>

        {/* Manual SOS Trigger */}
        {!showConfirmSOS ? (
          <button
            type="button"
            onClick={() => setShowConfirmSOS(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800 transition-all active:scale-98"
            aria-label="Trigger manual SOS emergency alert"
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <span>Manual SOS Trigger</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onTriggerSOS();
                setShowConfirmSOS(false);
              }}
              className="flex-1 py-3 px-3 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60 transition-all animate-bounce"
            >
              CONFIRM SOS NOW
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmSOS(false)}
              className="py-3 px-3 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
