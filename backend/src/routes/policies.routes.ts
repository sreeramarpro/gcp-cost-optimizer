import { Router, Request, Response, NextFunction } from 'express';
import { policyService } from '../services/policy.service';

const router = Router();

// GET /api/policies
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await policyService.listPolicies();
    res.json({ success: true, count: policies.length, data: policies });
  } catch (err) {
    next(err);
  }
});

// POST /api/policies
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { policyType, key, value, description, isActive } = req.body;
    if (!policyType || !description) {
      res.status(400).json({ success: false, message: 'policyType and description are required' });
      return;
    }
    const policy = await policyService.createPolicy({
      policyType,
      key,
      value,
      description,
      isActive,
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/policies/:id/toggle
router.patch('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, message: 'isActive boolean is required' });
      return;
    }
    const updated = await policyService.togglePolicy(req.params.id, isActive);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/policies/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await policyService.deletePolicy(req.params.id);
    res.json({ success: true, message: 'Policy removed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
