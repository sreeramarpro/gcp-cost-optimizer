import { prisma } from '../database';
import { adapterManager } from '../adapters/adapter.factory';
import { policyService } from './policy.service';
import { config } from '../config';

export interface ExecuteActionOptions {
  resourceId: string;
  action: 'START' | 'STOP';
  triggeredBy: 'AUTOMATED_SCHEDULE' | 'MANUAL_USER';
  scheduleId?: string;
  forceDryRun?: boolean;
}

export class ExecutionService {
  async executeAction(options: ExecuteActionOptions) {
    const { resourceId, action, triggeredBy, scheduleId, forceDryRun } = options;
    const startTime = Date.now();

    // 1. Fetch resource from database
    const resource = await prisma.cloudResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`Resource "${resourceId}" not found in database.`);
    }

    // 2. Load system configurations
    const globalDryRunConfig = await prisma.systemConfig.findUnique({
      where: { key: 'global_dry_run' },
    });
    const isGlobalDryRun = globalDryRunConfig ? globalDryRunConfig.value === 'true' : config.dryRunDefault;

    // Check schedule-level dry-run if applicable
    let isScheduleDryRun = false;
    if (scheduleId) {
      const sched = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (sched?.isDryRun) isScheduleDryRun = true;
    }

    const effectiveDryRun = forceDryRun || isGlobalDryRun || isScheduleDryRun;

    // 3. Safety Check: If stopping, check protection rules
    if (action === 'STOP') {
      let labels: Record<string, string> = {};
      try {
        labels = JSON.parse(resource.labels);
      } catch {
        labels = {};
      }

      const protection = await policyService.evaluateResourceProtection(
        resource.id,
        labels,
        resource.isProtected,
        resource.protectionReason
      );

      if (protection.isProtected) {
        // Prevent shutdown of protected resource!
        const durationMs = Date.now() - startTime;
        const skipMessage = `Action skipped: Resource "${resource.name}" is protected. ${protection.reason}`;

        const log = await prisma.executionLog.create({
          data: {
            resourceId,
            scheduleId,
            action: 'STOP',
            status: 'SKIPPED_PROTECTED',
            message: skipMessage,
            triggeredBy,
            durationMs,
          },
        });

        return {
          success: false,
          skipped: true,
          status: 'SKIPPED_PROTECTED',
          message: skipMessage,
          logId: log.id,
        };
      }
    }

    // 4. Execute action via active Resource Adapter
    const adapter = adapterManager.getAdapter();
    let actionResult;

    if (action === 'START') {
      actionResult = await adapter.startResource(resourceId, effectiveDryRun);
    } else {
      actionResult = await adapter.stopResource(resourceId, effectiveDryRun);
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = !actionResult.success
      ? 'FAILED'
      : effectiveDryRun
      ? 'DRY_RUN'
      : 'SUCCESS';

    // 5. Update local resource state in DB if successful and not dry-run
    if (actionResult.success && !effectiveDryRun) {
      await prisma.cloudResource.update({
        where: { id: resourceId },
        data: {
          status: actionResult.newStatus,
          lastSyncedAt: new Date(),
        },
      });
    }

    // 6. Record Execution Audit Log
    const log = await prisma.executionLog.create({
      data: {
        resourceId,
        scheduleId,
        action,
        status: finalStatus,
        message: actionResult.message,
        errorDetail: actionResult.error,
        triggeredBy,
        durationMs,
      },
    });

    return {
      success: actionResult.success,
      dryRun: effectiveDryRun,
      status: finalStatus,
      message: actionResult.message,
      previousStatus: actionResult.previousStatus,
      newStatus: actionResult.newStatus,
      logId: log.id,
      durationMs,
    };
  }

  async runScheduleNow(scheduleId: string, forceDryRun = true) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        targets: {
          include: { resource: true },
        },
      },
    });

    if (!schedule) {
      throw new Error(`Schedule "${scheduleId}" not found.`);
    }

    // Resolve all targets (direct and label-matched)
    const allResources = await prisma.cloudResource.findMany();
    const targetMap = new Map();

    schedule.targets.forEach((t) => targetMap.set(t.resource.id, t.resource));

    if (schedule.targetLabelKey) {
      allResources.forEach((r) => {
        try {
          const labels = JSON.parse(r.labels);
          const val = labels[schedule.targetLabelKey!];
          if (schedule.targetLabelValue) {
            if (val?.toLowerCase() === schedule.targetLabelValue.toLowerCase()) {
              targetMap.set(r.id, r);
            }
          } else if (val !== undefined) {
            targetMap.set(r.id, r);
          }
        } catch {
          // ignore parsing error
        }
      });
    }

    const targets = Array.from(targetMap.values());
    const actionToRun: 'START' | 'STOP' =
      schedule.action === 'START_ONLY' ? 'START' : 'STOP';

    const results = [];
    for (const target of targets) {
      const res = await this.executeAction({
        resourceId: target.id,
        action: actionToRun,
        triggeredBy: 'MANUAL_USER',
        scheduleId: schedule.id,
        forceDryRun,
      });
      results.push({ resourceName: target.name, ...res });
    }

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      action: actionToRun,
      executedCount: results.length,
      dryRun: forceDryRun,
      results,
    };
  }

  async listExecutionLogs(params: {
    page?: number;
    limit?: number;
    status?: string;
    resourceId?: string;
    scheduleId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.resourceId) where.resourceId = params.resourceId;
    if (params.scheduleId) where.scheduleId = params.scheduleId;

    const [total, logs] = await Promise.all([
      prisma.executionLog.count({ where }),
      prisma.executionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
        include: {
          resource: {
            select: { id: true, name: true, machineType: true, zoneOrRegion: true },
          },
          schedule: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }
}

export const executionService = new ExecutionService();
