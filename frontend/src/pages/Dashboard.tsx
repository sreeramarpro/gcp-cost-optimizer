import React from 'react';
import {
  TrendingDown,
  DollarSign,
  Server,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Clock,
  PlayCircle,
  StopCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DashboardStats, Schedule, ExecutionLog } from '../api/client';
import { NavTab } from '../components/Sidebar';

interface DashboardProps {
  stats: DashboardStats | null;
  schedules: Schedule[];
  recentLogs: ExecutionLog[];
  onNavigate: (tab: NavTab) => void;
  onSync: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  schedules,
  recentLogs,
  onNavigate,
  onSync,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Autonomous FinOps Automation</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Stop Paying for Idle Non-Production Compute
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Automatically shut down development, staging, and QA instances during nights and weekends.
            Protect critical production resources with multi-layered safety guardrails and audit every action.
          </p>
          <div className="mt-5 flex items-center space-x-3">
            <button
              onClick={() => onNavigate('schedules')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
            >
              <span>Manage Schedules</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('resources')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              View VM Fleet
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Baseline Spend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Baseline 24/7 Spend</span>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            ${stats?.financials.baselineMonthlyCost.toFixed(2) || '0.00'}
            <span className="text-xs text-slate-400 font-normal ml-1">/mo</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Full 730 on-demand run hours</p>
        </div>

        {/* Projected Savings */}
        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Projected Savings</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            ${stats?.financials.projectedMonthlySavings.toFixed(2) || '0.00'}
            <span className="text-xs text-emerald-300 font-normal ml-1">/mo</span>
          </div>
          <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-500 font-medium">
            <span>{stats?.financials.savingsPercentage || 0}% cost reduction</span>
          </div>
        </div>

        {/* Managed Fleet Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">VM Fleet Status</span>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats?.fleet.totalResources || 0}
            <span className="text-xs text-slate-400 font-normal ml-1">instances</span>
          </div>
          <div className="mt-2 flex items-center space-x-3 text-xs">
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>{stats?.fleet.runningCount || 0} Running</span>
            </span>
            <span className="text-slate-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
              <span>{stats?.fleet.stoppedCount || 0} Stopped</span>
            </span>
          </div>
        </div>

        {/* Protection & Guardrails */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Safety Status</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats?.fleet.protectedCount || 0}
            <span className="text-xs text-slate-400 font-normal ml-1">protected</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {stats?.fleet.activePoliciesCount || 0} global exclusion rules active
          </p>
        </div>
      </div>

      {/* Main Grid: Active Schedules & Recent Execution Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Schedules */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Active Schedules</h3>
              <p className="text-xs text-slate-400">Automated recurring start/stop routines</p>
            </div>
            <button
              onClick={() => onNavigate('schedules')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>View all ({schedules.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No schedules configured yet</p>
              <p className="text-xs text-slate-500 mt-1">Create your first start/stop routine to start saving</p>
              <button
                onClick={() => onNavigate('schedules')}
                className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg"
              >
                Create Schedule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-slate-200">{s.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          s.isEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                      {s.isDryRun && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                          Dry-Run
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      {s.cronStart && (
                        <span className="flex items-center space-x-1">
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Start: {s.cronStart}</span>
                        </span>
                      )}
                      {s.cronStop && (
                        <span className="flex items-center space-x-1">
                          <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Stop: {s.cronStop}</span>
                        </span>
                      )}
                      <span className="text-slate-500">TZ: {s.timezone}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      {s.targetCount || 0} targets
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Execution Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Audit Stream</h3>
              <p className="text-xs text-slate-400">Recent automated & manual triggers</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <Activity className="w-7 h-7 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No executions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 5).map((log) => {
                const isSuccess = log.status === 'SUCCESS' || log.status === 'DRY_RUN';
                const isProtected = log.status === 'SKIPPED_PROTECTED';

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-200">
                        {log.action === 'START' ? (
                          <span className="text-emerald-400">START</span>
                        ) : (
                          <span className="text-rose-400">STOP</span>
                        )}
                        <span className="text-slate-400">→</span>
                        <span className="truncate max-w-[120px]" title={log.resource?.name || log.resourceId}>
                          {log.resource?.name || 'Resource'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : log.status === 'DRY_RUN'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : isProtected
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate" title={log.message}>
                      {log.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>{new Date(log.executedAt).toLocaleTimeString()}</span>
                      <span>{log.durationMs ? `${log.durationMs}ms` : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
