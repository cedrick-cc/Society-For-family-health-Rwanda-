/** localStorage keys for volunteer form drafts */
export const BENEFICIARY_REGISTRATION_DRAFT_KEY = 'beneficiaryRegistrationDraft';
export const FIELD_REPORT_DRAFT_KEY = 'fieldReportDraft';

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore quota or privacy errors
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
