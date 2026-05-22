const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const notificationService = require('../services/notificationService');
const auditLogService = require('../services/auditLogService');
const activityLogService = require('../services/activityLogService');

const prisma = new PrismaClient();

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  department: true,
  emailNotifications: true,
  programUpdates: true,
  volunteerActivity: true,
  mustChangePassword: true,
  profileImage: true,
  lastLogin: true,
  createdAt: true,
  skills: true,
  certifications: true,
  volunteerOpsStatus: true,
  yearsOfExperience: true,
  volunteerDistrict: true,
  bio: true,
};

const generateRandomPassword = () => Math.random().toString(36).slice(-10);

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

const getPendingUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pending users.' });
  }
};

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: safeUserSelect,
    });

    await notificationService.createNotification(id, {
      type: 'VOLUNTEER_APPROVED',
      category: 'USER',
      title: 'Account approved',
      body: 'Your volunteer registration was approved. You can now sign in to SFH OMS.',
      linkPath: '/login',
    });
    await auditLogService.logAudit(req, {
      action: 'USER_APPROVAL',
      module: 'USER_MANAGEMENT',
      description: `Approved user ${updatedUser.email}`,
      userId: req.user?.userId,
      userName: req.user?.name,
      targetType: 'USER',
      targetId: id,
    });
    await activityLogService.logActivity({
      actionType: 'USER_APPROVAL',
      description: `Approved user ${updatedUser.name}`,
      userId: req.user?.userId,
      targetType: 'USER',
      targetId: id,
    });

    return res.status(200).json({
      message: 'User approved successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(404).json({ message: 'User not found.' });
  }
};

const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: safeUserSelect,
    });

    await auditLogService.logAudit(req, {
      action: 'USER_REJECTION',
      module: 'USER_MANAGEMENT',
      severity: 'WARNING',
      description: `Rejected user ${updatedUser.email}`,
      userId: req.user?.userId,
      targetType: 'USER',
      targetId: id,
    });

    return res.status(200).json({
      message: 'User rejected successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(404).json({ message: 'User not found.' });
  }
};

const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: safeUserSelect,
    });

    return res.status(200).json({
      message: 'User deactivated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(404).json({ message: 'User not found.' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const temporaryPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: true },
      select: { id: true },
    });

    await notificationService.createNotification(id, {
      type: 'PASSWORD_RESET',
      title: 'Password reset',
      body: 'Your password was reset by an administrator. Use the temporary password provided by your admin on next login.',
    });

    return res.status(200).json({
      message: 'Password reset successfully.',
      temporaryPassword,
    });
  } catch (error) {
    return res.status(404).json({ message: 'User not found.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      department,
      role,
      status,
      skills,
      certifications,
      volunteerOpsStatus,
      yearsOfExperience,
      volunteerDistrict,
      bio,
    } = req.body;

    const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let data = {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(status !== undefined ? { status } : {}),
    };

    if (existing.role === 'VOLUNTEER') {
      if (skills !== undefined) {
        data.skills = Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean) : [];
      }
      if (certifications !== undefined) {
        data.certifications = Array.isArray(certifications)
          ? certifications.map((s) => String(s).trim()).filter(Boolean)
          : [];
      }
      if (volunteerOpsStatus !== undefined) {
        if (!['AVAILABLE', 'ASSIGNED', 'ON_LEAVE'].includes(volunteerOpsStatus)) {
          return res.status(400).json({ message: 'Invalid volunteerOpsStatus.' });
        }
        data.volunteerOpsStatus = volunteerOpsStatus;
      }
      if (yearsOfExperience !== undefined) {
        data.yearsOfExperience = Math.max(0, Math.min(80, Number(yearsOfExperience) || 0));
      }
      if (volunteerDistrict !== undefined) {
        data.volunteerDistrict = volunteerDistrict ? String(volunteerDistrict).trim() : null;
      }
      if (bio !== undefined) {
        data.bio = bio ? String(bio).trim() : null;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });

    return res.status(200).json({
      message: 'User updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return res.status(404).json({ message: 'User not found or invalid update data.' });
  }
};

module.exports = {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  resetUserPassword,
  updateUser,
};
