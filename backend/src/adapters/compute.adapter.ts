import { InstancesClient } from '@google-cloud/compute';
import {
  CloudResourceAdapter,
  CloudResourceSummary,
  ActionResult,
  ResourceType,
  ResourceStatus,
} from './base.adapter';
import { estimateVmHourlyCost } from './pricing';

export interface ComputeAdapterOptions {
  projectId?: string;
  keyFilename?: string;
}

export class ComputeEngineAdapter implements CloudResourceAdapter {
  readonly resourceType: ResourceType = 'COMPUTE_ENGINE_VM';
  private client: InstancesClient;
  private defaultProjectId: string;

  constructor(options: ComputeAdapterOptions = {}) {
    this.defaultProjectId = options.projectId || process.env.GCP_PROJECT_ID || '';
    const clientOptions: { projectId?: string; keyFilename?: string } = {};
    if (this.defaultProjectId) clientOptions.projectId = this.defaultProjectId;
    if (options.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      clientOptions.keyFilename =
        options.keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    this.client = new InstancesClient(clientOptions);
  }

  private parseResourceCoordinates(id: string): {
    project: string;
    zone: string;
    instance: string;
  } {
    // Expected id format: projects/{project}/zones/{zone}/instances/{instance}
    // Or fallback format: {project}:{zone}:{instance}
    if (id.includes('/')) {
      const parts = id.split('/');
      const projIdx = parts.indexOf('projects');
      const zoneIdx = parts.indexOf('zones');
      const instIdx = parts.indexOf('instances');

      if (projIdx !== -1 && zoneIdx !== -1 && instIdx !== -1) {
        return {
          project: parts[projIdx + 1],
          zone: parts[zoneIdx + 1],
          instance: parts[instIdx + 1],
        };
      }
    }

    if (id.includes(':')) {
      const [project, zone, instance] = id.split(':');
      return { project, zone, instance };
    }

    throw new Error(
      `Invalid Compute Engine resource ID format: "${id}". Expected format: "projects/{project}/zones/{zone}/instances/{instance}"`
    );
  }

  private normalizeStatus(rawStatus?: string | null): ResourceStatus {
    switch (rawStatus?.toUpperCase()) {
      case 'RUNNING':
        return 'RUNNING';
      case 'TERMINATED':
      case 'STOPPED':
        return 'TERMINATED';
      case 'SUSPENDED':
        return 'SUSPENDED';
      case 'PROVISIONING':
      case 'STAGING':
        return 'PROVISIONING';
      default:
        return 'UNKNOWN';
    }
  }

  private extractMachineTypeName(machineTypeUri?: string | null): string {
    if (!machineTypeUri) return 'custom';
    const parts = machineTypeUri.split('/');
    return parts[parts.length - 1];
  }

  private extractZoneName(zoneUri?: string | null): string {
    if (!zoneUri) return 'unknown';
    const parts = zoneUri.split('/');
    return parts[parts.length - 1];
  }

  async listResources(projectId?: string): Promise<CloudResourceSummary[]> {
    const project = projectId || this.defaultProjectId;
    if (!project) {
      throw new Error('GCP Project ID must be provided to list Compute Engine resources.');
    }

    const resources: CloudResourceSummary[] = [];

    // aggregatedList returns instances across all zones
    const iterable = this.client.aggregatedListAsync({
      project,
    });

    for await (const [zoneKey, scopedList] of iterable) {
      if (!scopedList.instances || scopedList.instances.length === 0) {
        continue;
      }

      for (const inst of scopedList.instances) {
        const zone = this.extractZoneName(inst.zone);
        const name = inst.name || 'unnamed-instance';
        const machineType = this.extractMachineTypeName(inst.machineType);
        const id = `projects/${project}/zones/${zone}/instances/${name}`;
        const labels: Record<string, string> = (inst.labels as Record<string, string>) || {};
        const status = this.normalizeStatus(inst.status);

        // Approximate CPU and memory based on machine type name or defaults
        let cpuCount = 2;
        let memoryMb = 4096;
        if (machineType.includes('-')) {
          const suffix = machineType.split('-').pop();
          const parsedCpus = parseInt(suffix || '', 10);
          if (!isNaN(parsedCpus)) cpuCount = parsedCpus;
        }

        const hourlyCost = this.calculateHourlyCost(machineType);

        resources.push({
          id,
          resourceType: 'COMPUTE_ENGINE_VM',
          name,
          projectId: project,
          zoneOrRegion: zone,
          machineType,
          status,
          labels,
          cpuCount,
          memoryMb,
          estimatedHourlyCost: hourlyCost,
        });
      }
    }

    return resources;
  }

  async getResource(id: string): Promise<CloudResourceSummary | null> {
    const { project, zone, instance } = this.parseResourceCoordinates(id);
    try {
      const [inst] = await this.client.get({
        project,
        zone,
        instance,
      });

      if (!inst) return null;

      const machineType = this.extractMachineTypeName(inst.machineType);
      const labels: Record<string, string> = (inst.labels as Record<string, string>) || {};
      const status = this.normalizeStatus(inst.status);

      return {
        id,
        resourceType: 'COMPUTE_ENGINE_VM',
        name: inst.name || instance,
        projectId: project,
        zoneOrRegion: zone,
        machineType,
        status,
        labels,
        cpuCount: 2,
        memoryMb: 4096,
        estimatedHourlyCost: this.calculateHourlyCost(machineType),
      };
    } catch (err: any) {
      if (err.code === 5 || err.message?.includes('not found')) {
        return null;
      }
      throw err;
    }
  }

  async startResource(id: string, dryRun = false): Promise<ActionResult> {
    const startTime = Date.now();
    const { project, zone, instance } = this.parseResourceCoordinates(id);

    if (dryRun) {
      return {
        success: true,
        action: 'START',
        resourceId: id,
        previousStatus: 'TERMINATED',
        newStatus: 'RUNNING',
        message: `[DRY-RUN] Simulated start of Compute Engine VM ${instance} in ${zone}.`,
        dryRun: true,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const [operation] = await this.client.start({
        project,
        zone,
        instance,
      });

      return {
        success: true,
        action: 'START',
        resourceId: id,
        previousStatus: 'TERMINATED',
        newStatus: 'RUNNING',
        message: `Successfully requested start for VM ${instance}. Operation: ${operation.name || 'started'}`,
        dryRun: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'START',
        resourceId: id,
        previousStatus: 'TERMINATED',
        newStatus: 'TERMINATED',
        message: `Failed to start VM ${instance}: ${err.message}`,
        error: err.stack || err.message,
        dryRun: false,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async stopResource(id: string, dryRun = false): Promise<ActionResult> {
    const startTime = Date.now();
    const { project, zone, instance } = this.parseResourceCoordinates(id);

    if (dryRun) {
      return {
        success: true,
        action: 'STOP',
        resourceId: id,
        previousStatus: 'RUNNING',
        newStatus: 'TERMINATED',
        message: `[DRY-RUN] Simulated stop of Compute Engine VM ${instance} in ${zone}.`,
        dryRun: true,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const [operation] = await this.client.stop({
        project,
        zone,
        instance,
      });

      return {
        success: true,
        action: 'STOP',
        resourceId: id,
        previousStatus: 'RUNNING',
        newStatus: 'TERMINATED',
        message: `Successfully requested stop for VM ${instance}. Operation: ${operation.name || 'stopped'}`,
        dryRun: false,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'STOP',
        resourceId: id,
        previousStatus: 'RUNNING',
        newStatus: 'RUNNING',
        message: `Failed to stop VM ${instance}: ${err.message}`,
        error: err.stack || err.message,
        dryRun: false,
        durationMs: Date.now() - startTime,
      };
    }
  }

  calculateHourlyCost(machineType: string): number {
    return estimateVmHourlyCost(machineType);
  }
}
