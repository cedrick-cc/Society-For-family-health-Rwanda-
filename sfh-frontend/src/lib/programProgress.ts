export type ProgramStatusUI = 'planned' | 'ongoing' | 'completed';

/**
 * Shared program completion % — used by Outreach Programs, Geographic map, and modals.
 */
export function computeProgramProgress(
  status: ProgramStatusUI,
  startDate: string,
  endDate: string,
  apiProgress?: number
): number {
  let progress = Math.min(100, Math.max(0, Number(apiProgress) || 0));
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();

  if (status === 'completed') {
    progress = Math.max(progress, 100);
  } else if (status === 'ongoing' && end > start && !Number(apiProgress)) {
    progress = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  } else if (status === 'planned' && !Number(apiProgress)) {
    progress = Math.min(progress, 15);
  }
  return progress;
}
