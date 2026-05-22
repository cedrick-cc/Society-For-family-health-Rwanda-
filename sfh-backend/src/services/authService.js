const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

const generateRandomPassword = () => {
  return Math.random().toString(36).slice(-10);
};

const registerVolunteer = async ({ name, email, password }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already in use.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'VOLUNTEER',
      status: 'PENDING',
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
  });
  await notificationService.notifyMany(
    admins.map((a) => a.id),
    {
      type: 'VOLUNTEER_REGISTRATION',
      title: 'New volunteer registration',
      body: `${name} (${email}) submitted a registration pending approval.`,
    }
  );

  return {
    message: 'Registration submitted. Await admin approval.',
  };
};

const auditLogService = require('./auditLogService');
const activityLogService = require('./activityLogService');

const loginUser = async ({ email, password }, req) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    throw new Error('Invalid email or password.');
  }

  const passwordMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatch) {
    throw new Error('Invalid email or password.');
  }

  if (existingUser.status !== 'ACTIVE') {
    throw new Error('Account is not active yet.');
  }

  const user = await prisma.user.update({
    where: { id: existingUser.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  await auditLogService.logAudit(req, {
    action: 'LOGIN',
    module: 'AUTH',
    description: `User logged in: ${user.email}`,
    userId: user.id,
    userName: user.name,
    targetType: 'USER',
    targetId: user.id,
  });
  await activityLogService.logActivity({
    actionType: 'LOGIN',
    description: `${user.name} signed in`,
    userId: user.id,
    targetType: 'USER',
    targetId: user.id,
  });

  return {
    token,
    mustChangePassword: user.mustChangePassword,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      profileImage: user.profileImage,
    },
  };
};

const createUserByAdmin = async ({ name, email, role, department }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already in use.');
  }

  const generatedPassword = generateRandomPassword();
  const hashedPassword = await bcrypt.hash(generatedPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      status: 'ACTIVE',
      department: department || null,
      mustChangePassword: true,
    },
    select: {
      id: true,
      email: true,
    },
  });

  await notificationService.createNotification(newUser.id, {
    type: 'USER_CREATED',
    title: 'Your SFH OMS account',
    body: 'An administrator created your account. Sign in with your email and the temporary password shared with you.',
  });

  return {
    email: newUser.email,
    password: generatedPassword,
  };
};

module.exports = {
  registerVolunteer,
  loginUser,
  createUserByAdmin,
};
