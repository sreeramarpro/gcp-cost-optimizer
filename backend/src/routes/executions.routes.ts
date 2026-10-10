import { Router, Request, Response, NextFunction } from 'express';
import { executionService } from '../services/execution.service';

const router = Router();

// GET /api/executions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, resourceId, scheduleId } = req.query;
    const result = await executionService.listExecutionLogs({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      status: status as string,
      resourceId: resourceId as string,
      scheduleId: scheduleId as string,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
