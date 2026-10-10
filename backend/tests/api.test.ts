import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/database';
import { resourceService } from '../src/services/resource.service';

describe('GCP Cost Optimizer Core API Endpoints', () => {
  beforeAll(async () => {
    // Ensure initial sync has completed for test environment
    await resourceService.syncResources();
  });

  it('GET /api/health should return health check status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/settings/status should report active mode and safety flags', async () => {
    const res = await request(app).get('/api/settings/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('mode');
    expect(res.body.data).toHaveProperty('globalDryRun');
  });

  it('GET /api/resources should list discovered compute instances', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('zoneOrRegion');
    expect(first).toHaveProperty('machineType');
    expect(first).toHaveProperty('estimatedHourlyCost');
  });

  it('GET /api/stats/dashboard should return financial projections and fleet count', async () => {
    const res = await request(app).get('/api/stats/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('financials');
    expect(res.body.data.financials).toHaveProperty('baselineMonthlyCost');
    expect(res.body.data.financials).toHaveProperty('projectedMonthlySavings');
  });

  it('POST /api/schedules should validate and create a new schedule', async () => {
    const newSchedule = {
      name: 'API Test Dev Workday Routine',
      description: 'Test automated stop routine',
      action: 'START_AND_STOP',
      cronStart: '0 8 * * 1-5',
      cronStop: '0 19 * * 1-5',
      timezone: 'UTC',
      targetLabelKey: 'env',
      targetLabelValue: 'dev',
      isDryRun: true,
    };

    const res = await request(app).post('/api/schedules').send(newSchedule);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(newSchedule.name);

    // Clean up
    await prisma.schedule.delete({ where: { id: res.body.data.id } });
  });

  it('POST /api/resources/:id/action should simulate manual action safely', async () => {
    const resourcesRes = await request(app).get('/api/resources');
    const target = resourcesRes.body.data[0];

    const actionRes = await request(app)
      .post(`/api/resources/${encodeURIComponent(target.id)}/action`)
      .send({ action: 'START', dryRun: true });

    expect(actionRes.status).toBe(200);
    expect(actionRes.body.success).toBe(true);
    expect(actionRes.body.data.dryRun).toBe(true);
  });
});
