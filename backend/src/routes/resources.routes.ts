import { Router, Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resource.service';
import { executionService } from '../services/execution.service';

const router = Router();

// GET /api/resources
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, zone, isProtected, scheduleId } = req.query;
    const resources = await resourceService.listResources({
      search: search as string,
      status: status as string,
      zone: zone as string,
      isProtected:
        isProtected !== undefined ? isProtected === 'true' : undefined,
      scheduleId: scheduleId as string,
    });
    res.json({ success: true, count: resources.length, data: resources });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/sync
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await resourceService.syncResources();
    res.json({ success: true, message: 'Resources synced successfully.', ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id
router.get('/:id(*)', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    if (!resource) {
      res.status(404).json({ success: false, message: 'Resource not found' });
      return;
    }
    res.json({ success: true, data: resource });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/resources/:id/protection
router.patch('/:id(*)/protection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isProtected, reason } = req.body;
    if (typeof isProtected !== 'boolean') {
      res.status(400).json({ success: false, message: 'isProtected boolean is required' });
      return;
    }
    const updated = await resourceService.toggleProtection(req.params.id, isProtected, reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/:id/action
router.post('/:id(*)/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, dryRun } = req.body;
    if (action !== 'START' && action !== 'STOP') {
      res.status(400).json({ success: false, message: 'Action must be START or STOP' });
      return;
    }
    const result = await executionService.executeAction({
      resourceId: req.params.id,
      action,
      triggeredBy: 'MANUAL_USER',
      forceDryRun: dryRun,
    });
    res.json({ success: result.success, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
