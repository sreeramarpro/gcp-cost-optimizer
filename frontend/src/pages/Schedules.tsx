import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Square,
  Clock,
  Tag,
  CheckCircle2,
  AlertCircle,
  Trash2,
  PlayCircle,
  StopCircle,
  X,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Schedule, CloudResource, api } from '../api/client';

interface SchedulesProps {
  schedules: Schedule[];
  resources: CloudResource[];
  onRefresh: () => void;
}

export const Schedules: React.FC<SchedulesProps> = ({
  schedules,
  resources,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [testRunModal, setTestRunModal] = useState<{
    isOpen: boolean;
    schedule: Schedule | null;
    loading: boolean;
    result: any | null;
  }>({
    isOpen: false,
    schedule: null,
    loading: false,
    result: null,
  });

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [action, setAction] = useState<'START_AND_STOP' | 'STOP_ONLY' | 'START_ONLY'>('START_AND_STOP');
  const [cronStart, setCronStart] = useState('0 8 * * 1-5');
  const [cronStop, setCronStop] = useState('0 19 * * 1-5');
  const [timezone, setTimezone] = useState('UTC');
  const [isDryRun, setIsDryRun] = useState(false);
  const [targetType, setTargetType] = useState<'LABEL' | 'EXPLICIT'>('LABEL');
  const [targetLabelKey, setTargetLabelKey] = useState('env');
  const [targetLabelValue, setTargetLabelValue] = useState('dev');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applyPreset = (preset: 'STANDARD_WORKDAY' | 'AGGRESSIVE_DEV' | 'WEEKEND_OFF') => {
    if (preset === 'STANDARD_WORKDAY') {
      setAction('START_AND_STOP');
      setCronStart('0 8 * * 1-5');
      setCronStop('0 19 * * 1-5');
    } else if (preset === 'AGGRESSIVE_DEV') {
      setAction('START_AND_STOP');
      setCronStart('0 9 * * 1-5');
      setCronStop('0 18 * * 1-5');
    } else if (preset === 'WEEKEND_OFF') {
      setAction('START_AND_STOP');
      setCronStart('0 6 * * 1'); // Monday 6am start
      setCronStop('0 20 * * 5'); // Friday 8pm stop
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.createSchedule({
        name,
        description,
        action,
        cronStart: action !== 'STOP_ONLY' ? cronStart : undefined,
        cronStop: action !== 'START_ONLY' ? cronStop : undefined,
        timezone,
        isDryRun,
        targetLabelKey: targetType === 'LABEL' ? targetLabelKey : undefined,
        targetLabelValue: targetType === 'LABEL' ? targetLabelValue : undefined,
        resourceIds: targetType === 'EXPLICIT' ? selectedResourceIds : undefined,
      });

      setModalOpen(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setAction('START_AND_STOP');
    setCronStart('0 8 * * 1-5');
    setCronStop('0 19 * * 1-5');
    setTimezone('UTC');
    setIsDryRun(false);
    setTargetType('LABEL');
    setTargetLabelKey('env');
    setTargetLabelValue('dev');
    setSelectedResourceIds([]);
    setFormError(null);
  };

  const handleToggle = async (schedule: Schedule) => {
    try {
      await api.toggleSchedule(schedule.id, !schedule.isEnabled);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update schedule: ${err.message}`);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.deleteSchedule(scheduleId);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete schedule: ${err.message}`);
    }
  };

  const handleTestRun = async (schedule: Schedule, dryRun = true) => {
    setTestRunModal({
      isOpen: true,
      schedule,
      loading: true,
      result: null,
    });

    try {
      const res = await api.testRunSchedule(schedule.id, dryRun);
      setTestRunModal((prev) => ({
        ...prev,
        loading: false,
        result: res.data,
      }));
      onRefresh();
    } catch (err: any) {
      setTestRunModal((prev) => ({
        ...prev,
        loading: false,
        result: { error: err.message },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Recurring Schedules</h2>
          <p className="text-xs text-slate-400">
            Define automated start and stop windows for non-production environments
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.length === 0 ? (
          <div className="md:col-span-2 text-center py-16 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
            <CalendarClock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No schedules configured</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create an automated routine to stop your dev and staging instances outside business hours.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg"
            >
              Create Schedule Now
            </button>
          </div>
        ) : (
          schedules.map((s) => (
            <div
              key={s.id}
              className={`bg-slate-900 border ${
                s.isEnabled ? 'border-slate-800' : 'border-slate-800/50 opacity-75'
              } rounded-2xl p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-100">{s.name}</h3>
                      {s.isDryRun && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                          Dry-Run
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                    )}
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.isEnabled}
                      onChange={() => handleToggle(s)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Timing Pills */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  {s.cronStart && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Start Window:</span>
                      </span>
                      <span className="font-mono text-slate-200 font-semibold">{s.cronStart}</span>
                    </div>
                  )}

                  {s.cronStop && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center space-x-1.5">
                        <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Stop Window:</span>
                      </span>
                      <span className="font-mono text-slate-200 font-semibold">{s.cronStop}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <span>Timezone: {s.timezone}</span>
                    {s.nextStop && (
                      <span>Next Stop: {new Date(s.nextStop).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                </div>

                {/* Target Information */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Targeting:</span>
                    {s.targetLabelKey ? (
                      <span className="font-mono text-indigo-300 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {s.targetLabelKey}={s.targetLabelValue || '*'}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-medium">Specific Instances</span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-300">{s.targetCount || 0} VM(s)</span>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleTestRun(s, true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Test Run (Dry-Run)</span>
                </button>

                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CalendarClock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-slate-100">Create Start/Stop Schedule</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              {/* Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Schedule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Non-Prod Weekday Shutdown"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Stops dev instances overnight to save ~65% on compute"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Schedule Action *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'START_AND_STOP', label: 'Start & Stop' },
                    { id: 'STOP_ONLY', label: 'Stop Only' },
                    { id: 'START_ONLY', label: 'Start Only' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setAction(act.id as any)}
                      className={`py-2 px-3 rounded-xl font-medium border text-center transition ${
                        action === act.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-slate-400 font-medium mb-1.5">Quick Timing Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('STANDARD_WORKDAY')}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px]"
                  >
                    Mon-Fri 08:00 - 19:00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('AGGRESSIVE_DEV')}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px]"
                  >
                    Mon-Fri 09:00 - 18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('WEEKEND_OFF')}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[11px]"
                  >
                    Weekend Off (Fri night - Mon morning)
                  </button>
                </div>
              </div>

              {/* Cron Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {action !== 'STOP_ONLY' && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Start Cron Expression (UTC/TZ)
                    </label>
                    <input
                      type="text"
                      placeholder="0 8 * * 1-5"
                      value={cronStart}
                      onChange={(e) => setCronStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
                {action !== 'START_ONLY' && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      Stop Cron Expression (UTC/TZ)
                    </label>
                    <input
                      type="text"
                      placeholder="0 19 * * 1-5"
                      value={cronStop}
                      onChange={(e) => setCronStop(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (Eastern)</option>
                  <option value="America/Chicago">America/Chicago (Central)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>

              {/* Target Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-slate-400 font-medium">Target Resource Selection</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'LABEL'}
                      onChange={() => setTargetType('LABEL')}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>Match by GCP Label</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'EXPLICIT'}
                      onChange={() => setTargetType('EXPLICIT')}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>Select Specific Instances</span>
                  </label>
                </div>

                {targetType === 'LABEL' ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-slate-500 block mb-1">Label Key</span>
                      <input
                        type="text"
                        placeholder="e.g. env"
                        value={targetLabelKey}
                        onChange={(e) => setTargetLabelKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Label Value</span>
                      <input
                        type="text"
                        placeholder="e.g. dev"
                        value={targetLabelValue}
                        onChange={(e) => setTargetLabelValue(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    {resources.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center space-x-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResourceIds.includes(r.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedResourceIds([...selectedResourceIds, r.id]);
                            } else {
                              setSelectedResourceIds(
                                selectedResourceIds.filter((id) => id !== r.id)
                              );
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <span className="text-slate-200 font-mono">{r.name}</span>
                        <span className="text-slate-500 text-[10px]">({r.zoneOrRegion})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Dry Run Toggle */}
              <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-200 block">Dry-Run Only</span>
                  <span className="text-slate-500 text-[11px]">
                    Simulate and record logs without issuing real API mutations
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
              </label>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
                  {formError}
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
                  {submitting ? 'Creating...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Run Results Modal */}
      {testRunModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Test Run Results: {testRunModal.schedule?.name}
                </h3>
              </div>
              <button
                onClick={() => setTestRunModal({ ...testRunModal, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {testRunModal.loading ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Evaluating schedule targets and policy guardrails...</p>
              </div>
            ) : testRunModal.result?.error ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
                {testRunModal.result.error}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Trigger Action:</span>
                  <span className="font-bold text-slate-200">{testRunModal.result?.action}</span>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-slate-300 block">
                    Target Execution Logs ({testRunModal.result?.executedCount || 0} evaluated):
                  </span>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {testRunModal.result?.results?.map((res: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-slate-200">
                            {res.resourceName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              res.status === 'SKIPPED_PROTECTED'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{res.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setTestRunModal({ ...testRunModal, isOpen: false })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
