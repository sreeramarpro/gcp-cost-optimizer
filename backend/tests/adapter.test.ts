import { describe, it, expect } from 'vitest';
import { MockComputeEngineAdapter } from '../src/adapters/mock.adapter';

describe('CloudResourceAdapter Contract (MockComputeEngineAdapter)', () => {
  const adapter = new MockComputeEngineAdapter();

  it('should list all sandbox resources with required fields', async () => {
    const resources = await adapter.listResources('demo-sandbox-project');
    expect(resources.length).toBeGreaterThan(0);

    const first = resources[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('resourceType', 'COMPUTE_ENGINE_VM');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('estimatedHourlyCost');
    expect(first.estimatedHourlyCost).toBeGreaterThan(0);
  });

  it('should retrieve a single resource by ID', async () => {
    const resources = await adapter.listResources();
    const targetId = resources[0].id;

    const resource = await adapter.getResource(targetId);
    expect(resource).not.toBeNull();
    expect(resource?.id).toBe(targetId);
  });

  it('should simulate stop in dryRun mode without changing persistent state', async () => {
    const runningVmId = 'projects/demo-sandbox-project/zones/us-central1-a/instances/dev-api-server-01';
    const result = await adapter.stopResource(runningVmId, true);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.message).toContain('[DRY-RUN]');

    // Confirm persistent status remained RUNNING
    const check = await adapter.getResource(runningVmId);
    expect(check?.status).toBe('RUNNING');
  });

  it('should change persistent state when dryRun is false', async () => {
    const vmId = 'projects/demo-sandbox-project/zones/us-central1-a/instances/dev-worker-node-02';
    
    // Stop it
    const stopResult = await adapter.stopResource(vmId, false);
    expect(stopResult.success).toBe(true);
    expect(stopResult.dryRun).toBe(false);

    let check = await adapter.getResource(vmId);
    expect(check?.status).toBe('TERMINATED');

    // Start it back up
    const startResult = await adapter.startResource(vmId, false);
    expect(startResult.success).toBe(true);
    expect(startResult.dryRun).toBe(false);

    check = await adapter.getResource(vmId);
    expect(check?.status).toBe('RUNNING');
  });
});
