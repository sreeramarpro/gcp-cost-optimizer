import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import { ProtectionPolicy, api } from '../api/client';

interface PoliciesProps {
  policies: ProtectionPolicy[];
  onRefresh: () => void;
}

export const Policies: React.FC<PoliciesProps> = ({ policies, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [policyType, setPolicyType] = useState('LABEL_MATCH');
  const [key, setKey] = useState('env');
  const [value, setValue] = useState('prod');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.createPolicy({
        policyType,
        key: policyType === 'LABEL_MATCH' ? key : undefined,
        value,
        description:
          description ||
          (policyType === 'LABEL_MATCH'
            ? `Protect resources with label ${key}=${value}`
            : `Protect resources with name starting with ${value}`),
      });

      setModalOpen(false);
      setKey('env');
      setValue('prod');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (policy: ProtectionPolicy) => {
    try {
      await api.togglePolicy(policy.id, !policy.isActive);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to toggle policy: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this protection rule?')) return;
    try {
      await api.deletePolicy(id);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete policy: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Safety Policies & Guardrails</h2>
          <p className="text-xs text-slate-400">
            Rules preventing accidental shutdown of critical environments
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exclusion Rule</span>
        </button>
      </div>

      {/* Explainer Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>1. Policy Label Rules</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            Global patterns (like <code className="text-indigo-300">env=prod</code>) that automatically exclude any matching VM from stop actions.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>2. Explicit Resource Lock</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            Per-instance manual locks set on individual VMs in the inventory that override any schedule.
          </p>
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-sky-400" />
            <span>3. Audit & Skip Action</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            If a stop schedule targets a protected VM, the engine skips the shutdown and logs <code className="text-amber-300">SKIPPED_PROTECTED</code> in the audit stream.
          </p>
        </div>
      </div>

      {/* Policies List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Rule Description</th>
                <th className="py-3 px-4">Matching Criteria</th>
                <th className="py-3 px-4">Rule Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-100">
                    {p.description}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {p.policyType === 'LABEL_MATCH' ? (
                      <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-indigo-300">
                        {p.key}={p.value || '*'}
                      </span>
                    ) : (
                      <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-sky-300">
                        name starts with "{p.value}"
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{p.policyType}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition ${
                        p.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {p.isActive ? 'Active & Enforced' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Policy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">Add Safety Rule</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Rule Type</label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="LABEL_MATCH">Match by GCP Label (key=value)</option>
                  <option value="NAME_PREFIX">Match by Instance Name Prefix</option>
                </select>
              </div>

              {policyType === 'LABEL_MATCH' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Label Key</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. env"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Label Value</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. prod"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Name Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. prod-"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Rule Description</label>
                <input
                  type="text"
                  placeholder="e.g. Protect production databases and API gateways"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
