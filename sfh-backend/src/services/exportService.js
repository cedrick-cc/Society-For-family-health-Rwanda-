const { PrismaClient } = require('@prisma/client');
const { computeProgramStatus } = require('../utils/programStatus');
const { computeProgramProgress } = require('../utils/programProgress');
const { parseExportDateRange, createdAtInRange } = require('../utils/exportDateRange');
const { resolveEvidencePath, readJpegForPdf } = require('../utils/pdfImageEmbed');

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

function computeImageDrawSize(imgRef, pageWidth, pageHeight, marginLeft, marginRight) {
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxImgWidth = Math.floor(contentWidth * 0.875);
  const srcW = imgRef.width || 400;
  const srcH = imgRef.height || 300;
  const aspect = srcH / srcW;
  let imgW = maxImgWidth;
  let imgH = Math.floor(imgW * aspect);
  const maxImgHeight = Math.floor(pageHeight * 0.55);
  if (imgH > maxImgHeight) {
    imgH = maxImgHeight;
    imgW = Math.floor(imgH / aspect);
  }
  const imgX = marginLeft + Math.floor((contentWidth - imgW) / 2);
  return { imgW, imgH, imgX, blockHeight: imgH + 20 };
}

function assembleMultiPagePdf(pageStreams, imageObjects, pageWidth, pageHeight) {
  const objects = [];

  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const imageIds = {};
  imageObjects.forEach((img, idx) => {
    const name = `Im${idx + 1}`;
    imageIds[name] = addObject(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.buffer.length} >>\nstream\n${img.buffer.toString('binary')}\nendstream`
    );
  });

  const xobjDict =
    imageObjects.length > 0
      ? `/XObject<< ${imageObjects.map((_, idx) => `/Im${idx + 1} ${imageIds[`Im${idx + 1}`]} 0 R`).join(' ')} >>`
      : '';

  const streamIds = pageStreams.map((streamBody) => {
    const stream = `${streamBody}\n`;
    return addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`);
  });

  const pageIds = streamIds.map(
    (streamId) =>
      addObject(
        `<< /Type /Page /Parent __PAGES__ /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources<< /Font<< /F1 ${fontId} 0 R >> ${xobjDict} >> >>`
      )
  );

  const pagesId = addObject(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  );

  pageIds.forEach((pageId) => {
    objects[pageId - 1] = objects[pageId - 1].replace('__PAGES__', `${pagesId} 0 R`);
  });

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const header = '%PDF-1.4\n';
  const bodyParts = objects.map((body, i) => `${i + 1} 0 obj\n${body}\nendobj\n`);
  let pdfBody = header + bodyParts.join('');
  const xrefOffset = Buffer.byteLength(pdfBody, 'binary');
  const pad = (n) => String(n).padStart(10, '0');
  const offsets = [];
  let pos = Buffer.byteLength(header, 'binary');
  bodyParts.forEach((part) => {
    offsets.push(pos);
    pos += Buffer.byteLength(part, 'binary');
  });
  let xref = `xref\n0 ${objects.length + 1}\n${pad(0)} 65535 f \n`;
  offsets.forEach((off) => {
    xref += `${pad(off)} 00000 n \n`;
  });
  pdfBody += xref;
  pdfBody += `trailer<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdfBody, 'binary');
}

function toFormattedPdf(title, sections, imageObjects = []) {
  const pageHeight = 792;
  const pageWidth = 612;
  const marginLeft = 50;
  const marginRight = 50;
  const marginTop = 50;
  const marginBottom = 50;
  const lineHeight = 14;
  const fontSize = 10;
  const titleSize = 16;

  const pageStreams = [];
  let ops = [];
  let y = pageHeight - marginTop;

  const flushPage = () => {
    if (ops.length > 0) pageStreams.push(ops.join('\n'));
    ops = [];
    y = pageHeight - marginTop;
  };

  const ensureSpace = (needed) => {
    if (y - needed < marginBottom) flushPage();
  };

  const addText = (size, x, text) => {
    ops.push(`BT /F1 ${size} Tf ${x} ${y} Td (${pdfSafe(text)}) Tj ET`);
  };

  ops.push(`BT /F1 ${titleSize} Tf ${marginLeft} ${y} Td (${pdfSafe(title)}) Tj ET`);
  y -= 28;

  sections.forEach((section) => {
    if (section.heading) {
      ensureSpace(24);
      addText(12, marginLeft, section.heading);
      y -= 18;
    }

    if (section.lines) {
      section.lines.forEach((line) => {
        wrapText(line, 88).forEach((wrapped) => {
          ensureSpace(lineHeight);
          addText(fontSize, marginLeft, wrapped);
          y -= lineHeight;
        });
      });
      y -= 6;
    }

    if (section.images) {
      section.images.forEach((imgRef) => {
        const { imgW, imgH, imgX, blockHeight } = computeImageDrawSize(
          imgRef,
          pageWidth,
          pageHeight,
          marginLeft,
          marginRight
        );
        ensureSpace(blockHeight);
        ops.push(`q ${imgW} 0 0 ${imgH} ${imgX} ${y - imgH} cm /${imgRef.name} Do Q`);
        y -= blockHeight;
      });
    }

    if (section.table) {
      const { headers, rows, colWidths } = section.table;
      const widths = colWidths || headers.map(() => Math.floor(500 / headers.length));
      ensureSpace(lineHeight * 2);
      let x = marginLeft;
      headers.forEach((h, i) => {
        ops.push(`BT /F1 ${fontSize} Tf ${x} ${y} Td (${pdfSafe(h)}) Tj ET`);
        x += widths[i];
      });
      y -= lineHeight + 2;

      rows.forEach((row) => {
        ensureSpace(lineHeight * 2);
        x = marginLeft;
        row.forEach((cell, i) => {
          const maxLen = i === row.length - 1 && row.length <= 4 ? 55 : 22;
          wrapText(String(cell ?? ''), maxLen).forEach((line, li) => {
            if (li > 0) y -= lineHeight;
            ensureSpace(lineHeight);
            ops.push(`BT /F1 ${fontSize} Tf ${x} ${y} Td (${pdfSafe(line)}) Tj ET`);
          });
          x += widths[i] || 100;
        });
        y -= lineHeight;
      });
      y -= 8;
    }
  });

  flushPage();
  if (pageStreams.length === 0) {
    ops.push(`BT /F1 ${fontSize} Tf ${marginLeft} ${pageHeight - marginTop} Td (No content.) Tj ET`);
    pageStreams.push(ops.join('\n'));
  }

  return assembleMultiPagePdf(pageStreams, imageObjects, pageWidth, pageHeight);
}

async function resolveFieldReportImages(evidenceUrls, startIndex = 0) {
  const urls = Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 4) : [];
  const lines = [];
  const images = [];
  let imgIndex = startIndex;

  for (const url of urls) {
    const fp = resolveEvidencePath(url);
    const loaded = readJpegForPdf(fp);
    if (loaded && loaded.isJpeg) {
      imgIndex += 1;
      const name = `Im${imgIndex}`;
      images.push({ name, buffer: loaded.buffer, width: 400, height: 300 });
      lines.push(`Evidence photo ${imgIndex - startIndex}: embedded below`);
    } else {
      lines.push('Image unavailable');
    }
  }
  return { lines, images, nextIndex: imgIndex };
}

function emptyReportPdf(title, periodLabel) {
  return toFormattedPdf(title, [
    {
      lines: [
        `Generated: ${new Date().toLocaleString('en-GB')}`,
        `Selected period: ${periodLabel}`,
        '',
        'No operational data available for selected period.',
      ],
    },
  ]);
}

async function fetchProgramSummaryReport(dateRange) {
  const { start, end } = dateRange;
  const programs = await prisma.program.findMany({
    include: {
      fieldManager: { select: { name: true } },
      programVolunteers: {
        include: {
          volunteer: { select: { id: true, name: true, status: true } },
        },
      },
      beneficiaries: { select: { id: true } },
      programResources: { include: { resource: { select: { name: true, unit: true } } } },
      fieldReports: {
        where: createdAtInRange({}, start, end),
        include: { volunteer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return programs.filter((p) => {
    const overlap =
      new Date(p.startDate) <= end && new Date(p.endDate) >= start;
    return overlap || (p.fieldReports && p.fieldReports.length > 0);
  });
}

async function fetchVolunteerActivityReport(dateRange) {
  const { start, end } = dateRange;
  return prisma.user.findMany({
    where: { role: 'VOLUNTEER', status: 'ACTIVE' },
    select: {
      name: true,
      email: true,
      volunteerDistrict: true,
      assignedTasks: {
        where: { updatedAt: { gte: start, lte: end } },
        select: { status: true, title: true, updatedAt: true },
      },
      fieldReports: {
        where: createdAtInRange({}, start, end),
        select: { id: true, status: true, createdAt: true, beneficiariesCount: true },
      },
      beneficiariesCreated: {
        where: { registrationDate: { gte: start, lte: end } },
        select: { id: true },
      },
    },
  });
}

async function fetchGeographicCoverageReport(dateRange) {
  const { start, end } = dateRange;
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
        { fieldReports: { some: { createdAt: { gte: start, lte: end } } } },
      ],
    },
    select: { title: true, district: true, sector: true, status: true },
  });
  const reports = await prisma.fieldReport.findMany({
    where: createdAtInRange({}, start, end),
    select: {
      location: true,
      beneficiariesCount: true,
      program: { select: { district: true, sector: true, title: true } },
    },
  });
  return { programs, reports };
}

async function fetchResourceUsageReport(dateRange) {
  const { start, end } = dateRange;
  return prisma.programResource.findMany({
    where: {
      program: {
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
          { fieldReports: { some: { createdAt: { gte: start, lte: end } } } },
        ],
      },
    },
    include: {
      resource: { select: { name: true, unit: true } },
      program: { select: { title: true, district: true } },
    },
  });
}

async function fetchEntityData(entity, dateRange) {
  const { start, end } = dateRange;
  switch (entity) {
    case 'users':
      return prisma.user.findMany({
        where: createdAtInRange({}, start, end),
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      });
    case 'tasks':
      return prisma.task.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          assignedTo: { select: { name: true } },
          program: { select: { title: true } },
        },
      });
    case 'beneficiaries':
      return prisma.beneficiary.findMany({
        where: { registrationDate: { gte: start, lte: end } },
        include: { assignedProgram: { select: { title: true } }, registeredBy: { select: { name: true } } },
      });
    case 'reports':
      return prisma.fieldReport.findMany({
        where: createdAtInRange({}, start, end),
        include: { volunteer: { select: { name: true } }, program: { select: { title: true } } },
      });
    case 'programs':
      return fetchProgramSummaryReport(dateRange);
    case 'inventory':
    case 'resources':
      return fetchResourceUsageReport(dateRange);
    case 'audit':
      return prisma.auditLog.findMany({
        where: createdAtInRange({}, start, end),
        orderBy: { createdAt: 'desc' },
        take: 500,
      });
    default:
      throw new Error('Unknown export entity.');
  }
}

const COLUMN_MAP = {
  audit: [
    { key: 'createdAt', label: 'Time', value: (r) => new Date(r.createdAt).toLocaleString('en-GB') },
    { key: 'action', label: 'Action' },
    { key: 'userName', label: 'User' },
    { key: 'description', label: 'Description' },
  ],
};

async function buildReportPdf(reportType, data, meta) {
  const generated = new Date().toLocaleString('en-GB');
  const periodLabel = meta?.periodLabel || '';
  const allImageObjects = [];

  switch (reportType) {
    case 'program_summary': {
      const programs = data;
      if (!programs.length) {
        return emptyReportPdf('SFH OMS - Program Summary Report', periodLabel);
      }
      const sections = [
        {
          lines: [
            `Generated: ${generated}`,
            `Selected period: ${periodLabel}`,
            `Programs with activity: ${programs.length}`,
          ],
        },
      ];
      for (const p of programs) {
        const status = computeProgramStatus(p.startDate, p.endDate);
        const progress = computeProgramProgress({
          status,
          startDate: p.startDate,
          endDate: p.endDate,
          progress: p.progress,
        });
        const reports = p.fieldReports || [];
        const beneficiariesReached = reports.reduce((s, r) => s + (r.beneficiariesCount || 0), 0);
        sections.push({
          heading: 'Program Information',
          lines: [
            `Title: ${p.title}`,
            `Type: ${p.programType} | Status: ${status}`,
            `District/Sectors: ${p.district}${p.sector ? `, ${p.sector}` : ''}`,
            `Objectives: ${(p.description || '').slice(0, 220)}`,
            `Dates: ${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`,
            `Field manager: ${p.fieldManager?.name || 'N/A'}`,
          ],
        });
        sections.push({
          heading: 'Operational Metrics',
          lines: [
            `Beneficiaries reached (period reports): ${beneficiariesReached}`,
            `Volunteers assigned: ${(p.programVolunteers || []).length}`,
            `Completion progress: ${progress}%`,
            `Resources used: ${
              (p.programResources || [])
                .map((pr) => `${pr.resource?.name}: ${pr.quantityUsed}/${pr.quantityAssigned}`)
                .join('; ') || 'None'
            }`,
          ],
        });
        const volRows = (p.programVolunteers || []).map((pv) => {
          const v = pv.volunteer;
          const volReports = reports.filter((fr) => fr.volunteer?.id === v?.id);
          const served = volReports.reduce((s, r) => s + (r.beneficiariesCount || 0), 0);
          return [v?.name || '-', v?.status || '-', String(served), String(volReports.length)];
        });
        if (volRows.length) {
          sections.push({
            table: {
              headers: ['Volunteer', 'Status', 'Beneficiaries served', 'Reports submitted'],
              rows: volRows,
              colWidths: [130, 70, 120, 100],
            },
          });
        }
        const resRows = (p.programResources || []).map((pr) => [
          pr.resource?.name || '-',
          String(pr.quantityAssigned),
          String(pr.quantityUsed),
          String(Math.max(0, pr.quantityAssigned - pr.quantityUsed)),
        ]);
        if (resRows.length) {
          sections.push({
            table: {
              headers: ['Resource', 'Allocated', 'Used', 'Remaining'],
              rows: resRows,
              colWidths: [160, 80, 80, 80],
            },
          });
        }
        let imageCounter = 0;
        for (const fr of reports) {
          const { lines: imgLines, images, nextIndex } = await resolveFieldReportImages(fr.evidenceUrls, imageCounter);
          imageCounter = nextIndex;
          allImageObjects.push(...images);
          sections.push({
            heading: 'Field Report',
            lines: [
              `Volunteer: ${fr.volunteer?.name || 'N/A'}`,
              `Submitted: ${new Date(fr.createdAt).toLocaleString('en-GB')} | Status: ${fr.status}`,
              `Location: ${fr.location}`,
              `Beneficiaries reached: ${fr.beneficiariesCount}`,
              `Notes: ${(fr.notes || '').slice(0, 300)}`,
              ...(images.length === 0 ? ['Evidence: none attached'] : []),
            ],
          });
          if (images.length > 0) {
            sections.push({
              lines: imgLines.length ? imgLines : ['Evidence photos:'],
              images: images.map((img) => ({ name: img.name, width: img.width, height: img.height })),
            });
          }
        }
      }
      return toFormattedPdf('SFH OMS - Program Summary Report', sections, allImageObjects);
    }

    case 'geographic_coverage': {
      const { programs, reports } = data;
      if (!programs.length && !reports.length) {
        return emptyReportPdf('SFH OMS - Geographic Coverage Report', periodLabel);
      }
      const districtMap = {};
      programs.forEach((p) => {
        if (!districtMap[p.district]) {
          districtMap[p.district] = { programs: 0, sectors: new Set(), beneficiaries: 0, reports: 0 };
        }
        districtMap[p.district].programs += 1;
        if (p.sector) districtMap[p.district].sectors.add(p.sector);
      });
      reports.forEach((r) => {
        const d = r.program?.district || 'Unknown';
        if (!districtMap[d]) districtMap[d] = { programs: 0, sectors: new Set(), beneficiaries: 0, reports: 0 };
        districtMap[d].reports += 1;
        districtMap[d].beneficiaries += r.beneficiariesCount || 0;
        if (r.program?.sector) districtMap[d].sectors.add(r.program.sector);
      });
      const sections = [{ lines: [`Generated: ${generated}`, `Period: ${periodLabel}`] }];
      Object.entries(districtMap).forEach(([district, info]) => {
        sections.push({
          heading: district,
          lines: [
            `Programs operating: ${info.programs}`,
            `Field reports: ${info.reports}`,
            `Beneficiaries reached: ${info.beneficiaries}`,
            `Sectors: ${[...info.sectors].join(', ') || 'District-wide'}`,
          ],
        });
      });
      return toFormattedPdf('SFH OMS - Geographic Coverage Report', sections);
    }

    case 'resource_usage': {
      const rows = data;
      if (!rows.length) {
        return emptyReportPdf('SFH OMS - Resource Usage Report', periodLabel);
      }
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
        { lines: [`Generated: ${generated}`, `Period: ${periodLabel}`] },
        {
          table: {
            headers: ['Program', 'Resource', 'Allocated', 'Used', 'Remaining', 'Stock'],
            rows: tableRows,
            colWidths: [110, 100, 60, 50, 70, 50],
          },
        },
      ]);
    }

    case 'volunteer_activity':
    case 'beneficiary_reach':
      return null;

    default:
      return null;
  }
}

function programSummaryCsvRows(programs) {
  return programs.map((p) => {
    const status = computeProgramStatus(p.startDate, p.endDate);
    const reports = p.fieldReports || [];
    const latest = reports[0];
    const resourcesAllocated = (p.programResources || []).reduce((s, pr) => s + pr.quantityAssigned, 0);
    const resourcesUsed = (p.programResources || []).reduce((s, pr) => s + pr.quantityUsed, 0);
    const beneficiariesReached = reports.reduce((s, r) => s + (r.beneficiariesCount || 0), 0);
    return {
      program: p.title,
      district: p.district,
      status,
      volunteersAssigned: (p.programVolunteers || []).length,
      beneficiariesReached,
      resourcesAllocated,
      resourcesUsed,
      fieldReportsCount: reports.length,
      latestReportDate: latest ? new Date(latest.createdAt).toISOString() : '',
    };
  });
}

function geographicCsvRows(data) {
  const { programs, reports } = data;
  const map = {};
  programs.forEach((p) => {
    const key = `${p.district}|${p.sector || ''}`;
    if (!map[key]) {
      map[key] = { district: p.district, sector: p.sector || '', programs: 0, reports: 0, beneficiaries: 0 };
    }
    map[key].programs += 1;
  });
  reports.forEach((r) => {
    const key = `${r.program?.district || 'Unknown'}|${r.program?.sector || ''}`;
    if (!map[key]) {
      map[key] = {
        district: r.program?.district || 'Unknown',
        sector: r.program?.sector || '',
        programs: 0,
        reports: 0,
        beneficiaries: 0,
      };
    }
    map[key].reports += 1;
    map[key].beneficiaries += r.beneficiariesCount || 0;
  });
  return Object.values(map);
}

async function exportData(entity, format, reportType, dateOpts = {}) {
  const dateRange = parseExportDateRange(dateOpts);
  const meta = { periodLabel: dateRange.label };
  let rows;
  let columns = COLUMN_MAP[entity];

  if (reportType === 'volunteer_activity') {
    rows = await fetchVolunteerActivityReport(dateRange);
    entity = 'volunteer_activity';
  } else if (reportType === 'geographic_coverage') {
    rows = await fetchGeographicCoverageReport(dateRange);
    entity = 'geographic_coverage';
  } else if (reportType === 'resource_usage') {
    rows = await fetchResourceUsageReport(dateRange);
    entity = 'resource_usage';
  } else if (reportType === 'program_summary') {
    rows = await fetchProgramSummaryReport(dateRange);
    entity = 'program_summary';
  } else if (reportType === 'beneficiary_reach') {
    rows = await fetchEntityData('beneficiaries', dateRange);
    entity = 'beneficiary_reach';
  } else {
    rows = await fetchEntityData(entity, dateRange);
  }

  if (format === 'csv') {
    if (reportType === 'program_summary') {
      if (!rows.length) {
        const cols = [
          { key: 'message', label: 'Message' },
        ];
        return {
          contentType: 'text/csv',
          filename: 'program_summary.csv',
          body: toCsv([{ message: 'No operational data available for selected period.' }], cols),
        };
      }
      const cols = [
        { key: 'program', label: 'Program' },
        { key: 'district', label: 'District' },
        { key: 'status', label: 'Status' },
        { key: 'volunteersAssigned', label: 'Volunteers Assigned' },
        { key: 'beneficiariesReached', label: 'Beneficiaries Reached' },
        { key: 'resourcesAllocated', label: 'Resources Allocated' },
        { key: 'resourcesUsed', label: 'Resources Used' },
        { key: 'fieldReportsCount', label: 'Field Reports Count' },
        { key: 'latestReportDate', label: 'Latest Report Date' },
      ];
      return {
        contentType: 'text/csv',
        filename: 'program_summary.csv',
        body: toCsv(programSummaryCsvRows(rows), cols),
      };
    }
    if (reportType === 'geographic_coverage') {
      const flat = geographicCsvRows(rows);
      if (!flat.length) {
        return {
          contentType: 'text/csv',
          filename: 'geographic_coverage.csv',
          body: 'District,Sector,Programs Operating,Field Reports,Beneficiaries Reached\n"No operational data available for selected period.",,,,',
        };
      }
      const cols = [
        { key: 'district', label: 'District' },
        { key: 'sector', label: 'Sector' },
        { key: 'programs', label: 'Programs Operating' },
        { key: 'reports', label: 'Field Reports' },
        { key: 'beneficiaries', label: 'Beneficiaries Reached' },
      ];
      return { contentType: 'text/csv', filename: 'geographic_coverage.csv', body: toCsv(flat, cols) };
    }
    if (reportType === 'resource_usage') {
      if (!rows.length) {
        return {
          contentType: 'text/csv',
          filename: 'resource_usage.csv',
          body: 'Program,Resource,Allocated,Used,Remaining,Stock Status\n"No operational data available for selected period.",,,,,',
        };
      }
      const flat = rows.map((pr) => {
        const remaining = Math.max(0, pr.quantityAssigned - pr.quantityUsed);
        const low = remaining <= Math.max(1, Math.floor(pr.quantityAssigned * 0.2)) && pr.quantityAssigned > 0;
        return {
          program: pr.program?.title,
          resource: pr.resource?.name,
          allocated: pr.quantityAssigned,
          used: pr.quantityUsed,
          remaining,
          stockStatus: low ? 'LOW' : 'OK',
        };
      });
      const cols = [
        { key: 'program', label: 'Program' },
        { key: 'resource', label: 'Resource' },
        { key: 'allocated', label: 'Allocated' },
        { key: 'used', label: 'Used' },
        { key: 'remaining', label: 'Remaining' },
        { key: 'stockStatus', label: 'Stock Status' },
      ];
      return { contentType: 'text/csv', filename: 'resource_usage.csv', body: toCsv(flat, cols) };
    }
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
    if (entity === 'audit') {
      columns = COLUMN_MAP.audit;
    }
    if (!rows.length && reportType) {
      return {
        contentType: 'text/csv',
        filename: `${reportType || entity}.csv`,
        body: 'Message\nNo operational data available for selected period.',
      };
    }
    return { contentType: 'text/csv', filename: `${entity}.csv`, body: toCsv(rows, columns || []) };
  }

  const pdfReport = await buildReportPdf(reportType, rows, meta);
  if (pdfReport) {
    return { contentType: 'application/pdf', filename: `${reportType || entity}.pdf`, body: pdfReport };
  }

  if (entity === 'audit') {
    if (!rows.length) {
      return {
        contentType: 'application/pdf',
        filename: 'audit.pdf',
        body: emptyReportPdf('SFH OMS - Audit Log Export', meta.periodLabel),
      };
    }
    return {
      contentType: 'application/pdf',
      filename: 'audit.pdf',
      body: toFormattedPdf('SFH OMS - Audit Log Export', [
        { lines: [`Generated: ${new Date().toLocaleString('en-GB')}`, `Period: ${meta.periodLabel}`] },
        {
          table: {
            headers: ['Time', 'Action', 'User', 'Description'],
            rows: rows.map((r) => [
              new Date(r.createdAt).toLocaleString('en-GB'),
              r.action,
              r.userName || 'System',
              (r.description || '').slice(0, 120),
            ]),
            colWidths: [95, 75, 85, 245],
          },
        },
      ]),
    };
  }

  if (!rows.length) {
    return {
      contentType: 'application/pdf',
      filename: `${entity}.pdf`,
      body: emptyReportPdf(`SFH OMS Export - ${entity}`, meta.periodLabel),
    };
  }

  const sections = [
    { lines: [`Generated: ${new Date().toLocaleString('en-GB')}`, `Period: ${meta.periodLabel}`, `Records: ${rows.length}`] },
    {
      table: {
        headers: (columns || []).map((c) => c.label),
        rows: rows.map((r) =>
          (columns || []).map((c) => {
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

module.exports = { exportData, toFormattedPdf };
