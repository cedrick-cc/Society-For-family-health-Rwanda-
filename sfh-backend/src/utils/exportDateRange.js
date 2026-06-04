/**
 * Resolve export filter window from period + calendar month/year (frontend selectors).
 */
function parseExportDateRange({ period = 'monthly', month, year } = {}) {
  const y = Number(year);
  const m = Number(month);
  const now = new Date();
  const useYear = Number.isFinite(y) ? y : now.getFullYear();
  const useMonth = Number.isFinite(m) && m >= 0 && m <= 11 ? m : now.getMonth();

  let start;
  let end;

  if (period === 'yearly') {
    start = new Date(useYear, 0, 1, 0, 0, 0, 0);
    end = new Date(useYear, 11, 31, 23, 59, 59, 999);
  } else if (period === 'weekly') {
    end = new Date(useYear, useMonth + 1, 0, 23, 59, 59, 999);
    if (end > now) end = new Date(now);
    start = new Date(end);
    start.setDate(start.getDate() - 6);
    if (start.getMonth() !== useMonth) {
      start = new Date(useYear, useMonth, 1, 0, 0, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(useYear, useMonth, 1, 0, 0, 0, 0);
    end = new Date(useYear, useMonth + 1, 0, 23, 59, 59, 999);
  }

  const label =
    period === 'yearly'
      ? `${useYear}`
      : period === 'weekly'
        ? `${start.toLocaleDateString('en-GB')} – ${end.toLocaleDateString('en-GB')}`
        : `${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  return { start, end, label, period };
}

function createdAtInRange(where = {}, start, end) {
  return {
    ...where,
    createdAt: { gte: start, lte: end },
  };
}

module.exports = { parseExportDateRange, createdAtInRange };
