import { prisma } from '../database';
import { adapterManager } from '../adapters/adapter.factory';
import { policyService } from './policy.service';

export interface ResourceFilterParams {
  search?: string;
  status?: string;
  zone?: string;
  isProtected?: boolean;
  scheduleId?: string;
}

export class ResourceService {
  async syncResources() {
    const adapter = adapterManager.getAdapter();
    const status = adapterManager.getStatus();
    const cloudResources = await adapter.listResources(status.projectId);

    const syncedAt = new Date();
    const results = [];

    for (const res of cloudResources) {
      // Evaluate protection status against active policies
      const protection = await policyService.evaluateResourceProtection(
        res.id,
        res.labels,
        undefined
      );

      // Check if existing record had a manual protection override
      const existing = await prisma.cloudResource.findUnique({
        where: { id: res.id },
      });

      const isProtected = existing?.isProtected ? true : protection.isProtected;
      const protectionReason = existing?.isProtected
        ? existing.protectionReason || 'Manually protected'
        : protection.reason;

      const record = await prisma.cloudResource.upsert({
        where: { id: res.id },
        update: {
          name: res.name,
          projectId: res.projectId,
          zoneOrRegion: res.zoneOrRegion,
          machineType: res.machineType,
          status: res.status,
          labels: JSON.stringify(res.labels),
          cpuCount: res.cpuCount,
          memoryMb: res.memoryMb,
          estimatedHourlyCost: res.estimatedHourlyCost,
          isProtected,
          protectionReason,
          lastSyncedAt: syncedAt,
        },
        create: {
          id: res.id,
          resourceType: res.resourceType,
          name: res.name,
          projectId: res.projectId,
          zoneOrRegion: res.zoneOrRegion,
          machineType: res.machineType,
          status: res.status,
          labels: JSON.stringify(res.labels),
          cpuCount: res.cpuCount,
          memoryMb: res.memoryMb,
          estimatedHourlyCost: res.estimatedHourlyCost,
          isProtected,
          protectionReason,
          lastSyncedAt: syncedAt,
        },
      });

      results.push(record);
    }

    return {
      syncedCount: results.length,
      syncedAt,
      mode: status.mode,
      resources: results,
    };
  }

  async listResources(filters: ResourceFilterParams = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { zoneOrRegion: { contains: filters.search } },
        { machineType: { contains: filters.search } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.zone) {
      where.zoneOrRegion = filters.zone;
    }

    if (filters.isProtected !== undefined) {
      where.isProtected = filters.isProtected;
    }

    if (filters.scheduleId) {
      where.scheduleTargets = {
        some: { scheduleId: filters.scheduleId },
      };
    }

    const items = await prisma.cloudResource.findMany({
      where,
      include: {
        scheduleTargets: {
          include: {
            schedule: {
              select: {
                id: true,
                name: true,
                action: true,
                isEnabled: true,
              },
            },
          },
        },
        _count: {
          select: { executionLogs: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return items.map((r) => ({
      ...r,
      labels: (() => {
        try {
          return JSON.parse(r.labels);
        } catch {
          return {};
        }
      })(),
      schedules: r.scheduleTargets.map((st) => st.schedule),
    }));
  }

  async getResourceById(id: string) {
    const resource = await prisma.cloudResource.findUnique({
      where: { id },
      include: {
        scheduleTargets: {
          include: {
            schedule: true,
          },
        },
        executionLogs: {
          take: 15,
          orderBy: { executedAt: 'desc' },
          include: {
            schedule: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!resource) return null;

    return {
      ...resource,
      labels: (() => {
        try {
          return JSON.parse(resource.labels);
        } catch {
          return {};
        }
      })(),
      schedules: resource.scheduleTargets.map((st) => st.schedule),
    };
  }

  async toggleProtection(id: string, isProtected: boolean, reason?: string) {
    return prisma.cloudResource.update({
      where: { id },
      data: {
        isProtected,
        protectionReason: isProtected
          ? reason || 'Manually locked by administrator'
          : null,
      },
    });
  }
}

export const resourceService = new ResourceService();
