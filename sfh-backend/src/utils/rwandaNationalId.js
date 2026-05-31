/** Rwanda National ID helpers — 16-digit ID, birth year at positions 2-5 (1-indexed). */

function normalizeNationalId(value) {
  return String(value || '').replace(/\D/g, '');
}

function birthYearFromNationalId(nationalId) {
  const cleaned = normalizeNationalId(nationalId);
  if (cleaned.length !== 16) return null;
  const year = parseInt(cleaned.slice(1, 5), 10);
  if (!Number.isFinite(year) || year < 1900 || year > new Date().getFullYear()) return null;
  return year;
}

function ageFromNationalId(nationalId, referenceDate = new Date()) {
  const birthYear = birthYearFromNationalId(nationalId);
  if (birthYear === null) return null;
  const age = referenceDate.getFullYear() - birthYear;
  if (age < 0 || age > 130) return null;
  return age;
}

function isValidNationalIdFormat(nationalId) {
  return normalizeNationalId(nationalId).length === 16;
}

module.exports = {
  normalizeNationalId,
  birthYearFromNationalId,
  ageFromNationalId,
  isValidNationalIdFormat,
};
