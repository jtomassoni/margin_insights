import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure the owner test business exists: 921steak
  const business = await prisma.business.upsert({
    where: { slug: '921steak' },
    update: { name: '921steak' },
    create: { name: '921steak', slug: '921steak' },
  });

  // Link any owner user (email "owner") to this business
  const ownerUser = await prisma.user.findFirst({
    where: { email: 'owner' },
  });

  if (ownerUser && ownerUser.businessId !== business.id) {
    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { businessId: business.id },
    });
    console.log(`Linked owner user to business 921steak`);
  } else if (!ownerUser) {
    // Create owner user if missing (for credentials-based owner login)
    await prisma.user.create({
      data: {
        email: 'owner',
        name: 'Owner',
        role: 'owner',
        businessId: business.id,
      },
    });
    console.log(`Created owner user and linked to business 921steak`);
  } else {
    console.log(`Business 921steak ready; owner already linked`);
  }

  // Ensure admin business exists (special company for admin users)
  await prisma.business.upsert({
    where: { slug: 'admin' },
    update: { name: 'admin' },
    create: { name: 'admin', slug: 'admin' },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
