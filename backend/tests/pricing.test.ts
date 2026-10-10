import { describe, it, expect } from 'vitest';
import { estimateVmHourlyCost, COMPUTE_MACHINE_TYPE_PRICING } from '../src/adapters/pricing';

describe('Compute Engine Pricing Calculator', () => {
  it('should return exact price for standard known machine types', () => {
    expect(estimateVmHourlyCost('e2-standard-4')).toBe(COMPUTE_MACHINE_TYPE_PRICING['e2-standard-4']);
    expect(estimateVmHourlyCost('e2-medium')).toBe(COMPUTE_MACHINE_TYPE_PRICING['e2-medium']);
    expect(estimateVmHourlyCost('n2-standard-8')).toBe(COMPUTE_MACHINE_TYPE_PRICING['n2-standard-8']);
  });

  it('should correctly handle machine type URIs', () => {
    const fullUri = 'zones/us-central1-a/machineTypes/e2-standard-2';
    expect(estimateVmHourlyCost(fullUri)).toBe(COMPUTE_MACHINE_TYPE_PRICING['e2-standard-2']);
  });

  it('should fallback to vCPU and RAM calculation for custom machine types', () => {
    const customCost = estimateVmHourlyCost('custom-4-16384', 4, 16384);
    expect(customCost).toBeGreaterThan(0);
    // 4 vCPUs * ~0.0316 + 16 GB * ~0.0042
    expect(customCost).toBeCloseTo(4 * 0.031611 + 16 * 0.004237, 2);
  });
});
