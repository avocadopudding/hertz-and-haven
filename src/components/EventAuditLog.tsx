import React, { useState } from 'react';
import { History, Download, Trash2, Filter } from 'lucide-react';
import { LogEvent } from '../types';

interface EventAuditLogProps {
  logs: LogEvent[];
  onClearLogs: () => void;
}

export const EventAuditLog: React.FC<EventAuditLogProps> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<'all' | 'alarms' | 'system' | 'caregiver'>('all');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'alarms') {
      return log.type === 'state_change' || log.type === 'kinetic_spike' || log.type === 'sos';
    }
    if (filter === 'system') {
      return log.type === 'connection' || log.type === 'info';
    }
    if (filter === 'caregiver') {
      return log.type === 'alarm_cancel' || log.type === 'sos';
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Type', 'Level', 'Title', 'Description'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.type}"`,
      `"${l.level}"`,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zen1_radar_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLevelBadge = (level: LogEvent['level']) => {
    switch (level) {
      case 'danger':
        return 'bg-red-950/80 text-red-300 border-red-800';
      case 'warning':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'success':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'info':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Timestamped Activity Stream &amp; Audit Log
            </h3>
            <p className="text-[10px] text-slate-400">
              {logs.length} logged events stored in local session buffer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Export CSV log"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            title="Clear Log History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 my-3 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 text-[10px] uppercase font-mono mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {(
          [
            { id: 'all', label: 'All Events' },
            { id: 'alarms', label: 'Alarms & Falls' },
            { id: 'caregiver', label: 'Caregiver Actions' },
            { id: 'system', label: 'Hardware & Sync' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === t.id
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Log Feed List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px] pr-1 scrollbar-thin">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No events match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${getLevelBadge(
                      log.level
                    )}`}
                  >
                    {log.type.replace('_', ' ')}
                  </span>
                  <span className="font-semibold text-slate-200">{log.title}</span>
                </div>
                <p className="text-[11px] text-slate-400">{log.description}</p>
              </div>

              <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">
                {log.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
