import { prisma } from '../database';

export interface ProtectionEvaluation {
  isProtected: boolean;
  reason?: string;
  matchedPolicyId?: string;
}

export class PolicyService {
  /**
   * Evaluates whether a resource is protected against automated shutdown actions.
   */
  async evaluateResourceProtection(
    resourceId: string,
    labelsRecord?: Record<string, string>,
    explicitProtectedFlag?: boolean,
    explicitReason?: string | null
  ): Promise<ProtectionEvaluation> {
    // 1. Check explicit protection lock on resource
    if (explicitProtectedFlag) {
      return {
        isProtected: true,
        reason: explicitReason || 'Resource is manually flagged as protected by administrator.',
      };
    }

    // 2. Load active protection policies from DB
    const policies = await prisma.protectionPolicy.findMany({
      where: { isActive: true },
    });

    let labels: Record<string, string> = labelsRecord || {};
    if (!labelsRecord) {
      const dbResource = await prisma.cloudResource.findUnique({
        where: { id: resourceId },
      });
      if (dbResource) {
        if (dbResource.isProtected) {
          return {
            isProtected: true,
            reason: dbResource.protectionReason || 'Manually protected in database.',
          };
        }
        try {
          labels = JSON.parse(dbResource.labels);
        } catch {
          labels = {};
        }
      }
    }

    // 3. Evaluate each policy rule
    for (const policy of policies) {
      if (policy.policyType === 'LABEL_MATCH' && policy.key) {
        const val = labels[policy.key];
        if (val !== undefined) {
          if (!policy.value || val.toLowerCase() === policy.value.toLowerCase()) {
            return {
              isProtected: true,
              reason: `Protected by policy rule: "${policy.description}" (matched label ${policy.key}=${val})`,
              matchedPolicyId: policy.id,
            };
          }
        }
      } else if (policy.policyType === 'NAME_PREFIX' && policy.value) {
        const dbRes = await prisma.cloudResource.findUnique({ where: { id: resourceId } });
        if (dbRes && dbRes.name.toLowerCase().startsWith(policy.value.toLowerCase())) {
          return {
            isProtected: true,
            reason: `Protected by policy rule: "${policy.description}" (name starts with ${policy.value})`,
            matchedPolicyId: policy.id,
          };
        }
      }
    }

    return {
      isProtected: false,
    };
  }

  async listPolicies() {
    return prisma.protectionPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPolicy(data: {
    policyType: string;
    key?: string;
    value?: string;
    description: string;
    isActive?: boolean;
  }) {
    return prisma.protectionPolicy.create({
      data: {
        policyType: data.policyType,
        key: data.key,
        value: data.value,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async togglePolicy(id: string, isActive: boolean) {
    return prisma.protectionPolicy.update({
      where: { id },
      data: { isActive },
    });
  }

  async deletePolicy(id: string) {
    return prisma.protectionPolicy.delete({
      where: { id },
    });
  }
}

export const policyService = new PolicyService();
