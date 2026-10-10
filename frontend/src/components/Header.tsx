import React from 'react';
import {
  Cloud,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { SystemStatus } from '../api/client';

interface HeaderProps {
  status: SystemStatus | null;
  isSyncing: boolean;
  onSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, isSyncing, onSync }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-base text-slate-100 tracking-tight">
              GCP Cost Optimizer
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Compute Engine v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Automated non-production workload scheduler & savings engine
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Mode Badge */}
        {status?.mode === 'LIVE_GCP' ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Live GCP: <strong className="font-semibold">{status.projectId}</strong></span>
          </div>
        ) : (
          <div
            title="Running in Sandbox Demonstration Mode with realistic simulated VM fleet. Safe to test all operations."
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium cursor-help"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sandbox Mode (Simulated Fleet)</span>
          </div>
        )}

        {/* Dry Run Badge */}
        {status?.globalDryRun ? (
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dry-Run Active</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Live Mutations Enabled</span>
          </div>
        )}

        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Fleet'}</span>
        </button>
      </div>
    </header>
  );
};
