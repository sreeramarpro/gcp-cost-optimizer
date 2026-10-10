import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyService } from '../src/services/policy.service';
import { prisma } from '../src/database';

describe('Safety Policy Evaluator', () => {
  const policyService = new PolicyService();

  beforeEach(async () => {
    // Ensure default test policies exist
    const prodPolicy = await prisma.protectionPolicy.findFirst({
      where: { key: 'env', value: 'prod' },
    });
    if (!prodPolicy) {
      await prisma.protectionPolicy.create({
        data: {
          policyType: 'LABEL_MATCH',
          key: 'env',
          value: 'prod',
          description: 'Protect env=prod',
          isActive: true,
        },
      });
    }
  });

  it('should detect resource as protected if labeled env=prod', async () => {
    const evaluation = await policyService.evaluateResourceProtection(
      'some-vm-id',
      { env: 'prod', role: 'db' },
      false
    );

    expect(evaluation.isProtected).toBe(true);
    expect(evaluation.reason).toContain('env=prod');
  });

  it('should detect resource as protected if manually locked', async () => {
    const evaluation = await policyService.evaluateResourceProtection(
      'some-vm-id',
      { env: 'dev' },
      true,
      'Crucial development database'
    );

    expect(evaluation.isProtected).toBe(true);
    expect(evaluation.reason).toBe('Crucial development database');
  });

  it('should allow non-production unprotected resources', async () => {
    const evaluation = await policyService.evaluateResourceProtection(
      'some-vm-id',
      { env: 'dev', app: 'api' },
      false
    );

    expect(evaluation.isProtected).toBe(false);
  });
});
