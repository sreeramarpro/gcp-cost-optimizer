import React, { useEffect, useState } from 'react';
import {
  History,
  Filter,
  RefreshCw,
  PlayCircle,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { ExecutionLog, api } from '../api/client';

export const HistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getExecutions({
        page,
        limit: 15,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setLogs(res.logs);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Execution Audit Trail</h2>
          <p className="text-xs text-slate-400">
            Immutable log of all automated schedule triggers and manual user actions
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-medium focus:outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DRY_RUN">Dry-Run Simulations</option>
            <option value="SKIPPED_PROTECTED">Skipped (Protected)</option>
            <option value="FAILED">Failures</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">{total} total logged events</span>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Trigger Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Outcome Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No execution records found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isDryRun = log.status === 'DRY_RUN';
                  const isSkipped = log.status === 'SKIPPED_PROTECTED';
                  const isFailed = log.status === 'FAILED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.executedAt).toLocaleString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 font-semibold ${
                            log.action === 'START' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.action === 'START' ? (
                            <PlayCircle className="w-3.5 h-3.5" />
                          ) : (
                            <StopCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        {log.resource?.name || log.resourceId}
                      </td>

                      {/* Trigger Source */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {log.triggeredBy === 'AUTOMATED_SCHEDULE' ? (
                          <span className="text-indigo-400 font-medium">
                            Schedule: {log.schedule?.name || 'Automated'}
                          </span>
                        ) : (
                          <span className="text-slate-300">Manual User Action</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isDryRun
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : isSkipped
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {isDryRun && <ShieldCheck className="w-3 h-3" />}
                          {isSkipped && <AlertTriangle className="w-3 h-3" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </td>

                      {/* Outcome Message */}
                      <td className="py-3.5 px-4 text-slate-300 max-w-md truncate" title={log.message}>
                        {log.message}
                        {log.errorDetail && (
                          <span className="block text-[10px] text-rose-400 font-mono mt-0.5">
                            {log.errorDetail}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
