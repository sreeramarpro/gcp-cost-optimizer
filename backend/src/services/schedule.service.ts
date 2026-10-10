import { Cron } from 'croner';
import { prisma } from '../database';

export interface CreateScheduleInput {
  name: string;
  description?: string;
  cronStart?: string;
  cronStop?: string;
  timezone?: string;
  action: 'START_AND_STOP' | 'STOP_ONLY' | 'START_ONLY';
  isEnabled?: boolean;
  isDryRun?: boolean;
  targetLabelKey?: string;
  targetLabelValue?: string;
  resourceIds?: string[];
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {}

export class ScheduleService {
  validateCron(expression?: string | null): boolean {
    if (!expression) return true;
    try {
      new Cron(expression);
      return true;
    } catch {
      return false;
    }
  }

  getNextRuns(
    cronStart?: string | null,
    cronStop?: string | null,
    timezone = 'UTC'
  ): { nextStart: Date | null; nextStop: Date | null } {
    let nextStart: Date | null = null;
    let nextStop: Date | null = null;

    if (cronStart) {
      try {
        const cron = new Cron(cronStart, { timezone });
        nextStart = cron.nextRun();
      } catch (err) {
        // ignore invalid cron
      }
    }

    if (cronStop) {
      try {
        const cron = new Cron(cronStop, { timezone });
        nextStop = cron.nextRun();
      } catch (err) {
        // ignore invalid cron
      }
    }

    return { nextStart, nextStop };
  }

  async listSchedules() {
    const schedules = await prisma.schedule.findMany({
      include: {
        targets: {
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                status: true,
                isProtected: true,
                estimatedHourlyCost: true,
              },
            },
          },
        },
        _count: {
          select: { executionLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also compute dynamic targets if targetLabelKey is configured
    const allResources = await prisma.cloudResource.findMany();

    return schedules.map((s) => {
      let dynamicResources: typeof allResources = [];
      if (s.targetLabelKey) {
        dynamicResources = allResources.filter((r) => {
          try {
            const labels = JSON.parse(r.labels);
            const val = labels[s.targetLabelKey!];
            if (s.targetLabelValue) {
              return val?.toLowerCase() === s.targetLabelValue.toLowerCase();
            }
            return val !== undefined;
          } catch {
            return false;
          }
        });
      }

      // Combine direct targets and dynamic label targets (deduplicated)
      const targetMap = new Map();
      s.targets.forEach((t) => targetMap.set(t.resource.id, t.resource));
      dynamicResources.forEach((r) =>
        targetMap.set(r.id, {
          id: r.id,
          name: r.name,
          status: r.status,
          isProtected: r.isProtected,
          estimatedHourlyCost: r.estimatedHourlyCost,
        })
      );

      const resolvedTargets = Array.from(targetMap.values());
      const { nextStart, nextStop } = this.getNextRuns(
        s.cronStart,
        s.cronStop,
        s.timezone
      );

      return {
        ...s,
        resolvedTargets,
        targetCount: resolvedTargets.length,
        nextStart,
        nextStop,
      };
    });
  }

  async getScheduleById(id: string) {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            resource: true,
          },
        },
        executionLogs: {
          take: 20,
          orderBy: { executedAt: 'desc' },
          include: {
            resource: {
              select: { id: true, name: true, isProtected: true },
            },
          },
        },
      },
    });

    if (!schedule) return null;

    const { nextStart, nextStop } = this.getNextRuns(
      schedule.cronStart,
      schedule.cronStop,
      schedule.timezone
    );

    return {
      ...schedule,
      nextStart,
      nextStop,
    };
  }

  async createSchedule(input: CreateScheduleInput) {
    if (input.cronStart && !this.validateCron(input.cronStart)) {
      throw new Error(`Invalid start cron expression: "${input.cronStart}"`);
    }
    if (input.cronStop && !this.validateCron(input.cronStop)) {
      throw new Error(`Invalid stop cron expression: "${input.cronStop}"`);
    }

    const schedule = await prisma.schedule.create({
      data: {
        name: input.name,
        description: input.description,
        cronStart: input.cronStart,
        cronStop: input.cronStop,
        timezone: input.timezone || 'UTC',
        action: input.action,
        isEnabled: input.isEnabled !== undefined ? input.isEnabled : true,
        isDryRun: input.isDryRun !== undefined ? input.isDryRun : false,
        targetLabelKey: input.targetLabelKey,
        targetLabelValue: input.targetLabelValue,
        targets: input.resourceIds?.length
          ? {
              create: input.resourceIds.map((resourceId) => ({
                resourceId,
              })),
            }
          : undefined,
      },
      include: {
        targets: true,
      },
    });

    return schedule;
  }

  async updateSchedule(id: string, input: UpdateScheduleInput) {
    if (input.cronStart && !this.validateCron(input.cronStart)) {
      throw new Error(`Invalid start cron expression: "${input.cronStart}"`);
    }
    if (input.cronStop && !this.validateCron(input.cronStop)) {
      throw new Error(`Invalid stop cron expression: "${input.cronStop}"`);
    }

    if (input.resourceIds) {
      // Replace existing targets
      await prisma.scheduleTarget.deleteMany({
        where: { scheduleId: id },
      });
    }

    return prisma.schedule.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        cronStart: input.cronStart,
        cronStop: input.cronStop,
        timezone: input.timezone,
        action: input.action,
        isEnabled: input.isEnabled,
        isDryRun: input.isDryRun,
        targetLabelKey: input.targetLabelKey,
        targetLabelValue: input.targetLabelValue,
        targets: input.resourceIds
          ? {
              create: input.resourceIds.map((resourceId) => ({
                resourceId,
              })),
            }
          : undefined,
      },
      include: {
        targets: true,
      },
    });
  }

  async toggleSchedule(id: string, isEnabled: boolean) {
    return prisma.schedule.update({
      where: { id },
      data: { isEnabled },
    });
  }

  async deleteSchedule(id: string) {
    return prisma.schedule.delete({
      where: { id },
    });
  }
}

export const scheduleService = new ScheduleService();
