import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  dryRunDefault: process.env.DRY_RUN_DEFAULT !== 'false',
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== 'false',
  databaseUrl: process.env.DATABASE_URL || 'file:./data/optimizer.db',
};
