const { PrismaClient } = require('@prisma/client');
const { ageFromNationalId, isValidNationalIdFormat } = require('../utils/rwandaNationalId');

const prisma = new PrismaClient();

const beneficiaryInclude = {
  assignedProgram: { select: { id: true, title: true, district: true, status: true } },
  registeredBy: { select: { id: true, name: true, email: true } },
};

const normalizeServices = (services) => {
  if (services === undefined || services === null) return [];
  if (Array.isArray(services)) return services.map((s) => String(s).trim()).filter(Boolean);
  if (typeof services === 'string') {
    return services
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

async function assertProgramAccess(assignedProgramId, user) {
  if (!assignedProgramId) {
    if (user.role === 'VOLUNTEER' || user.role === 'FIELD_MANAGER') {
      throw new Error('assignedProgramId is required for your role.');
    }
    return;
  }
  if (user.role === 'VOLUNTEER') {
    const link = await prisma.programVolunteer.findUnique({
      where: { programId_volunteerId: { programId: assignedProgramId, volunteerId: user.userId } },
    });
    if (!link) throw new Error('You can only register beneficiaries under your assigned programs.');
  }
  if (user.role === 'FIELD_MANAGER') {
    const program = await prisma.program.findFirst({
      where: { id: assignedProgramId, fieldManagerId: user.userId },
    });
    if (!program) throw new Error('You can only register beneficiaries for programs you manage.');
  }
}

async function validateBeneficiaryAgeForProgram(assignedProgramId, ageNum, nationalId) {
  if (!assignedProgramId) return ageNum;

  const program = await prisma.program.findUnique({
    where: { id: assignedProgramId },
    select: { minAge: true, maxAge: true, title: true },
  });
  if (!program) throw new Error('assignedProgramId does not match an existing program.');

  let effectiveAge = ageNum;
  if (nationalId) {
    if (!isValidNationalIdFormat(nationalId)) {
      throw new Error('nationalId must be a valid 16-digit Rwanda national ID.');
    }
    const derived = ageFromNationalId(nationalId);
    if (derived !== null) effectiveAge = derived;
  }

  if (program.minAge != null && effectiveAge < program.minAge) {
    throw new Error(
      `Beneficiary age (${effectiveAge}) is below the program minimum age (${program.minAge}) for ${program.title}.`
    );
  }
  if (program.maxAge != null && effectiveAge > program.maxAge) {
    throw new Error(
      `Beneficiary age (${effectiveAge}) exceeds the program maximum age (${program.maxAge}) for ${program.title}.`
    );
  }
  return effectiveAge;
}

const createBeneficiary = async (data, registeredById, user) => {
  const {
    fullName,
    gender,
    age,
    nationalId,
    phone,
    district,
    sector,
    village,
    riskLevel,
    householdSize,
    servicesReceived,
    assignedProgramId,
  } = data;

  if (!fullName || !gender || age === undefined || age === null || !district) {
    throw new Error('fullName, gender, age, and district are required.');
  }

  const ageNum = Number(age);
  if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130) {
    throw new Error('age must be a valid number.');
  }

  if (assignedProgramId) {
    const program = await prisma.program.findUnique({ where: { id: assignedProgramId } });
    if (!program) throw new Error('assignedProgramId does not match an existing program.');
  }

  if (user) await assertProgramAccess(assignedProgramId, user);

  const validatedAge = await validateBeneficiaryAgeForProgram(assignedProgramId, ageNum, nationalId);

  const row = await prisma.beneficiary.create({
    data: {
      fullName: String(fullName).trim(),
      gender: String(gender).trim(),
      age: validatedAge,
      nationalId: nationalId ? String(nationalId).replace(/\D/g, '') : null,
      phone: phone ? String(phone).trim() : null,
      district: String(district).trim(),
      sector: sector ? String(sector).trim() : null,
      village: village ? String(village).trim() : null,
      riskLevel: riskLevel ? String(riskLevel).trim().toLowerCase() : 'medium',
      householdSize: Math.max(1, Number(householdSize) || 1),
      servicesReceived: normalizeServices(servicesReceived),
      assignedProgramId: assignedProgramId || null,
      registeredById,
    },
    include: beneficiaryInclude,
  });

  const activityLogService = require('./activityLogService');
  const auditLogService = require('./auditLogService');
  await activityLogService.logActivity({
    actionType: 'BENEFICIARY_REGISTRATION',
    description: `Beneficiary registered: ${row.fullName}`,
    userId: registeredById,
    targetType: 'BENEFICIARY',
    targetId: row.id,
  });
  await auditLogService.logAudit(null, {
    action: 'BENEFICIARY_CREATE',
    module: 'BENEFICIARIES',
    description: `Registered beneficiary ${row.fullName}`,
    userId: registeredById,
    targetType: 'BENEFICIARY',
    targetId: row.id,
  });

  return row;
};

const listBeneficiaries = async () => {
  return prisma.beneficiary.findMany({
    include: beneficiaryInclude,
    orderBy: { registrationDate: 'desc' },
  });
};

const getBeneficiaryById = async (id) => {
  return prisma.beneficiary.findUnique({
    where: { id },
    include: beneficiaryInclude,
  });
};

const updateBeneficiary = async (id, data) => {
  const existing = await prisma.beneficiary.findUnique({ where: { id } });
  if (!existing) throw new Error('Beneficiary not found.');

  const payload = {};
  if (data.fullName !== undefined) payload.fullName = String(data.fullName).trim();
  if (data.gender !== undefined) payload.gender = String(data.gender).trim();
  if (data.age !== undefined) {
    const ageNum = Number(data.age);
    if (!Number.isFinite(ageNum) || ageNum < 0) throw new Error('Invalid age.');
    payload.age = ageNum;
  }
  if (data.phone !== undefined) payload.phone = data.phone ? String(data.phone).trim() : null;
  if (data.district !== undefined) payload.district = String(data.district).trim();
  if (data.sector !== undefined) payload.sector = data.sector ? String(data.sector).trim() : null;
  if (data.village !== undefined) payload.village = data.village ? String(data.village).trim() : null;
  if (data.riskLevel !== undefined) payload.riskLevel = String(data.riskLevel).trim().toLowerCase();
  if (data.householdSize !== undefined) payload.householdSize = Math.max(1, Number(data.householdSize) || 1);
  if (data.servicesReceived !== undefined) payload.servicesReceived = normalizeServices(data.servicesReceived);
  if (data.assignedProgramId !== undefined) {
    if (data.assignedProgramId) {
      const program = await prisma.program.findUnique({ where: { id: data.assignedProgramId } });
      if (!program) throw new Error('assignedProgramId does not match an existing program.');
    }
    payload.assignedProgramId = data.assignedProgramId || null;
  }
  if (data.status !== undefined) payload.status = String(data.status).trim().toLowerCase();
  if (data.lastVisit !== undefined) {
    payload.lastVisit = data.lastVisit ? new Date(data.lastVisit) : null;
  }

  return prisma.beneficiary.update({
    where: { id },
    data: payload,
    include: beneficiaryInclude,
  });
};

const deleteBeneficiary = async (id) => {
  const existing = await prisma.beneficiary.findUnique({ where: { id } });
  if (!existing) throw new Error('Beneficiary not found.');
  await prisma.beneficiary.delete({ where: { id } });
  return { message: 'Beneficiary deleted successfully.' };
};

module.exports = {
  createBeneficiary,
  listBeneficiaries,
  getBeneficiaryById,
  updateBeneficiary,
  deleteBeneficiary,
};
