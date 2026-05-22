require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAdmin() {
  const hashedPassword = await bcrypt.hash('12345', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sfh.org.rw' },
    update: {
      name: 'System Admin',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      name: 'System Admin',
      email: 'admin@sfh.org.rw',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Admin user is ready:', admin.email);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin user:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
