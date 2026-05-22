const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');

const prisma = new PrismaClient();

function escapeCsv(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/** Strip non-WinAnsi chars for basic PDF fonts (fixes UTF-8 mojibake) */
function pdfSafe(text) {
  return String(text ?? '')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?');
}

function wrapText(text, maxChars = 90) {
  const safe = pdfSafe(text);
  const words = safe.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word.length > maxChars ? word.slice(0, maxChars) : word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/**
 * Lightweight multi-page PDF with title, sections, and table rows.
 */
function toFormattedPdf(title, sections) {
  const pageHeight = 792;
  const marginLeft = 50;
  const lineHeight = 14;
  const fontSize = 10;
  const titleSize = 16;
  let y = pageHeight - 50;
  const pages = [];

  const flushPage = () => {
    pages.push({ yStart: y });
    y = pageHeight - 50;
  };

  const ensureSpace = (needed) => {
    if (y - needed < 50) flushPage();
  };

  const contentOps = [];
  contentOps.push(`BT /F1 ${titleSize} Tf ${marginLeft} ${y} Td (${pdfSafe(title)}) Tj ET`);
  y -= 28;

  sections.forEach((section) => {
    if (section.heading) {
      ensureSpace(24);
      contentOps.push(`BT /F1 12 Tf ${marginLeft} ${y} Td (${pdfSafe(section.heading)}) Tj ET`);
      y -= 18;
    }

    if (section.lines) {
      section.lines.forEach((line) => {
        wrapText(line, 85).forEach((wrapped) => {
          ensureSpace(lineHeight);
          contentOps.push(`BT /F1 ${fontSize} Tf ${marginLeft} ${y} Td (${pdfSafe(wrapped)}) Tj ET`);
          y -= lineHeight;
        });
      });
      y -= 6;
    }

    if (section.table) {
      const { headers, rows } = section.table;
      ensureSpace(lineHeight * 2);
      const colWidth = Math.floor(500 / headers.length);
      let x = marginLeft;
      headers.forEach((h, i) => {
        contentOps.push(`BT /F1 ${fontSize} Tf ${x + i * colWidth} ${y} Td (${pdfSafe(h)}) Tj ET`);
      });
      y -= lineHeight + 2;

      rows.forEach((row) => {
        ensureSpace(lineHeight);
        row.forEach((cell, i) => {
          const cellText = pdfSafe(String(cell ?? '').slice(0, 28));
          contentOps.push(`BT /F1 ${fontSize} Tf ${marginLeft + i * colWidth} ${y} Td (${cellText}) Tj ET`);
        });
        y -= lineHeight;
      });
      y -= 8;
    }
  });

  const streamBody = contentOps.join('\n');
  const stream = `${streamBody}\n`;
  const streamLen = Buffer.byteLength(stream, 'utf8');

  return Buffer.from(`%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${streamLen} >>stream
${stream}endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000400 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF`);
}

function toSimplePdf(title, lines) {
  return toFormattedPdf(title, [{ lines }]);
}

async function fetchProgramSummaryReport() {
  return prisma.program.findMany({
    include: {
      fieldManager: { select: { name: true } },
      programVolunteers: { include: { volunteer: { select: { name: true, email: true } } } },
      beneficiaries: { select: { id: true } },
      programResources: { include: { resource: { select: { name: true, unit: true } } } },
      fieldReports: {
        include: { volunteer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
    orderBy: { startDate: 'desc' },
  });
}

async function fetchVolunteerActivityReport() {
  const volunteers = await prisma.user.findMany({
    where: { role: 'VOLUNTEER', status: 'ACTIVE' },
    select: {
      name: true,
      email: true,
      volunteerDistrict: true,
      assignedTasks: {
        select: { status: true, title: true, updatedAt: true },
      },
      fieldReports: { select: { id: true, status: true, createdAt: true } },
      beneficiariesCreated: { select: { id: true } },
    },
  });
  return volunteers;
}

async function fetchGeographicCoverageReport() {
  const programs = await prisma.program.findMany({
    select: { title: true, district: true, sector: true, status: true, startDate: true, endDate: true },
  });
  const reports = await prisma.fieldReport.findMany({
    select: { location: true, program: { select: { district: true, title: true } } },
    take: 200,
  });
  return { programs, reports };
}

async function fetchResourceUsageReport() {
  return prisma.programResource.findMany({
    include: {
      resource: { select: { name: true, unit: true, quantityAvailable: true, lowStockThreshold: true } },
      program: { select: { title: true, district: true } },
    },
  });
}

async function fetchEntityData(entity) {
  switch (entity) {
    case 'users':
      return prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      });
    case 'tasks':
      return prisma.task.findMany({
        include: {
          assignedTo: { select: { name: true } },
          program: { select: { title: true } },
        },
      });
    case 'beneficiaries':
      return prisma.beneficiary.findMany({
        include: { assignedProgram: { select: { title: true } }, registeredBy: { select: { name: true } } },
      });
    case 'reports':
      return prisma.fieldReport.findMany({
        include: { volunteer: { select: { name: true } }, program: { select: { title: true } } },
      });
    case 'programs':
      return fetchProgramSummaryReport();
    case 'inventory':
    case 'resources':
      return fetchResourceUsageReport();
    case 'audit':
      return prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    default:
      throw new Error('Unknown export entity.');
  }
}

const COLUMN_MAP = {
  users: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created', value: (r) => new Date(r.createdAt).toISOString() },
  ],
  tasks: [
    { key: 'title', label: 'Title' },
    { label: 'Assignee', value: (r) => r.assignedTo?.name },
    { label: 'Program', value: (r) => r.program?.title },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Due', value: (r) => new Date(r.dueDate).toISOString() },
  ],
  beneficiaries: [
    { key: 'fullName', label: 'Name' },
    { key: 'district', label: 'District' },
    { label: 'Program', value: (r) => r.assignedProgram?.title },
    { label: 'Registered By', value: (r) => r.registeredBy?.name },
    { key: 'registrationDate', label: 'Registered', value: (r) => new Date(r.registrationDate).toISOString() },
  ],
  reports: [
    { label: 'Volunteer', value: (r) => r.volunteer?.name },
    { label: 'Program', value: (r) => r.program?.title },
    { key: 'status', label: 'Status' },
    { key: 'beneficiariesCount', label: 'Beneficiaries' },
    { key: 'createdAt', label: 'Submitted', value: (r) => new Date(r.createdAt).toISOString() },
  ],
  programs: [
    { key: 'title', label: 'Title' },
    { key: 'district', label: 'District' },
    { key: 'programType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { label: 'Field Manager', value: (r) => r.fieldManager?.name },
  ],
  resources: [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'quantityAvailable', label: 'Stock' },
    { key: 'unit', label: 'Unit' },
  ],
  inventory: [
    { label: 'Program', value: (r) => r.program?.title },
    { label: 'Resource', value: (r) => r.resource?.name },
    { key: 'quantityAssigned', label: 'Assigned' },
    { key: 'quantityUsed', label: 'Used' },
    {
      label: 'Remaining',
      value: (r) => Math.max(0, r.quantityAssigned - r.quantityUsed),
    },
  ],
  audit: [
    { key: 'action', label: 'Action' },
    { key: 'module', label: 'Module' },
    { key: 'severity', label: 'Severity' },
    { key: 'description', label: 'Description' },
    { key: 'userName', label: 'User' },
    { key: 'createdAt', label: 'Time', value: (r) => new Date(r.createdAt).toISOString() },
  ],
};

function buildReportPdf(reportType, data) {
  const generated = new Date().toLocaleString('en-GB');

  switch (reportType) {
    case 'program_summary': {
      const programs = data;
      const sections = [
        { lines: [`Generated: ${generated}`, `Total programs: ${programs.length}`] },
      ];
      programs.forEach((p) => {
        const status = computeProgramStatus(p.startDate, p.endDate);
        const volunteers = (p.programVolunteers || []).map((pv) => pv.volunteer?.name).filter(Boolean).join(', ');
        const resources = (p.programResources || [])
          .map((pr) => `${pr.resource?.name}: ${pr.quantityUsed}/${pr.quantityAssigned}`)
          .join('; ');
        const reports = (p.fieldReports || [])
          .slice(0, 5)
          .map((fr) => `${fr.volunteer?.name || 'Volunteer'} - ${fr.status} (${fr.beneficiariesCount} reached)`)
          .join('; ');
        sections.push({
          heading: p.title,
          lines: [
            `District: ${p.district}${p.sector ? `, ${p.sector}` : ''}`,
            `Type: ${p.programType} | Status: ${status}`,
            `Dates: ${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`,
            `Field manager: ${p.fieldManager?.name || 'N/A'}`,
            `Beneficiaries reached: ${(p.beneficiaries || []).length} (target ${p.targetBeneficiaries || 0})`,
            `Volunteers: ${volunteers || 'None assigned'}`,
            `Resources: ${resources || 'None'}`,
            `Recent field reports: ${reports || 'None'}`,
            `Description: ${(p.description || '').slice(0, 200)}`,
          ],
        });
      });
      return toFormattedPdf('SFH OMS - Program Summary Report', sections);
    }

    case 'volunteer_activity': {
      const volunteers = data;
      const sections = [{ lines: [`Generated: ${generated}`, `Active volunteers: ${volunteers.length}`] }];
      volunteers.forEach((v) => {
        const completed = (v.assignedTasks || []).filter((t) => t.status === 'COMPLETED').length;
        const reports = (v.fieldReports || []).length;
        const beneficiaries = (v.beneficiariesCreated || []).length;
        sections.push({
          heading: v.name,
          lines: [
            `Email: ${v.email} | District: ${v.volunteerDistrict || 'N/A'}`,
            `Tasks completed: ${completed}`,
            `Field reports submitted: ${reports}`,
            `Beneficiaries registered: ${beneficiaries}`,
          ],
        });
      });
      return toFormattedPdf('SFH OMS - Volunteer Activity Report', sections);
    }

    case 'geographic_coverage': {
      const { programs, reports } = data;
      const districtMap = {};
      programs.forEach((p) => {
        if (!districtMap[p.district]) districtMap[p.district] = { programs: [], sectors: new Set() };
        districtMap[p.district].programs.push(p.title);
        if (p.sector) districtMap[p.district].sectors.add(p.sector);
      });
      const sections = [{ lines: [`Generated: ${generated}`] }];
      Object.entries(districtMap).forEach(([district, info]) => {
        const reportCount = reports.filter((r) => r.program?.district === district).length;
        sections.push({
          heading: district,
          lines: [
            `Programs (${info.programs.length}): ${info.programs.join(', ').slice(0, 120)}`,
            `Sectors: ${[...info.sectors].join(', ') || 'District-wide'}`,
            `Field report locations: ${reportCount}`,
          ],
        });
      });
      return toFormattedPdf('SFH OMS - Geographic Coverage Report', sections);
    }

    case 'resource_usage': {
      const rows = data;
      const tableRows = rows.map((pr) => {
        const remaining = Math.max(0, pr.quantityAssigned - pr.quantityUsed);
        const low = remaining <= Math.max(1, Math.floor(pr.quantityAssigned * 0.2)) && pr.quantityAssigned > 0;
        return [
          pr.program?.title || '-',
          pr.resource?.name || '-',
          String(pr.quantityAssigned),
          String(pr.quantityUsed),
          String(remaining),
          low ? 'LOW' : 'OK',
        ];
      });
      return toFormattedPdf('SFH OMS - Resource Usage Report', [
        { lines: [`Generated: ${generated}`] },
        {
          table: {
            headers: ['Program', 'Resource', 'Allocated', 'Used', 'Remaining', 'Stock'],
            rows: tableRows,
          },
        },
      ]);
    }

    case 'beneficiary_reach': {
      const rows = data;
      return toFormattedPdf('SFH OMS - Beneficiary Reach Report', [
        { lines: [`Generated: ${generated}`, `Total: ${rows.length}`] },
        {
          table: {
            headers: ['Name', 'District', 'Program', 'Registered'],
            rows: rows.map((b) => [
              b.fullName,
              b.district,
              b.assignedProgram?.title || '-',
              new Date(b.registrationDate).toLocaleDateString(),
            ]),
          },
        },
      ]);
    }

    default:
      return null;
  }
}

async function exportData(entity, format, reportType) {
  let rows;
  let columns = COLUMN_MAP[entity] || COLUMN_MAP.resources;

  if (reportType === 'volunteer_activity') {
    rows = await fetchVolunteerActivityReport();
    entity = 'volunteer_activity';
  } else if (reportType === 'geographic_coverage') {
    rows = await fetchGeographicCoverageReport();
    entity = 'geographic_coverage';
  } else if (reportType === 'resource_usage') {
    rows = await fetchResourceUsageReport();
    entity = 'resource_usage';
  } else if (reportType === 'program_summary') {
    rows = await fetchProgramSummaryReport();
    entity = 'program_summary';
  } else if (reportType === 'beneficiary_reach') {
    rows = await fetchEntityData('beneficiaries');
    entity = 'beneficiary_reach';
  } else {
    rows = await fetchEntityData(entity);
  }

  if (format === 'csv') {
    if (['program_summary', 'volunteer_activity', 'geographic_coverage', 'resource_usage', 'beneficiary_reach'].includes(reportType)) {
      if (reportType === 'geographic_coverage') {
        const { programs } = rows;
        const geoCols = [
          { key: 'title', label: 'Program' },
          { key: 'district', label: 'District' },
          { key: 'sector', label: 'Sector' },
        ];
        return { contentType: 'text/csv', filename: 'geographic_coverage.csv', body: toCsv(programs, geoCols) };
      }
      columns = COLUMN_MAP[reportType === 'resource_usage' ? 'inventory' : entity] || columns;
      if (reportType === 'volunteer_activity') {
        const flat = rows.map((v) => ({
          name: v.name,
          email: v.email,
          district: v.volunteerDistrict,
          tasksCompleted: (v.assignedTasks || []).filter((t) => t.status === 'COMPLETED').length,
          reports: (v.fieldReports || []).length,
          beneficiaries: (v.beneficiariesCreated || []).length,
        }));
        const vCols = [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'district', label: 'District' },
          { key: 'tasksCompleted', label: 'Tasks Completed' },
          { key: 'reports', label: 'Field Reports' },
          { key: 'beneficiaries', label: 'Beneficiaries Registered' },
        ];
        return { contentType: 'text/csv', filename: 'volunteer_activity.csv', body: toCsv(flat, vCols) };
      }
    }
    return { contentType: 'text/csv', filename: `${entity}.csv`, body: toCsv(rows, columns) };
  }

  const pdfReport = buildReportPdf(reportType, rows);
  if (pdfReport) {
    return { contentType: 'application/pdf', filename: `${reportType || entity}.pdf`, body: pdfReport };
  }

  const sections = [
    { lines: [`Generated: ${new Date().toLocaleString('en-GB')}`, `Records: ${rows.length}`] },
    {
      table: {
        headers: columns.map((c) => c.label),
        rows: rows.map((r) =>
          columns.map((c) => {
            const val = typeof c.value === 'function' ? c.value(r) : r[c.key];
            return val === null || val === undefined ? '' : String(val);
          })
        ),
      },
    },
  ];

  return {
    contentType: 'application/pdf',
    filename: `${entity}.pdf`,
    body: toFormattedPdf(`SFH OMS Export - ${entity}`, sections),
  };
}

module.exports = { exportData, toSimplePdf, toFormattedPdf };
