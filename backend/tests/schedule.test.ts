import { describe, it, expect } from 'vitest';
import { ScheduleService } from '../src/services/schedule.service';
import { CostService } from '../src/services/cost.service';

describe('Schedule Service & Cron Evaluation', () => {
  const scheduleService = new ScheduleService();
  const costService = new CostService();

  it('should validate valid standard cron expressions', () => {
    expect(scheduleService.validateCron('0 8 * * 1-5')).toBe(true);
    expect(scheduleService.validateCron('0 19 * * *')).toBe(true);
    expect(scheduleService.validateCron('*/15 * * * *')).toBe(true);
  });

  it('should reject invalid cron expressions', () => {
    expect(scheduleService.validateCron('invalid-cron-expression')).toBe(false);
    expect(scheduleService.validateCron('99 99 99 * *')).toBe(false);
  });

  it('should calculate next run dates correctly with timezone', () => {
    const { nextStart, nextStop } = scheduleService.getNextRuns(
      '0 8 * * 1-5',
      '0 19 * * 1-5',
      'America/New_York'
    );

    expect(nextStart).toBeInstanceOf(Date);
    expect(nextStop).toBeInstanceOf(Date);
    expect(nextStart!.getTime()).toBeGreaterThan(Date.now() - 60000);
  });

  it('should compute non-prod weekly off-hours accurately', () => {
    const weekdayOffHours = costService.calculateScheduleOffHoursPerWeek(
      '0 8 * * 1-5',
      '0 19 * * 1-5',
      'START_AND_STOP'
    );
    expect(weekdayOffHours).toBe(113); // 168 - 55 = 113 hours off per week
  });
});
