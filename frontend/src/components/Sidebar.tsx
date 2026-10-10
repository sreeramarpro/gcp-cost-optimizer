import React from 'react';
import {
  LayoutDashboard,
  Server,
  CalendarClock,
  ShieldAlert,
  History,
  TrendingDown,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'resources'
  | 'schedules'
  | 'policies'
  | 'history'
  | 'savings'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  resourceCount?: number;
  scheduleCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  resourceCount = 0,
  scheduleCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'resources' as NavTab,
      label: 'VM Inventory',
      icon: Server,
      badge: resourceCount,
    },
    {
      id: 'schedules' as NavTab,
      label: 'Schedules',
      icon: CalendarClock,
      badge: scheduleCount,
    },
    {
      id: 'savings' as NavTab,
      label: 'Cost & Savings',
      icon: TrendingDown,
    },
    {
      id: 'policies' as NavTab,
      label: 'Safety Policies',
      icon: ShieldAlert,
    },
    {
      id: 'history' as NavTab,
      label: 'Execution History',
      icon: History,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & GCP',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3">
            Navigation
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between font-semibold text-slate-300">
          <span>Safety Engine</span>
          <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Guarded
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Production tags (<code className="text-indigo-300">env=prod</code>) and manual locks strictly prevent automated shutdown.
        </p>
      </div>
    </aside>
  );
};
