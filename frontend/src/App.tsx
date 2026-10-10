import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { Schedules } from './pages/Schedules';
import { Policies } from './pages/Policies';
import { HistoryPage } from './pages/History';
import { Savings } from './pages/Savings';
import { Settings } from './pages/Settings';
import {
  SystemStatus,
  DashboardStats,
  CloudResource,
  Schedule,
  ProtectionPolicy,
  ExecutionLog,
  api,
} from './api/client';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Core Data State
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [policies, setPolicies] = useState<ProtectionPolicy[]>([]);
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([]);

  // Loading States
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial and recurring load
  const loadAllData = async () => {
    try {
      const [
        statusRes,
        statsRes,
        resourcesRes,
        schedulesRes,
        policiesRes,
        executionsRes,
      ] = await Promise.all([
        api.getStatus(),
        api.getDashboardStats(),
        api.getResources(),
        api.getSchedules(),
        api.getPolicies(),
        api.getExecutions({ page: 1, limit: 10 }),
      ]);

      setStatus(statusRes.data);
      setStats(statsRes.data);
      setResources(resourcesRes.data);
      setSchedules(schedulesRes.data);
      setPolicies(policiesRes.data);
      setRecentLogs(executionsRes.logs);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Auto-refresh stats and executions every 30 seconds
    const interval = setInterval(() => {
      loadAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSyncFleet = async () => {
    setIsSyncing(true);
    try {
      await api.syncResources();
      await loadAllData();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectResource = (id: string) => {
    setSelectedResourceId(id);
  };

  const handleBackFromResource = () => {
    setSelectedResourceId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        status={status}
        isSyncing={isSyncing}
        onSync={handleSyncFleet}
      />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedResourceId(null);
            setCurrentTab(tab);
          }}
          resourceCount={resources.length}
          scheduleCount={schedules.length}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl overflow-y-auto">
          {initialLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-400">
                Initializing GCP Cost Optimizer...
              </p>
            </div>
          ) : selectedResourceId ? (
            <ResourceDetail
              resourceId={selectedResourceId}
              onBack={handleBackFromResource}
            />
          ) : currentTab === 'dashboard' ? (
            <Dashboard
              stats={stats}
              schedules={schedules}
              recentLogs={recentLogs}
              onNavigate={(tab) => setCurrentTab(tab)}
              onSync={handleSyncFleet}
            />
          ) : currentTab === 'resources' ? (
            <Resources
              resources={resources}
              isSyncing={isSyncing}
              onRefresh={loadAllData}
              onSelectResource={handleSelectResource}
            />
          ) : currentTab === 'schedules' ? (
            <Schedules
              schedules={schedules}
              resources={resources}
              onRefresh={loadAllData}
            />
          ) : currentTab === 'policies' ? (
            <Policies
              policies={policies}
              onRefresh={loadAllData}
            />
          ) : currentTab === 'history' ? (
            <HistoryPage />
          ) : currentTab === 'savings' ? (
            <Savings />
          ) : currentTab === 'settings' ? (
            <Settings
              status={status}
              onRefreshStatus={loadAllData}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
