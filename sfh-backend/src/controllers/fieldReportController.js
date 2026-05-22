const fieldReportService = require('../services/fieldReportService');

const submit = async (req, res) => {
  try {
    if (req.user.role !== 'VOLUNTEER') {
      return res.status(403).json({ message: 'Only volunteers may submit field reports.' });
    }
    const files = req.files || [];
    const evidenceUrls = files.map((f) => `/uploads/field-reports/${f.filename}`);
    const {
      programId,
      taskId,
      location,
      latitude,
      longitude,
      beneficiariesCount,
      notes,
      activityOutcome,
    } = req.body;

    const report = await fieldReportService.submitReport({
      volunteerId: req.user.userId,
      programId,
      taskId: taskId || null,
      location,
      latitude,
      longitude,
      beneficiariesCount,
      notes,
      activityOutcome,
      evidenceUrls,
    });
    return res.status(201).json(report);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Failed to submit report.' });
  }
};

const listMine = async (req, res) => {
  try {
    if (req.user.role !== 'VOLUNTEER') {
      return res.status(403).json({ message: 'Volunteers only.' });
    }
    const rows = await fieldReportService.listMine(req.user.userId);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load reports.' });
  }
};

const listPending = async (req, res) => {
  try {
    const rows = await fieldReportService.listPendingForReview();
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load pending reports.' });
  }
};

const listRecent = async (req, res) => {
  try {
    const rows = await fieldReportService.listRecent(25);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load reports.' });
  }
};

const review = async (req, res) => {
  try {
    const { decision, reviewNotes } = req.body;
    const updated = await fieldReportService.reviewReport(req.params.id, req.user.userId, decision, reviewNotes);
    return res.status(200).json(updated);
  } catch (error) {
    const code = error.statusCode || 400;
    return res.status(code).json({ message: error.message || 'Review failed.' });
  }
};

module.exports = { submit, listMine, listPending, listRecent, review };
