import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { prisma } from './database';
import { schedulerRunner } from './scheduler/runner';
import { resourceService } from './services/resource.service';
import resourcesRouter from './routes/resources.routes';
import schedulesRouter from './routes/schedules.routes';
import policiesRouter from './routes/policies.routes';
import executionsRouter from './routes/executions.routes';
import statsRouter from './routes/stats.routes';
import settingsRouter from './routes/settings.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Ensure data directory exists for SQLite
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Routes
app.use('/api/resources', resourcesRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/executions', executionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/settings', settingsRouter);

// Centralized Error Handling
app.use(errorHandler);

const server = app.listen(config.port, async () => {
  console.log(`[Server] GCP Cost Optimizer backend running on http://localhost:${config.port}`);

  try {
    // Start automated background scheduler engine
    await schedulerRunner.start();

    // Perform an initial sync if resource inventory is empty
    const count = await prisma.cloudResource.count();
    if (count === 0) {
      console.log('[Server] Resource inventory is empty. Performing initial cloud sync...');
      await resourceService.syncResources();
      console.log('[Server] Initial sync completed.');
    }
  } catch (err: any) {
    console.error('[Server] Initialization warning:', err.message);
  }
});

// Graceful shutdown handling
const shutdown = async () => {
  console.log('\n[Server] Gracefully shutting down...');
  schedulerRunner.stop();
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[Server] Closed all connections. Exited.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
