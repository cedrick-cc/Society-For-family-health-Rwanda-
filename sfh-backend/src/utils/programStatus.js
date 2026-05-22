/**
 * Derives operational program status from dates (no manual override).
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {Date} [now]
 * @returns {'PLANNED'|'ONGOING'|'COMPLETED'}
 */
function computeProgramStatus(startDate, endDate, now = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const t = now.getTime();
  if (t < start.getTime()) return 'PLANNED';
  if (t > end.getTime()) return 'COMPLETED';
  return 'ONGOING';
}

module.exports = { computeProgramStatus };
