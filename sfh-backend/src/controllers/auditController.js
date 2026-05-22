const auditLogService = require('../services/auditLogService');

const list = async (req, res) => {
  try {
    const items = await auditLogService.listAuditLogs({
      severity: req.query.severity,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load audit logs.' });
  }
};

module.exports = { list };
