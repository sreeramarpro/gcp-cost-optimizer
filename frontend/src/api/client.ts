export interface CloudResource {
  id: string;
  resourceType: string;
  name: string;
  projectId: string;
  zoneOrRegion: string;
  machineType: string;
  status: 'RUNNING' | 'TERMINATED' | 'STOPPED' | 'SUSPENDED' | 'PROVISIONING' | 'UNKNOWN';
  labels: Record<string, string>;
  cpuCount: number;
  memoryMb: number;
  isProtected: boolean;
  protectionReason?: string | null;
  estimatedHourlyCost: number;
  lastSyncedAt: string;
  schedules?: Array<{
    id: string;
    name: string;
    action: string;
    isEnabled: boolean;
  }>;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string | null;
  cronStart?: string | null;
  cronStop?: string | null;
  timezone: string;
  action: 'START_AND_STOP' | 'STOP_ONLY' | 'START_ONLY';
  isEnabled: boolean;
  isDryRun: boolean;
  targetLabelKey?: string | null;
  targetLabelValue?: string | null;
  targetCount?: number;
  resolvedTargets?: Array<{
    id: string;
    name: string;
    status: string;
    isProtected: boolean;
    estimatedHourlyCost: number;
  }>;
  nextStart?: string | null;
  nextStop?: string | null;
  createdAt: string;
}

export interface ProtectionPolicy {
  id: string;
  policyType: string;
  key?: string | null;
  value?: string | null;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  scheduleId?: string | null;
  resourceId: string;
  action: 'START' | 'STOP';
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_PROTECTED' | 'DRY_RUN';
  message: string;
  errorDetail?: string | null;
  triggeredBy: 'AUTOMATED_SCHEDULE' | 'MANUAL_USER';
  durationMs?: number | null;
  executedAt: string;
  resource?: {
    id: string;
    name: string;
    machineType: string;
    zoneOrRegion: string;
  };
  schedule?: {
    id: string;
    name: string;
  } | null;
}

export interface SystemStatus {
  mode: 'LIVE_GCP' | 'SANDBOX_DEMO';
  resourceType: string;
  projectId: string;
  credentialsConfigured: boolean;
  statusMessage: string;
  globalDryRun: boolean;
  schedulerEnabled: boolean;
}

export interface DashboardStats {
  fleet: {
    totalResources: number;
    runningCount: number;
    stoppedCount: number;
    otherCount: number;
    protectedCount: number;
    activePoliciesCount: number;
  };
  schedules: {
    totalSchedules: number;
  };
  financials: {
    baselineMonthlyCost: number;
    projectedMonthlySavings: number;
    projectedMonthlyCost: number;
    savingsPercentage: number;
  };
  operations: {
    recentExecutionsCount: number;
    successRate: number;
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `API error: ${res.statusText}`);
  }
  return data;
}

export const api = {
  getStatus: () => request<{ success: boolean; data: SystemStatus }>('/settings/status'),

  getDashboardStats: () =>
    request<{ success: boolean; data: DashboardStats }>('/stats/dashboard'),

  getGranularSavings: () =>
    request<{ success: boolean; data: any[] }>('/stats/savings'),

  getResources: (params?: {
    search?: string;
    status?: string;
    zone?: string;
    isProtected?: boolean;
    scheduleId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.zone) query.set('zone', params.zone);
    if (params?.isProtected !== undefined)
      query.set('isProtected', String(params.isProtected));
    if (params?.scheduleId) query.set('scheduleId', params.scheduleId);
    return request<{ success: boolean; count: number; data: CloudResource[] }>(
      `/resources?${query.toString()}`
    );
  },

  getResource: (id: string) =>
    request<{ success: boolean; data: CloudResource }>(`/resources/${encodeURIComponent(id)}`),

  syncResources: () =>
    request<{ success: boolean; syncedCount: number; syncedAt: string; mode: string }>(
      '/resources/sync',
      { method: 'POST' }
    ),

  toggleProtection: (id: string, isProtected: boolean, reason?: string) =>
    request<{ success: boolean; data: CloudResource }>(
      `/resources/${encodeURIComponent(id)}/protection`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isProtected, reason }),
      }
    ),

  triggerAction: (id: string, action: 'START' | 'STOP', dryRun?: boolean) =>
    request<{ success: boolean; data: any }>(
      `/resources/${encodeURIComponent(id)}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action, dryRun }),
      }
    ),

  getSchedules: () =>
    request<{ success: boolean; count: number; data: Schedule[] }>('/schedules'),

  getSchedule: (id: string) =>
    request<{ success: boolean; data: Schedule }>(`/schedules/${id}`),

  createSchedule: (scheduleData: any) =>
    request<{ success: boolean; data: Schedule }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    }),

  updateSchedule: (id: string, scheduleData: any) =>
    request<{ success: boolean; data: Schedule }>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData),
    }),

  toggleSchedule: (id: string, isEnabled: boolean) =>
    request<{ success: boolean; data: Schedule }>(`/schedules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled }),
    }),

  testRunSchedule: (id: string, dryRun = true) =>
    request<{ success: boolean; data: any }>(`/schedules/${id}/test-run`, {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    }),

  deleteSchedule: (id: string) =>
    request<{ success: boolean; message: string }>(`/schedules/${id}`, {
      method: 'DELETE',
    }),

  getPolicies: () =>
    request<{ success: boolean; count: number; data: ProtectionPolicy[] }>('/policies'),

  createPolicy: (policyData: any) =>
    request<{ success: boolean; data: ProtectionPolicy }>('/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    }),

  togglePolicy: (id: string, isActive: boolean) =>
    request<{ success: boolean; data: ProtectionPolicy }>(`/policies/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  deletePolicy: (id: string) =>
    request<{ success: boolean; message: string }>(`/policies/${id}`, {
      method: 'DELETE',
    }),

  getExecutions: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    return request<{
      success: boolean;
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      logs: ExecutionLog[];
    }>(`/executions?${query.toString()}`);
  },

  testConnection: (projectId: string, credentialsPath?: string) =>
    request<{ success: boolean; message: string; count?: number }>(
      '/settings/test-connection',
      {
        method: 'POST',
        body: JSON.stringify({ projectId, credentialsPath }),
      }
    ),

  switchMode: (mode: 'LIVE_GCP' | 'SANDBOX_DEMO', projectId?: string, credentialsPath?: string) =>
    request<{ success: boolean; message: string; data: SystemStatus }>(
      '/settings/switch-mode',
      {
        method: 'POST',
        body: JSON.stringify({ mode, projectId, credentialsPath }),
      }
    ),

  updateConfig: (data: { globalDryRun?: boolean; schedulerEnabled?: boolean }) =>
    request<{ success: boolean; message: string }>('/settings/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
