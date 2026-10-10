import React, { useState } from 'react';
import {
  Server,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Tag,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import { CloudResource, api } from '../api/client';

interface ResourcesProps {
  resources: CloudResource[];
  isSyncing: boolean;
  onRefresh: () => void;
  onSelectResource: (id: string) => void;
}

export const Resources: React.FC<ResourcesProps> = ({
  resources,
  isSyncing,
  onRefresh,
  onSelectResource,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [protectionFilter, setProtectionFilter] = useState<string>('ALL');

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    resource: CloudResource | null;
    action: 'START' | 'STOP';
    dryRun: boolean;
  }>({
    isOpen: false,
    resource: null,
    action: 'START',
    dryRun: true,
  });

  // Protection Modal State
  const [protectModal, setProtectModal] = useState<{
    isOpen: boolean;
    resource: CloudResource | null;
    reason: string;
  }>({
    isOpen: false,
    resource: null,
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filtered resources
  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.zoneOrRegion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.machineType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter;

    const matchesProtection =
      protectionFilter === 'ALL' ||
      (protectionFilter === 'PROTECTED' && r.isProtected) ||
      (protectionFilter === 'UNPROTECTED' && !r.isProtected);

    return matchesSearch && matchesStatus && matchesProtection;
  });

  const handleOpenAction = (resource: CloudResource, action: 'START' | 'STOP') => {
    setActionMessage(null);
    setActionModal({
      isOpen: true,
      resource,
      action,
      dryRun: true, // Default to safe dry-run simulation
    });
  };

  const handleExecuteAction = async () => {
    if (!actionModal.resource) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await api.triggerAction(
        actionModal.resource.id,
        actionModal.action,
        actionModal.dryRun
      );

      setActionMessage({
        type: res.success ? 'success' : 'error',
        text: res.data?.message || 'Action executed successfully.',
      });

      onRefresh();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to execute action.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProtectModal = (resource: CloudResource) => {
    setProtectModal({
      isOpen: true,
      resource,
      reason: resource.protectionReason || '',
    });
  };

  const handleSaveProtection = async (enable: boolean) => {
    if (!protectModal.resource) return;
    try {
      await api.toggleProtection(
        protectModal.resource.id,
        enable,
        enable ? protectModal.reason || 'Manually protected' : undefined
      );
      setProtectModal({ isOpen: false, resource: null, reason: '' });
      onRefresh();
    } catch (err: any) {
      alert(`Error updating protection: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Compute Engine Fleet</h2>
          <p className="text-xs text-slate-400">
            Discovered instances, schedule assignments, and safety status
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="flex items-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing Fleet...' : 'Sync Inventory'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by instance, zone, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="RUNNING" className="bg-slate-900">Running</option>
              <option value="TERMINATED" className="bg-slate-900">Terminated</option>
            </select>
          </div>

          {/* Protection Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Safety:</span>
            <select
              value={protectionFilter}
              onChange={(e) => setProtectionFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All</option>
              <option value="PROTECTED" className="bg-slate-900">Protected</option>
              <option value="UNPROTECTED" className="bg-slate-900">Unprotected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Instance Name</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Machine Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Protection</th>
                <th className="py-3 px-4">Schedules</th>
                <th className="py-3 px-4">Est. Hourly</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No compute resources found</p>
                    <p className="text-xs text-slate-600 mt-1">Try adjusting filters or click "Sync Fleet"</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isRunning = r.status === 'RUNNING';
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => onSelectResource(r.id)}
                    >
                      {/* Name & Type */}
                      <td className="py-3.5 px-4 font-medium text-slate-100">
                        <div className="flex items-center space-x-2">
                          <Server className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="font-semibold">{r.name}</span>
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {r.zoneOrRegion}
                      </td>

                      {/* Machine Type */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-300 border border-slate-700">
                          {r.machineType}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                          <span>{r.status}</span>
                        </span>
                      </td>

                      {/* Protection */}
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProtectModal(r);
                        }}
                      >
                        {r.isProtected ? (
                          <div
                            title={r.protectionReason || 'Protected'}
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold cursor-pointer hover:bg-rose-500/20 transition"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Protected</span>
                          </div>
                        ) : (
                          <div
                            title="Click to protect"
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-[11px] font-medium cursor-pointer hover:text-slate-300 transition"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Unprotected</span>
                          </div>
                        )}
                      </td>

                      {/* Schedules */}
                      <td className="py-3.5 px-4">
                        {r.schedules && r.schedules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.schedules.map((s) => (
                              <span
                                key={s.id}
                                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2 py-0.5 rounded-md font-medium"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                        ${r.estimatedHourlyCost.toFixed(4)}/hr
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isRunning ? (
                          <button
                            onClick={() => handleOpenAction(r, 'STOP')}
                            className="px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition inline-flex items-center space-x-1"
                          >
                            <Square className="w-3 h-3 fill-rose-400" />
                            <span>Stop</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAction(r, 'START')}
                            className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition inline-flex items-center space-x-1"
                          >
                            <Play className="w-3 h-3 fill-emerald-400" />
                            <span>Start</span>
                          </button>
                        )}
                        <button
                          onClick={() => onSelectResource(r.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Action Modal */}
      {actionModal.isOpen && actionModal.resource && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {actionModal.action === 'START' ? (
                  <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                ) : (
                  <Square className="w-5 h-5 text-rose-400 fill-rose-400" />
                )}
                <h3 className="font-bold text-base text-slate-100">
                  Confirm {actionModal.action} Action
                </h3>
              </div>
              <button
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                <div><span className="text-slate-500">Instance:</span> {actionModal.resource.name}</div>
                <div><span className="text-slate-500">Zone:</span> {actionModal.resource.zoneOrRegion}</div>
                <div><span className="text-slate-500">Type:</span> {actionModal.resource.machineType}</div>
                <div><span className="text-slate-500">Current Status:</span> {actionModal.resource.status}</div>
              </div>

              {actionModal.action === 'STOP' && actionModal.resource.isProtected && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-semibold block">Safety Guardrail Warning:</span>
                    This resource is marked as protected ({actionModal.resource.protectionReason || 'Protected'}). Stop action will be skipped by policy engine unless protection is removed.
                  </div>
                </div>
              )}

              {/* Dry Run Toggle */}
              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200 block">Simulate with Dry-Run</span>
                  <span className="text-slate-500 text-[11px]">
                    Verify policy evaluation and log audit trail without mutating cloud VM.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={actionModal.dryRun}
                  onChange={(e) =>
                    setActionModal({ ...actionModal, dryRun: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
              </label>

              {actionMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    actionMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {actionMessage.text}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-lg transition ${
                  actionModal.action === 'START'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                } disabled:opacity-50`}
              >
                {actionLoading
                  ? 'Executing...'
                  : `${actionModal.dryRun ? 'Simulate' : 'Execute'} ${actionModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protection Toggle Modal */}
      {protectModal.isOpen && protectModal.resource && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Resource Protection Lock
                </h3>
              </div>
              <button
                onClick={() => setProtectModal({ isOpen: false, resource: null, reason: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Manage exclusion lock for <strong>{protectModal.resource.name}</strong>. Protected resources can never be stopped by automated schedules.
              </p>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Protection Rationale / Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Critical persistent worker or demo instance"
                  value={protectModal.reason}
                  onChange={(e) =>
                    setProtectModal({ ...protectModal, reason: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {protectModal.resource.isProtected ? (
                <button
                  onClick={() => handleSaveProtection(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Remove Protection Lock
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setProtectModal({ isOpen: false, resource: null, reason: '' })}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveProtection(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Enable Protection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
