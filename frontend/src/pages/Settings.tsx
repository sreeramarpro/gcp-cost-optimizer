import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cloud,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { SystemStatus, api } from '../api/client';

interface SettingsProps {
  status: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ status, onRefreshStatus }) => {
  const [projectId, setProjectId] = useState(status?.projectId || '');
  const [credentialsPath, setCredentialsPath] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const [savingConfig, setSavingConfig] = useState(false);

  const handleTestConnection = async () => {
    if (!projectId) {
      alert('Please enter a GCP Project ID');
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.testConnection(projectId, credentialsPath || undefined);
      setTestResult(res);
      onRefreshStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSwitchMode = async (mode: 'LIVE_GCP' | 'SANDBOX_DEMO') => {
    try {
      await api.switchMode(mode, projectId, credentialsPath || undefined);
      onRefreshStatus();
    } catch (err: any) {
      alert(`Error switching mode: ${err.message}`);
    }
  };

  const handleToggleGlobalDryRun = async (newVal: boolean) => {
    setSavingConfig(true);
    try {
      await api.updateConfig({ globalDryRun: newVal });
      onRefreshStatus();
    } catch (err: any) {
      alert(`Error updating configuration: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleScheduler = async (newVal: boolean) => {
    setSavingConfig(true);
    try {
      await api.updateConfig({ schedulerEnabled: newVal });
      onRefreshStatus();
    } catch (err: any) {
      alert(`Error updating configuration: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & GCP Connection</h2>
        <p className="text-xs text-slate-400">
          Configure Google Cloud API authentication, environment mode, and global safety switches
        </p>
      </div>

      {/* Mode Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Environment Mode</h3>
              <p className="text-xs text-slate-400">
                Current operational mode: <strong>{status?.mode}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSwitchMode('SANDBOX_DEMO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                status?.mode === 'SANDBOX_DEMO'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Sandbox Demo Mode
            </button>
            <button
              onClick={() => handleSwitchMode('LIVE_GCP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                status?.mode === 'LIVE_GCP'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              Live GCP Mode
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          {status?.statusMessage}
        </p>
      </div>

      {/* GCP Connection Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
          <Key className="w-4 h-4 text-indigo-400" />
          <span>Google Cloud Credentials & Project Configuration</span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">GCP Project ID</label>
            <input
              type="text"
              placeholder="e.g. my-production-project-12345"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <span className="text-slate-500 text-[11px] mt-1 block">
              The Google Cloud project containing Compute Engine instances to discover and optimize.
            </span>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Service Account Key File Path (Optional if ADC is configured)
            </label>
            <input
              type="text"
              placeholder="e.g. C:\secrets\gcp-cost-optimizer-sa.json"
              value={credentialsPath}
              onChange={(e) => setCredentialsPath(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <span className="text-slate-500 text-[11px] mt-1 block">
              Absolute path to your local Service Account JSON key. Credentials are only read by the backend process and never exposed to git or the browser.
            </span>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold block">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Connectivity...' : 'Test & Save GCP Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Switches */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Autonomous Execution Guardrails</span>
        </div>

        <div className="space-y-4 text-xs divide-y divide-slate-800">
          {/* Global Dry Run */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5 max-w-lg">
              <span className="font-semibold text-slate-200 block">Global Dry-Run Enforcement</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When enabled, all schedule executions and manual triggers will evaluate policies and create audit logs, but will NEVER call live GCP start/stop APIs.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={status?.globalDryRun}
                onChange={(e) => handleToggleGlobalDryRun(e.target.checked)}
                disabled={savingConfig}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* Scheduler Daemon */}
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-0.5 max-w-lg">
              <span className="font-semibold text-slate-200 block">Automated Cron Scheduler Daemon</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Controls the backend background engine that monitors cron triggers every 60 seconds and initiates scheduled actions.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={status?.schedulerEnabled}
                onChange={(e) => handleToggleScheduler(e.target.checked)}
                disabled={savingConfig}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
