import { Cron } from 'croner';
import { prisma } from '../database';
import { executionService } from '../services/execution.service';
import { config } from '../config';

interface ActiveJob {
  scheduleId: string;
  type: 'START' | 'STOP';
  cronJob: Cron;
}

export class SchedulerRunner {
  private activeJobs: Map<string, ActiveJob[]> = new Map();
  private syncJob: Cron | null = null;
  private isRunning = false;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[Scheduler] Initializing automated schedule execution engine...');

    // Load and schedule all enabled schedules
    await this.refreshSchedules();

    // Re-sync schedules every 5 minutes in case DB was updated externally
    this.syncJob = new Cron('*/5 * * * *', async () => {
      await this.refreshSchedules();
    });

    console.log('[Scheduler] Background schedule runner active and monitoring.');
  }

  stop() {
    this.isRunning = false;
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
    }
    this.clearAllJobs();
    console.log('[Scheduler] Background schedule runner stopped.');
  }

  private clearAllJobs() {
    for (const [_, jobs] of this.activeJobs.entries()) {
      for (const j of jobs) {
        j.cronJob.stop();
      }
    }
    this.activeJobs.clear();
  }

  async refreshSchedules() {
    // Check if scheduler is enabled in config and DB
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: 'scheduler_enabled' },
    });
    const schedulerEnabled = dbConfig
      ? dbConfig.value === 'true'
      : config.schedulerEnabled;

    if (!schedulerEnabled) {
      this.clearAllJobs();
      console.log('[Scheduler] Scheduler is currently disabled via configuration.');
      return;
    }

    this.clearAllJobs();

    const enabledSchedules = await prisma.schedule.findMany({
      where: { isEnabled: true },
      include: {
        targets: {
          include: { resource: true },
        },
      },
    });

    for (const schedule of enabledSchedules) {
      this.registerScheduleJobs(schedule);
    }

    console.log(
      `[Scheduler] Loaded ${enabledSchedules.length} active schedules (${this.activeJobs.size} registered cron jobs).`
    );
  }

  private registerScheduleJobs(schedule: any) {
    const jobs: ActiveJob[] = [];
    const timezone = schedule.timezone || 'UTC';

    // 1. Start action job
    if (
      schedule.cronStart &&
      (schedule.action === 'START_AND_STOP' || schedule.action === 'START_ONLY')
    ) {
      try {
        const startCron = new Cron(
          schedule.cronStart,
          { timezone },
          async () => {
            console.log(
              `[Scheduler] Firing START trigger for schedule "${schedule.name}" (${schedule.id})`
            );
            await this.executeScheduleTrigger(schedule.id, 'START');
          }
        );

        jobs.push({
          scheduleId: schedule.id,
          type: 'START',
          cronJob: startCron,
        });
      } catch (err: any) {
        console.error(
          `[Scheduler] Failed to register cronStart for schedule ${schedule.id}:`,
          err.message
        );
      }
    }

    // 2. Stop action job
    if (
      schedule.cronStop &&
      (schedule.action === 'START_AND_STOP' || schedule.action === 'STOP_ONLY')
    ) {
      try {
        const stopCron = new Cron(
          schedule.cronStop,
          { timezone },
          async () => {
            console.log(
              `[Scheduler] Firing STOP trigger for schedule "${schedule.name}" (${schedule.id})`
            );
            await this.executeScheduleTrigger(schedule.id, 'STOP');
          }
        );

        jobs.push({
          scheduleId: schedule.id,
          type: 'STOP',
          cronJob: stopCron,
        });
      } catch (err: any) {
        console.error(
          `[Scheduler] Failed to register cronStop for schedule ${schedule.id}:`,
          err.message
        );
      }
    }

    if (jobs.length > 0) {
      this.activeJobs.set(schedule.id, jobs);
    }
  }

  private async executeScheduleTrigger(scheduleId: string, action: 'START' | 'STOP') {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          targets: {
            include: { resource: true },
          },
        },
      });

      if (!schedule || !schedule.isEnabled) return;

      // Resolve targets: direct + dynamic labels
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
            // ignore
          }
        });
      }

      const targets = Array.from(targetMap.values());
      console.log(
        `[Scheduler] Executing ${action} on ${targets.length} target(s) for schedule "${schedule.name}"`
      );

      for (const target of targets) {
        try {
          await executionService.executeAction({
            resourceId: target.id,
            action,
            triggeredBy: 'AUTOMATED_SCHEDULE',
            scheduleId: schedule.id,
          });
        } catch (err: any) {
          console.error(
            `[Scheduler] Error executing ${action} on resource ${target.id}:`,
            err.message
          );
        }
      }
    } catch (err: any) {
      console.error(`[Scheduler] Fatal error during schedule trigger for ${scheduleId}:`, err);
    }
  }
}

export const schedulerRunner = new SchedulerRunner();
