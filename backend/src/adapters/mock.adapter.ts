import {
  CloudResourceAdapter,
  CloudResourceSummary,
  ActionResult,
  ResourceType,
  ResourceStatus,
} from './base.adapter';
import { estimateVmHourlyCost } from './pricing';

export class MockComputeEngineAdapter implements CloudResourceAdapter {
  readonly resourceType: ResourceType = 'COMPUTE_ENGINE_VM';
  public readonly isSandbox = true;

  private instances: Map<string, CloudResourceSummary> = new Map();

  constructor() {
    const defaultFleet: CloudResourceSummary[] = [
      {
        id: 'projects/demo-sandbox-project/zones/us-central1-a/instances/dev-api-server-01',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'dev-api-server-01',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-central1-a',
        machineType: 'e2-standard-4',
        status: 'RUNNING',
        labels: { env: 'dev', team: 'backend', 'cost-center': 'engineering' },
        cpuCount: 4,
        memoryMb: 16384,
        estimatedHourlyCost: estimateVmHourlyCost('e2-standard-4'),
      },
      {
        id: 'projects/demo-sandbox-project/zones/us-central1-a/instances/dev-worker-node-02',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'dev-worker-node-02',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-central1-a',
        machineType: 'e2-medium',
        status: 'RUNNING',
        labels: { env: 'dev', role: 'worker', 'auto-stop': 'true' },
        cpuCount: 2,
        memoryMb: 4096,
        estimatedHourlyCost: estimateVmHourlyCost('e2-medium'),
      },
      {
        id: 'projects/demo-sandbox-project/zones/us-central1-b/instances/staging-web-frontend',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'staging-web-frontend',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-central1-b',
        machineType: 'e2-standard-2',
        status: 'TERMINATED',
        labels: { env: 'staging', team: 'frontend' },
        cpuCount: 2,
        memoryMb: 8192,
        estimatedHourlyCost: estimateVmHourlyCost('e2-standard-2'),
      },
      {
        id: 'projects/demo-sandbox-project/zones/us-central1-b/instances/qa-test-runner-01',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'qa-test-runner-01',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-central1-b',
        machineType: 'c2-standard-4',
        status: 'RUNNING',
        labels: { env: 'qa', suite: 'e2e' },
        cpuCount: 4,
        memoryMb: 16384,
        estimatedHourlyCost: estimateVmHourlyCost('c2-standard-4'),
      },
      {
        id: 'projects/demo-sandbox-project/zones/us-east1-c/instances/prod-primary-database',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'prod-primary-database',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-east1-c',
        machineType: 'n2-standard-8',
        status: 'RUNNING',
        labels: { env: 'prod', protected: 'true', tier: 'critical' },
        cpuCount: 8,
        memoryMb: 32768,
        estimatedHourlyCost: estimateVmHourlyCost('n2-standard-8'),
      },
      {
        id: 'projects/demo-sandbox-project/zones/us-east1-c/instances/prod-gateway-01',
        resourceType: 'COMPUTE_ENGINE_VM',
        name: 'prod-gateway-01',
        projectId: 'demo-sandbox-project',
        zoneOrRegion: 'us-east1-c',
        machineType: 'n2-standard-4',
        status: 'RUNNING',
        labels: { env: 'prod', team: 'infrastructure' },
        cpuCount: 4,
        memoryMb: 16384,
        estimatedHourlyCost: estimateVmHourlyCost('n2-standard-4'),
      },
    ];

    for (const inst of defaultFleet) {
      this.instances.set(inst.id, inst);
    }
  }

  async listResources(projectId?: string): Promise<CloudResourceSummary[]> {
    return Array.from(this.instances.values());
  }

  async getResource(id: string): Promise<CloudResourceSummary | null> {
    return this.instances.get(id) || null;
  }

  async startResource(id: string, dryRun = false): Promise<ActionResult> {
    const inst = this.instances.get(id);
    const startTime = Date.now();

    if (!inst) {
      return {
        success: false,
        action: 'START',
        resourceId: id,
        previousStatus: 'UNKNOWN',
        newStatus: 'UNKNOWN',
        message: `Resource ${id} not found in sandbox environment.`,
        error: 'NotFound',
        durationMs: Date.now() - startTime,
      };
    }

    const previousStatus = inst.status;

    if (!dryRun) {
      inst.status = 'RUNNING';
      this.instances.set(id, inst);
    }

    return {
      success: true,
      action: 'START',
      resourceId: id,
      previousStatus,
      newStatus: 'RUNNING',
      message: dryRun
        ? `[DRY-RUN] Simulated start of Sandbox VM ${inst.name}.`
        : `Successfully started Sandbox VM ${inst.name}.`,
      dryRun,
      durationMs: Date.now() - startTime,
    };
  }

  async stopResource(id: string, dryRun = false): Promise<ActionResult> {
    const inst = this.instances.get(id);
    const startTime = Date.now();

    if (!inst) {
      return {
        success: false,
        action: 'STOP',
        resourceId: id,
        previousStatus: 'UNKNOWN',
        newStatus: 'UNKNOWN',
        message: `Resource ${id} not found in sandbox environment.`,
        error: 'NotFound',
        durationMs: Date.now() - startTime,
      };
    }

    const previousStatus = inst.status;

    if (!dryRun) {
      inst.status = 'TERMINATED';
      this.instances.set(id, inst);
    }

    return {
      success: true,
      action: 'STOP',
      resourceId: id,
      previousStatus,
      newStatus: 'TERMINATED',
      message: dryRun
        ? `[DRY-RUN] Simulated stop of Sandbox VM ${inst.name}.`
        : `Successfully stopped Sandbox VM ${inst.name}.`,
      dryRun,
      durationMs: Date.now() - startTime,
    };
  }

  calculateHourlyCost(machineType: string): number {
    return estimateVmHourlyCost(machineType);
  }
}
