/**
 * Standard Google Cloud Compute Engine on-demand pricing reference (USD / hour)
 * Baseline based on us-central1 (Iowa).
 */
export const COMPUTE_MACHINE_TYPE_PRICING: Record<string, number> = {
  // E2 General Purpose (Shared core & standard)
  'e2-micro': 0.0084,
  'e2-small': 0.0168,
  'e2-medium': 0.0336,
  'e2-standard-2': 0.0671,
  'e2-standard-4': 0.1342,
  'e2-standard-8': 0.2684,
  'e2-standard-16': 0.5369,
  'e2-highmem-2': 0.0904,
  'e2-highmem-4': 0.1808,
  'e2-highcpu-2': 0.0494,
  'e2-highcpu-4': 0.0988,

  // N2 Balanced General Purpose
  'n2-standard-2': 0.0971,
  'n2-standard-4': 0.1942,
  'n2-standard-8': 0.3884,
  'n2-standard-16': 0.7768,

  // N1 Legacy General Purpose
  'n1-standard-1': 0.0475,
  'n1-standard-2': 0.0950,
  'n1-standard-4': 0.1900,
  'n1-standard-8': 0.3800,

  // C2 Compute-Optimized
  'c2-standard-4': 0.2088,
  'c2-standard-8': 0.4176,
  'c2-standard-16': 0.8352,

  // Default fallback rates
  'default-vcpu-hourly': 0.031611,
  'default-ram-gb-hourly': 0.004237,
};

export function estimateVmHourlyCost(machineType: string, cpuCount?: number, memoryMb?: number): number {
  const normalized = machineType.toLowerCase().replace(/^.*\/machinetypes\//i, '');

  if (COMPUTE_MACHINE_TYPE_PRICING[normalized]) {
    return COMPUTE_MACHINE_TYPE_PRICING[normalized];
  }

  // Fallback estimation using vCPU and RAM if available
  const cpus = cpuCount || 2;
  const ramGb = (memoryMb || 4096) / 1024;
  const cost =
    cpus * COMPUTE_MACHINE_TYPE_PRICING['default-vcpu-hourly'] +
    ramGb * COMPUTE_MACHINE_TYPE_PRICING['default-ram-gb-hourly'];

  return Math.round(cost * 10000) / 10000;
}
