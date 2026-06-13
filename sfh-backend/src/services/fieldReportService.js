const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { reportDir } = require('../middleware/uploadFieldReport');

const prisma = new PrismaClient();

function getFileHash(filePath) {
  return new Promise((resolve) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

const reportInclude = {
  volunteer: { select: { id: true, name: true, email: true } },
  program: { select: { id: true, title: true, district: true } },
  task: { select: { id: true, title: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

async function assertVolunteerOnProgram(volunteerId, programId) {
  const row = await prisma.programVolunteer.findUnique({
    where: { programId_volunteerId: { programId, volunteerId } },
    select: { id: true },
  });
  if (!row) {
    const err = new Error('You are not assigned to this program.');
    err.statusCode = 403;
    throw err;
  }
}

async function submitReport({
  volunteerId,
  programId,
  taskId,
  location,
  latitude,
  longitude,
  beneficiariesCount,
  notes,
  activityOutcome,
  evidenceUrls,
}) {
  await assertVolunteerOnProgram(volunteerId, programId);

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        programId,
        assignedToId: volunteerId,
      },
      select: { id: true },
    });
    if (!task) {
      const err = new Error('Invalid task for this program or volunteer.');
      err.statusCode = 400;
      throw err;
    }
  }

  const loc = String(location || '').trim();
  if (!loc) {
    throw new Error('location description is required.');
  }

  let lat = null;
  let lng = null;
  if (latitude !== undefined && latitude !== null && String(latitude).trim() !== '') {
    lat = Number(latitude);
    if (Number.isNaN(lat)) throw new Error('latitude must be a valid number.');
  }
  if (longitude !== undefined && longitude !== null && String(longitude).trim() !== '') {
    lng = Number(longitude);
    if (Number.isNaN(lng)) throw new Error('longitude must be a valid number.');
  }
  if ((lat == null) !== (lng == null)) {
    throw new Error('Provide both latitude and longitude, or leave both empty.');
  }

  const hashes = [];
  const urls = Array.isArray(evidenceUrls) ? evidenceUrls.map(String) : [];
  for (const url of urls) {
    const filename = path.basename(url);
    const filePath = path.join(reportDir, filename);
    const hash = await getFileHash(filePath);
    if (hash) {
      const duplicate = await prisma.fieldReport.findFirst({
        where: {
          imageHashes: {
            has: hash,
          },
        },
        select: { id: true },
      });
      if (duplicate) {
        // Cleanup all uploaded files
        for (const u of urls) {
          const fn = path.basename(u);
          const fp = path.join(reportDir, fn);
          try {
            if (fs.existsSync(fp)) {
              fs.unlinkSync(fp);
            }
          } catch (err) {
            // ignore
          }
        }
        const err = new Error('This image has already been submitted in a previous field report. Please upload a different image.');
        err.statusCode = 400;
        throw err;
      }
      hashes.push(hash);
    }
  }

  const report = await prisma.fieldReport.create({
    data: {
      volunteerId,
      programId,
      taskId: taskId || null,
      location: loc,
      latitude: lat,
      longitude: lng,
      beneficiariesCount: Math.max(0, Number(beneficiariesCount) || 0),
      notes: String(notes || '').trim(),
      activityOutcome: activityOutcome ? String(activityOutcome).trim() : null,
      evidenceUrls: urls,
      imageHashes: hashes,
      status: 'PENDING',
    },
    include: reportInclude,
  });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { title: true, fieldManagerId: true },
  });

  const recipients = [];
  if (program?.fieldManagerId) recipients.push(program.fieldManagerId);

  const coordinators = await prisma.user.findMany({
    where: { role: 'COORDINATOR', status: 'ACTIVE' },
    select: { id: true },
  });
  coordinators.forEach((c) => recipients.push(c.id));

  await notificationService.notifyMany(recipients, {
    type: 'FIELD_REPORT_SUBMITTED',
    title: 'Field report submitted',
    body: `${report.volunteer.name} submitted a report for ${program?.title || 'a program'}.`,
  });

  return report;
}

async function listMine(volunteerId) {
  return prisma.fieldReport.findMany({
    where: { volunteerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: reportInclude,
  });
}

async function listPendingForReview(userId, role) {
  const where = { status: 'PENDING' };
  if (role === 'COORDINATOR') {
    where.program = { createdById: userId };
  }
  return prisma.fieldReport.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: reportInclude,
  });
}

async function listRecent(limit = 20, userId, role) {
  const where = role === 'COORDINATOR' ? { program: { createdById: userId } } : {};
  return prisma.fieldReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: reportInclude,
  });
}

async function reviewReport(reportId, reviewerId, reviewerRole, decision, reviewNotes) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new Error('decision must be APPROVED or REJECTED.');
  }

  const report = await prisma.fieldReport.findUnique({
    where: { id: reportId },
    include: {
      volunteer: { select: { id: true, name: true } },
      program: { select: { id: true, createdById: true } },
    },
  });
  if (!report) {
    const err = new Error('Report not found.');
    err.statusCode = 404;
    throw err;
  }
  if (reviewerRole === 'COORDINATOR' && report.program?.createdById !== reviewerId) {
    const err = new Error('You can only review reports for programs you own.');
    err.statusCode = 403;
    throw err;
  }
  if (report.status !== 'PENDING') {
    throw new Error('Report has already been reviewed.');
  }

  const notes = reviewNotes != null ? String(reviewNotes).trim() : '';

  const updated = await prisma.fieldReport.update({
    where: { id: reportId },
    data: {
      status: decision,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    },
    include: reportInclude,
  });

  const bodySuffix = notes ? ` Notes: ${notes.slice(0, 200)}${notes.length > 200 ? '…' : ''}` : '';

  await notificationService.createNotification(report.volunteerId, {
    type: decision === 'APPROVED' ? 'FIELD_REPORT_APPROVED' : 'FIELD_REPORT_REJECTED',
    title: decision === 'APPROVED' ? 'Field report approved' : 'Field report rejected',
    body:
      decision === 'APPROVED'
        ? `Your field report was approved.${bodySuffix}`
        : `Your field report was rejected.${bodySuffix || ' Please review feedback and resubmit if needed.'}`,
  });

  return updated;
}

module.exports = {
  submitReport,
  listMine,
  listPendingForReview,
  listRecent,
  reviewReport,
  reportInclude,
};
