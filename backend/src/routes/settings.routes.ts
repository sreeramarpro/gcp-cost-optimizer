import { Router, Request, Response, NextFunction } from 'express';
import { adapterManager } from '../adapters/adapter.factory';
import { prisma } from '../database';
import { schedulerRunner } from '../scheduler/runner';

const router = Router();

// GET /api/settings/status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adapterStatus = adapterManager.getStatus();

    const [dryRunConfig, schedulerConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'global_dry_run' } }),
      prisma.systemConfig.findUnique({ where: { key: 'scheduler_enabled' } }),
    ]);

    res.json({
      success: true,
      data: {
        ...adapterStatus,
        globalDryRun: dryRunConfig ? dryRunConfig.value === 'true' : true,
        schedulerEnabled: schedulerConfig ? schedulerConfig.value === 'true' : true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/test-connection
router.post('/test-connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, credentialsPath } = req.body;

    if (!projectId) {
      res.status(400).json({ success: false, message: 'projectId is required' });
      return;
    }

    try {
      adapterManager.setLiveGCP(projectId, credentialsPath);
      // Try to discover resources to verify credentials
      const adapter = adapterManager.getAdapter();
      const resources = await adapter.listResources(projectId);

      res.json({
        success: true,
        message: `Successfully connected to GCP project "${projectId}". Discovered ${resources.length} instance(s).`,
        count: resources.length,
      });
    } catch (err: any) {
      // Revert to sandbox if live test fails
      adapterManager.setSandboxDemo();
      res.status(400).json({
        success: false,
        message: `GCP Connection test failed: ${err.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/switch-mode
router.post('/switch-mode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mode, projectId, credentialsPath } = req.body;

    if (mode === 'LIVE_GCP') {
      if (!projectId) {
        res.status(400).json({ success: false, message: 'projectId is required for Live GCP mode' });
        return;
      }
      adapterManager.setLiveGCP(projectId, credentialsPath);
    } else {
      adapterManager.setSandboxDemo();
    }

    res.json({
      success: true,
      message: `Switched mode to ${mode}`,
      data: adapterManager.getStatus(),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/settings/config
router.post('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { globalDryRun, schedulerEnabled } = req.body;

    if (globalDryRun !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'global_dry_run' },
        update: { value: String(globalDryRun) },
        create: { key: 'global_dry_run', value: String(globalDryRun) },
      });
    }

    if (schedulerEnabled !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'scheduler_enabled' },
        update: { value: String(schedulerEnabled) },
        create: { key: 'scheduler_enabled', value: String(schedulerEnabled) },
      });
      await schedulerRunner.refreshSchedules();
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
