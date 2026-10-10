import { Router, Request, Response, NextFunction } from 'express';
import { scheduleService } from '../services/schedule.service';
import { executionService } from '../services/execution.service';
import { schedulerRunner } from '../scheduler/runner';

const router = Router();

// GET /api/schedules
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await scheduleService.listSchedules();
    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      cronStart,
      cronStop,
      timezone,
      action,
      isEnabled,
      isDryRun,
      targetLabelKey,
      targetLabelValue,
      resourceIds,
    } = req.body;

    if (!name || !action) {
      res.status(400).json({ success: false, message: 'Name and action are required' });
      return;
    }

    const schedule = await scheduleService.createSchedule({
      name,
      description,
      cronStart,
      cronStop,
      timezone,
      action,
      isEnabled,
      isDryRun,
      targetLabelKey,
      targetLabelValue,
      resourceIds,
    });

    // Refresh active scheduler jobs
    await schedulerRunner.refreshSchedules();

    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) {
    next(err);
  }
});

// GET /api/schedules/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Schedule not found' });
      return;
    }
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedules/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await scheduleService.updateSchedule(req.params.id, req.body);
    await schedulerRunner.refreshSchedules();
    res.json({ success: true, data: updated });
  } catch (err: any) {
    next(err);
  }
});

// PATCH /api/schedules/:id/toggle
router.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      res.status(400).json({ success: false, message: 'isEnabled boolean is required' });
      return;
    }
    const updated = await scheduleService.toggleSchedule(req.params.id, isEnabled);
    await schedulerRunner.refreshSchedules();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules/:id/test-run
router.post('/:id/test-run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dryRun = true } = req.body;
    const result = await executionService.runScheduleNow(req.params.id, dryRun);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    await schedulerRunner.refreshSchedules();
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
