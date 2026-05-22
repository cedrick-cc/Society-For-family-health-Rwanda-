const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const profileSelect = {
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

const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: profileSelect,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      department,
      emailNotifications,
      programUpdates,
      volunteerActivity,
      skills,
      certifications,
      volunteerOpsStatus,
      yearsOfExperience,
      volunteerDistrict,
      bio,
    } = req.body;

    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    let data = {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(emailNotifications !== undefined ? { emailNotifications: Boolean(emailNotifications) } : {}),
      ...(programUpdates !== undefined ? { programUpdates: Boolean(programUpdates) } : {}),
      ...(volunteerActivity !== undefined ? { volunteerActivity: Boolean(volunteerActivity) } : {}),
    };

    if (me?.role === 'VOLUNTEER') {
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

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: profileSelect,
    });

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update profile.' });
  }
};

const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded. Use field name profileImage.' });
    }

    const relativePath = `/uploads/profile-images/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { profileImage: relativePath },
      select: profileSelect,
    });

    return res.status(200).json({
      message: 'Profile photo updated successfully.',
      profileImage: relativePath,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to upload profile photo.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to change password.' });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  uploadPhoto,
  changePassword,
};
