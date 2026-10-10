export type ResourceType = 'COMPUTE_ENGINE_VM' | 'CLOUD_SQL';

export type ResourceStatus =
  | 'RUNNING'
  | 'TERMINATED'
  | 'STOPPED'
  | 'SUSPENDED'
  | 'PROVISIONING'
  | 'STAGING'
  | 'UNKNOWN';

export interface CloudResourceSummary {
  id: string; // Unique resource identifier (e.g. URI or ID)
  resourceType: ResourceType;
  name: string;
  projectId: string;
  zoneOrRegion: string;
  machineType: string;
  status: ResourceStatus;
  labels: Record<string, string>;
  cpuCount: number;
  memoryMb: number;
  estimatedHourlyCost: number;
}

export interface ActionResult {
  success: boolean;
  action: 'START' | 'STOP';
  resourceId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  error?: string;
  dryRun?: boolean;
  durationMs?: number;
}

export interface CloudResourceAdapter {
  readonly resourceType: ResourceType;

  /**
   * Discovers and retrieves all resources of this type for the given GCP project.
   */
  listResources(projectId?: string): Promise<CloudResourceSummary[]>;

  /**
   * Retrieves a single resource by its identifier.
   */
  getResource(id: string): Promise<CloudResourceSummary | null>;

  /**
   * Safely starts a non-running resource.
   */
  startResource(id: string, dryRun?: boolean): Promise<ActionResult>;

  /**
   * Safely stops a running resource.
   */
  stopResource(id: string, dryRun?: boolean): Promise<ActionResult>;

  /**
   * Estimates hourly cost based on machine specifications.
   */
  calculateHourlyCost(machineType: string, zone?: string): number;
}
