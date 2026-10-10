import { Router, Request, Response, NextFunction } from 'express';
import { costService } from '../services/cost.service';

const router = Router();

// GET /api/stats/dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await costService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/savings
router.get('/savings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const savings = await costService.getGranularSavings();
    res.json({ success: true, data: savings });
  } catch (err) {
    next(err);
  }
});

export default router;
