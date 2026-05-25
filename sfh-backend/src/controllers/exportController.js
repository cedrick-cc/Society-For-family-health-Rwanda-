const exportService = require('../services/exportService');
const analyticsService = require('../services/analyticsService');

const ALLOWED = new Set(['users', 'tasks', 'beneficiaries', 'reports', 'programs', 'inventory', 'resources', 'audit', 'analytics']);

const exportEntity = async (req, res) => {
  try {
    const entity = String(req.params.entity || '').toLowerCase();
    const format = String(req.query.format || 'csv').toLowerCase();
    if (!ALLOWED.has(entity)) {
      return res.status(400).json({ message: 'Invalid export entity.' });
    }
    if (!['csv', 'pdf'].includes(format)) {
      return res.status(400).json({ message: 'format must be csv or pdf.' });
    }

    let result;
    if (entity === 'analytics') {
      const data = await analyticsService.getAnalytics(req.query.period || 'monthly');
      const summaryRows = Object.entries(data.summary).map(([key, value]) => ({
        metric: key,
        value: String(value),
      }));
      if (format === 'csv') {
        const body = `metric,value\n${summaryRows.map((r) => `${r.metric},${r.value}`).join('\n')}`;
        result = { contentType: 'text/csv', filename: 'analytics.csv', body };
      } else {
        result = {
          contentType: 'application/pdf',
          filename: 'analytics.pdf',
          body: exportService.toFormattedPdf('SFH OMS - Analytics Summary', [
            { lines: [`Period: ${data.period}`] },
            {
              table: {
                headers: ['Metric', 'Value'],
                rows: summaryRows.map((r) => [r.metric, r.value]),
              },
            },
          ]),
        };
      }
    } else {
      const reportType = req.query.reportType || null;
      result = await exportService.exportData(entity, format, reportType, {
        period: req.query.period,
        month: req.query.month,
        year: req.query.year,
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.body);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Export failed.' });
  }
};

module.exports = { exportEntity };
