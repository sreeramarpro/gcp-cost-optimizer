import { prisma } from '../database';

export class CostService {
  /**
   * Approximates weekly off-hours based on start and stop crons.
   * Default non-prod assumption: if Mon-Fri 08:00 - 19:00 (11 hrs/day * 5 = 55 hrs on),
   * then 113 hours off per week (out of 168 total hours in a week).
   */
  calculateScheduleOffHoursPerWeek(
    cronStart?: string | null,
    cronStop?: string | null,
    action?: string
  ): number {
    if (action === 'STOP_ONLY') {
      // Stopped permanently or weekend stop: estimate ~80 off hours/week
      return 80;
    }

    if (cronStart && cronStop) {
      // Check if it's typical weekday schedule (contains 1-5 or MON-FRI)
      if (cronStart.includes('1-5') || cronStop.includes('1-5')) {
        // Typically 11 hours running per weekday = 55 hrs run, 113 hrs off
        return 113;
      }
      // General estimate for daily night shutdown (12 hours off per day * 7 = 84 hrs)
      return 84;
    }

    // Default conservative schedule off-hours
    return 70;
  }

  async getDashboardStats() {
    const [resources, schedules, executionLogs, policies] = await Promise.all([
      prisma.cloudResource.findMany({
        include: {
          scheduleTargets: {
            include: { schedule: true },
          },
        },
      }),
      prisma.schedule.findMany({
        where: { isEnabled: true },
      }),
      prisma.executionLog.findMany({
        take: 100,
        orderBy: { executedAt: 'desc' },
      }),
      prisma.protectionPolicy.count({ where: { isActive: true } }),
    ]);

    const totalResources = resources.length;
    const runningCount = resources.filter((r) => r.status === 'RUNNING').length;
    const stoppedCount = resources.filter((r) => r.status === 'TERMINATED' || r.status === 'STOPPED').length;
    const protectedCount = resources.filter((r) => r.isProtected).length;

    // Baseline calculation (730 hours / month)
    let totalBaselineMonthly = 0;
    let totalProjectedMonthlySavings = 0;

    for (const r of resources) {
      const hourly = r.estimatedHourlyCost || 0;
      const baselineMonthly = hourly * 730;
      totalBaselineMonthly += baselineMonthly;

      // Check if resource has attached active schedules
      const hasActiveSchedule = r.scheduleTargets.some((st) => st.schedule.isEnabled);

      if (hasActiveSchedule && !r.isProtected) {
        // Average ~113 hours saved per week -> 491 hours saved per month
        const monthlyHoursSaved = 491;
        const savings = hourly * monthlyHoursSaved;
        totalProjectedMonthlySavings += savings;
      }
    }

    const savingsPercentage =
      totalBaselineMonthly > 0
        ? Math.round((totalProjectedMonthlySavings / totalBaselineMonthly) * 100)
        : 0;

    // Execution success rate
    const validLogs = executionLogs.filter((l) => l.status !== 'SKIPPED_PROTECTED');
    const successfulLogs = validLogs.filter((l) => l.status === 'SUCCESS' || l.status === 'DRY_RUN');
    const successRate =
      validLogs.length > 0
        ? Math.round((successfulLogs.length / validLogs.length) * 100)
        : 100;

    return {
      fleet: {
        totalResources,
        runningCount,
        stoppedCount,
        otherCount: totalResources - runningCount - stoppedCount,
        protectedCount,
        activePoliciesCount: policies,
      },
      schedules: {
        totalSchedules: schedules.length,
      },
      financials: {
        baselineMonthlyCost: Math.round(totalBaselineMonthly * 100) / 100,
        projectedMonthlySavings: Math.round(totalProjectedMonthlySavings * 100) / 100,
        projectedMonthlyCost: Math.max(0, Math.round((totalBaselineMonthly - totalProjectedMonthlySavings) * 100) / 100),
        savingsPercentage,
      },
      operations: {
        recentExecutionsCount: executionLogs.length,
        successRate,
      },
    };
  }

  async getGranularSavings() {
    const resources = await prisma.cloudResource.findMany({
      include: {
        scheduleTargets: {
          include: { schedule: true },
        },
      },
    });

    return resources.map((r) => {
      const hourly = r.estimatedHourlyCost || 0;
      const baselineMonthly = Math.round(hourly * 730 * 100) / 100;

      const activeSchedules = r.scheduleTargets
        .map((st) => st.schedule)
        .filter((s) => s.isEnabled);

      let offHoursPerWeek = 0;
      if (activeSchedules.length > 0 && !r.isProtected) {
        // Pick schedule with highest off-hours
        offHoursPerWeek = Math.max(
          ...activeSchedules.map((s) =>
            this.calculateScheduleOffHoursPerWeek(s.cronStart, s.cronStop, s.action)
          )
        );
      }

      const monthlyHoursSaved = Math.round(offHoursPerWeek * 4.345);
      const monthlySavings = Math.round(hourly * monthlyHoursSaved * 100) / 100;
      const projectedCost = Math.max(0, Math.round((baselineMonthly - monthlySavings) * 100) / 100);
      const savingsPercent =
        baselineMonthly > 0 ? Math.round((monthlySavings / baselineMonthly) * 100) : 0;

      return {
        resourceId: r.id,
        name: r.name,
        zoneOrRegion: r.zoneOrRegion,
        machineType: r.machineType,
        status: r.status,
        isProtected: r.isProtected,
        estimatedHourlyCost: hourly,
        baselineMonthlyCost: baselineMonthly,
        offHoursPerWeek,
        monthlyHoursSaved,
        projectedMonthlySavings: monthlySavings,
        projectedMonthlyCost: projectedCost,
        savingsPercent,
        activeSchedulesCount: activeSchedules.length,
      };
    });
  }
}

export const costService = new CostService();
