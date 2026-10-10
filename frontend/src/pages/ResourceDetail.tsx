import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Server,
  Cpu,
  HardDrive,
  DollarSign,
  Shield,
  ShieldAlert,
  CalendarClock,
  History,
  Tag,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CloudResource, ExecutionLog, api } from '../api/client';

interface ResourceDetailProps {
  resourceId: string;
  onBack: () => void;
}

export const ResourceDetail: React.FC<ResourceDetailProps> = ({
  resourceId,
  onBack,
}) => {
  const [resource, setResource] = useState<CloudResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDetails();
  }, [resourceId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getResource(resourceId);
      setResource(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resource details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading resource specifications...</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-200">{error || 'Resource not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-slate-200 text-xs rounded-xl"
        >
          Back to Inventory
        </button>
      </div>
    );
  }

  const isRunning = resource.status === 'RUNNING';
  const baselineMonthly = (resource.estimatedHourlyCost * 730).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top back bar */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{resource.name}</h2>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {resource.status}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 truncate max-w-2xl">{resource.id}</p>
        </div>
      </div>

      {/* Grid: Specs and Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Machine Specifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4" />
            <span>Compute Configuration</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Machine Family:</span>
              <span className="font-mono text-slate-200 font-semibold">{resource.machineType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">vCPUs:</span>
              <span className="font-mono text-slate-200">{resource.cpuCount} Cores</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Memory:</span>
              <span className="font-mono text-slate-200">
                {(resource.memoryMb / 1024).toFixed(1)} GB RAM
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Zone / Region:</span>
              <span className="font-mono text-slate-200">{resource.zoneOrRegion}</span>
            </div>
          </div>
        </div>

        {/* Cost Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <DollarSign className="w-4 h-4" />
            <span>Cost & Optimization Profile</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">On-Demand Rate:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ${resource.estimatedHourlyCost.toFixed(4)} / hr
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Baseline (24/7):</span>
              <span className="font-mono text-slate-200">${baselineMonthly} / mo</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Potential Savings:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                ~${(parseFloat(baselineMonthly) * 0.67).toFixed(2)} / mo (67%)
              </span>
            </div>
          </div>
        </div>

        {/* Protection & Safety */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Guardrail Evaluation</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Protection Status:</span>
              <span
                className={`font-semibold ${
                  resource.isProtected ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {resource.isProtected ? 'Protected' : 'Unprotected'}
              </span>
            </div>
            <div className="py-1">
              <span className="text-slate-400 block mb-1">Reason:</span>
              <p className="text-slate-300 italic text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                {resource.protectionReason || 'No protection rule matched.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Labels & Tags */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
          <Tag className="w-4 h-4 text-slate-400" />
          <span>GCP Instance Labels</span>
        </div>
        {Object.keys(resource.labels).length === 0 ? (
          <p className="text-xs text-slate-500">No labels attached to this instance in GCP.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(resource.labels).map(([k, v]) => (
              <span
                key={k}
                className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 flex items-center space-x-1"
              >
                <span className="text-slate-500">{k}:</span>
                <span className="text-indigo-400 font-semibold">{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attached Schedules */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
            <CalendarClock className="w-4 h-4 text-indigo-400" />
            <span>Attached Optimization Schedules</span>
          </div>
          <span className="text-xs text-slate-500">
            {resource.schedules?.length || 0} schedule(s)
          </span>
        </div>

        {!resource.schedules || resource.schedules.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
            No active schedules targeting this VM. Configure a schedule matching its labels or instance ID.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resource.schedules.map((s) => (
              <div
                key={s.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{s.name}</span>
                  <span className="text-slate-400 text-[11px]">Action: {s.action}</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    s.isEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
