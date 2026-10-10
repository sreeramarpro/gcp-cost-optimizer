import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial protection policies and system configuration...');

  // Default protection policies: production tags
  const policies = [
    {
      policyType: 'LABEL_MATCH',
      key: 'env',
      value: 'prod',
      description: 'Protect all instances labeled env=prod from automated stop schedules',
      isActive: true,
    },
    {
      policyType: 'LABEL_MATCH',
      key: 'environment',
      value: 'production',
      description: 'Protect all instances labeled environment=production',
      isActive: true,
    },
    {
      policyType: 'LABEL_MATCH',
      key: 'protected',
      value: 'true',
      description: 'Protect any resource explicitly tagged protected=true',
      isActive: true,
    },
    {
      policyType: 'LABEL_MATCH',
      key: 'cost-optimizer',
      value: 'exempt',
      description: 'Exempt resource from automated optimization policies',
      isActive: true,
    },
  ];

  for (const policy of policies) {
    const existing = await prisma.protectionPolicy.findFirst({
      where: {
        policyType: policy.policyType,
        key: policy.key,
        value: policy.value,
      },
    });

    if (!existing) {
      await prisma.protectionPolicy.create({ data: policy });
    }
  }

  // Initial System Configuration
  const configs = [
    { key: 'global_dry_run', value: 'true' },
    { key: 'scheduler_enabled', value: 'true' },
    { key: 'default_timezone', value: 'UTC' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
