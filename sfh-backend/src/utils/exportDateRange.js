/**
 * Resolve export filter window from period + calendar month/year (frontend selectors).
 */
function parseExportDateRange({ period = 'monthly', month, year, week } = {}) {
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
    const weekNum = Number(week);
    const validWeek = Number.isFinite(weekNum) && weekNum >= 1 && weekNum <= 5 ? weekNum : 1;
    const lastDayOfMonth = new Date(useYear, useMonth + 1, 0).getDate();
    const weekStartDays = [1, 8, 15, 22, 29];
    const startDay = weekStartDays[validWeek - 1];
    const endDay = validWeek === 5 ? lastDayOfMonth : startDay + 6;
    start = new Date(useYear, useMonth, startDay, 0, 0, 0, 0);
    end = new Date(useYear, useMonth, endDay, 23, 59, 59, 999);
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
