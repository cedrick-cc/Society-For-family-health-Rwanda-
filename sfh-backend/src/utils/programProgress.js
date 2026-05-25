/**
 * Shared program completion % (used by exports and mirrors frontend entityMappers).
 */
function computeProgramProgress({ status, startDate, endDate, progress }) {
  const st = String(status || 'PLANNED').toLowerCase();
  let pct = Math.min(100, Math.max(0, Number(progress) || 0));
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (st === 'completed') {
    pct = Math.max(pct, 100);
  } else if (st === 'ongoing' && end > start && !Number(progress)) {
    pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  } else if (st === 'planned' && !Number(progress)) {
    pct = Math.min(pct, 15);
  }
  return pct;
}

module.exports = { computeProgramProgress };
