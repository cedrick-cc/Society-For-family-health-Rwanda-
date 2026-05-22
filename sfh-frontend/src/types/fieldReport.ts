export interface FieldReport {
  id: string;
  taskId: string;
  taskName: string;
  program: string;
  programId?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  beneficiariesServed: number;
  description: string;
  photos: string[];
  /** Volunteer-reported activity outcome */
  status: 'completed' | 'partial' | 'cancelled';
  /** Coordinator review workflow */
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  volunteerName?: string;
  activityOutcome?: string;
  reviewNotes?: string;
  reviewerName?: string;
  submittedAtIso?: string;
}

export const mockFieldReports: FieldReport[] = [];
