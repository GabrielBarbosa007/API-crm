import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

const plans = [
  {
    name: 'start',
    displayName: 'Start',
    price: '0',
    maxUsers: 2,
    maxDeals: 50,
    maxPipelines: 1,
    maxContacts: 500,
    maxAutomations: 5,
    features: ['basic_crm'],
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: '49',
    maxUsers: 10,
    maxDeals: 500,
    maxPipelines: 5,
    maxContacts: 5000,
    maxAutomations: 25,
    features: ['basic_crm', 'automation', 'reports'],
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: '199',
    maxUsers: 999,
    maxDeals: 9999,
    maxPipelines: 50,
    maxContacts: 100000,
    maxAutomations: 999,
    features: ['basic_crm', 'automation', 'reports', 'sso', 'priority_support'],
  },
];

async function generateUniqueSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50);

  let slug = base || 'organization';
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        displayName: plan.displayName,
        price: plan.price,
        maxUsers: plan.maxUsers,
        maxDeals: plan.maxDeals,
        maxPipelines: plan.maxPipelines,
        maxContacts: plan.maxContacts,
        maxAutomations: plan.maxAutomations,
        features: plan.features,
      },
      create: plan,
    });
  }

  const testEmail = 'demo@berrycrm.local';
  const existingUser = await prisma.user.findUnique({ where: { email: testEmail } });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('Password123', 10);

    const workspace = await prisma.workspace.create({
      data: { name: 'Demo Workspace' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Demo User',
        email: testEmail,
        passwordHash,
        workspaceId: workspace.id,
      },
    });

    const plan = await prisma.plan.findUnique({ where: { name: 'start' } });

    if (plan) {
      const organizationName = 'Demo Organization';
      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          slug: await generateUniqueSlug(organizationName),
          planId: plan.id,
          members: {
            create: {
              userId: user.id,
              role: Role.OWNER,
            },
          },
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { activeOrganizationId: organization.id },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
