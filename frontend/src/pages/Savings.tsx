import React, { useEffect, useState } from 'react';
import {
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';

export const Savings: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavings = async () => {
    setLoading(true);
    try {
      const res = await api.getGranularSavings();
      setData(res.data);
    } catch (err: any) {
      console.error('Error fetching savings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavings();
  }, []);

  const totalBaseline = data.reduce((acc, curr) => acc + curr.baselineMonthlyCost, 0);
  const totalSavings = data.reduce((acc, curr) => acc + curr.projectedMonthlySavings, 0);
  const totalProjected = Math.max(0, totalBaseline - totalSavings);
  const overallPercent = totalBaseline > 0 ? Math.round((totalSavings / totalBaseline) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">FinOps Cost & Savings Analysis</h2>
          <p className="text-xs text-slate-400">
            Granular calculations based on Compute Engine machine types and operational hours
          </p>
        </div>

        <button
          onClick={loadSavings}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Top Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-500 uppercase font-semibold">Current Baseline (24/7)</span>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalBaseline.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal ml-1">/mo</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Full 730 on-demand hours</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5">
          <span className="text-xs text-emerald-400 uppercase font-semibold">Projected Savings</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${totalSavings.toFixed(2)}
            <span className="text-xs text-emerald-300 font-normal ml-1">/mo</span>
          </div>
          <span className="text-xs text-emerald-500 mt-1 block">From non-prod shutdowns</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-500 uppercase font-semibold">Optimized Spend</span>
          <div className="text-2xl font-bold text-white mt-1">
            ${totalProjected.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal ml-1">/mo</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Net compute cost</span>
        </div>

        <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-5">
          <span className="text-xs text-indigo-400 uppercase font-semibold">Overall Reduction</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {overallPercent}%
          </div>
          <span className="text-xs text-indigo-300 mt-1 block">Fleet-wide efficiency gain</span>
        </div>
      </div>

      {/* Granular Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Instance</th>
                <th className="py-3 px-4">Machine Type</th>
                <th className="py-3 px-4">Hourly Rate</th>
                <th className="py-3 px-4">Baseline (24/7)</th>
                <th className="py-3 px-4">Weekly Off-Hours</th>
                <th className="py-3 px-4">Monthly Hours Saved</th>
                <th className="py-3 px-4">Monthly Savings</th>
                <th className="py-3 px-4 text-right">Reduction %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Calculating cost optimization projections...</span>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.resourceId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-100 flex items-center space-x-2">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{item.name}</span>
                      {item.isProtected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          Protected
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {item.machineType}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${item.estimatedHourlyCost.toFixed(4)}/hr
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${item.baselineMonthlyCost.toFixed(2)}/mo
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {item.offHoursPerWeek > 0 ? (
                        <span className="text-emerald-400 font-medium">
                          {item.offHoursPerWeek} hrs / wk
                        </span>
                      ) : (
                        <span className="text-slate-600">0 hrs</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {item.monthlyHoursSaved > 0 ? (
                        <span>{item.monthlyHoursSaved} hrs / mo</span>
                      ) : (
                        <span className="text-slate-600">0 hrs</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      ${item.projectedMonthlySavings.toFixed(2)}/mo
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {item.savingsPercent > 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          -{item.savingsPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-600">0%</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
