import React, { useState } from 'react';
import { X, Cloud, Key, Server, RefreshCw, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { BlynkConfig, RoomDetails } from '../types';

interface BlynkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BlynkConfig;
  onSaveConfig: (newConfig: BlynkConfig) => void;
  roomDetails: RoomDetails;
  onSaveRoomDetails: (details: RoomDetails) => void;
}

export const BlynkSettingsModal: React.FC<BlynkSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  roomDetails,
  onSaveRoomDetails,
}) => {
  const [token, setToken] = useState(config.token);
  const [server, setServer] = useState(config.server);
  const [pollInterval, setPollInterval] = useState(config.pollInterval);
  const [roomName, setRoomName] = useState(roomDetails.roomName);
  const [patientName, setPatientName] = useState(roomDetails.patientName);
  const [patientPhone, setPatientPhone] = useState(roomDetails.patientPhone || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      token: token.trim(),
      server: server.trim(),
      pollInterval,
    });
    onSaveRoomDetails({
      ...roomDetails,
      roomName,
      patientName,
      patientPhone: patientPhone.trim(),
    });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setTestResult({ success: false, msg: 'Please provide a valid Blynk Auth Token first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const url = `${server.replace(/\/$/, '')}/external/api/get?token=${encodeURIComponent(
        token.trim()
      )}&v0&v1&v2`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const text = await res.text();
        setTestResult({
          success: true,
          msg: `Connected successfully! Response: ${text.slice(0, 50)}`,
        });
      } else {
        setTestResult({
          success: false,
          msg: `Blynk returned HTTP ${res.status}. Verify token or server region.`,
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        msg: `Connection error: ${(err as Error).message || 'Network request failed'}. Ensure CORS or try regional server.`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Hardware & Blynk Configuration"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Blynk Cloud &amp; Hardware Setup
              </h2>
              <p className="text-xs text-slate-400">
                ESP32-S3 + DFRobot C4001 mmWave Radar Link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room & Resident Info */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1. Resident &amp; Room Assignment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Room / Location</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Room 204 - Master Bedroom"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Resident / Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Direct Phone Number</label>
              <input
                type="text"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g. +1 (555) 382-9014"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Blynk Cloud Connection */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. Blynk HTTP REST API Synchronization
          </h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Blynk Auth Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Blynk Device Auth Token"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Found in your Blynk Console Device Info or firmware code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Server Domain
              </label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="https://blynk.cloud">https://blynk.cloud (Global)</option>
                <option value="https://sgp1.blynk.cloud">https://sgp1.blynk.cloud (Asia)</option>
                <option value="https://fra1.blynk.cloud">https://fra1.blynk.cloud (Europe)</option>
                <option value="https://ny3.blynk.cloud">https://ny3.blynk.cloud (Americas)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                Polling Interval
              </label>
              <select
                value={pollInterval}
                onChange={(e) => setPollInterval(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value={500}>500 ms (Rapid)</option>
                <option value={1000}>1000 ms (Default)</option>
                <option value={2000}>2000 ms (Balanced)</option>
                <option value={3000}>3000 ms (Low Bandwidth)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Blynk API Reachability'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/80 border-red-500/40 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testResult.msg}</span>
            </div>
          )}
        </div>

        {/* Virtual Pin Reference Guide */}
        <div className="mt-5 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-emerald-400" />
            ESP32-S3 Virtual Pin Protocol
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-emerald-400 font-bold block">V0 (Speed)</span>
              <span>Velocity (m/s)</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-blue-400 font-bold block">V1 (Distance)</span>
              <span>Proximity (m)</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-amber-400 font-bold block">V2 (Status)</span>
              <span>NORMAL/VERIFY/FALL</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-purple-400 font-bold block">V3 (Cancel)</span>
              <span>Remote Reset (1)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
