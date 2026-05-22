/** Mirrors backend `ProgramType` enum */
export type ProgramTypeKey =
  | 'HIV_AIDS_AWARENESS'
  | 'MATERNAL_HEALTH'
  | 'FAMILY_PLANNING'
  | 'CHILD_NUTRITION'
  | 'VACCINATION_CAMPAIGN';

export const PROGRAM_TYPE_LABELS: Record<ProgramTypeKey, string> = {
  HIV_AIDS_AWARENESS: 'HIV/AIDS Awareness',
  MATERNAL_HEALTH: 'Maternal Health',
  FAMILY_PLANNING: 'Family Planning',
  CHILD_NUTRITION: 'Child Nutrition',
  VACCINATION_CAMPAIGN: 'Vaccination Campaign',
};

export type HealthResourceOption = { key: string; label: string };

export const HEALTH_RESOURCES_BY_TYPE: Record<ProgramTypeKey, HealthResourceOption[]> = {
  HIV_AIDS_AWARENESS: [
    { key: 'MALE_CONDOMS', label: 'Male Condoms' },
    { key: 'FEMALE_CONDOMS', label: 'Female Condoms' },
    { key: 'HIV_TEST_KITS', label: 'HIV Test Kits' },
    { key: 'PREP_MEDICATION', label: 'PrEP Medication' },
    { key: 'PEP_MEDICATION', label: 'PEP Medication' },
    { key: 'AWARENESS_BROCHURES', label: 'Awareness Brochures' },
  ],
  MATERNAL_HEALTH: [
    { key: 'PRENATAL_KITS', label: 'Prenatal Kits' },
    { key: 'IRON_SUPPLEMENTS', label: 'Iron Supplements' },
    { key: 'MATERNAL_HEALTH_GUIDES', label: 'Maternal Health Guides' },
    { key: 'DELIVERY_KITS', label: 'Delivery Kits' },
  ],
  FAMILY_PLANNING: [
    { key: 'CONTRACEPTIVE_PILLS', label: 'Contraceptive Pills' },
    { key: 'CONDOMS_FP', label: 'Condoms' },
    { key: 'INJECTABLES', label: 'Injectables' },
    { key: 'IUD_KITS', label: 'IUD Kits' },
  ],
  CHILD_NUTRITION: [
    { key: 'NUTRITION_SUPPLEMENTS', label: 'Nutrition Supplements' },
    { key: 'GROWTH_MONITORING_CARDS', label: 'Growth Monitoring Cards' },
    { key: 'VITAMIN_A_SUPPLEMENTS', label: 'Vitamin A Supplements' },
  ],
  VACCINATION_CAMPAIGN: [
    { key: 'VACCINES', label: 'Vaccines' },
    { key: 'SYRINGES', label: 'Syringes' },
    { key: 'COLD_STORAGE_KITS', label: 'Cold Storage Kits' },
    { key: 'VACCINATION_CARDS', label: 'Vaccination Cards' },
  ],
};

const labelByKey = new Map<string, string>();
(Object.keys(HEALTH_RESOURCES_BY_TYPE) as ProgramTypeKey[]).forEach((pt) => {
  HEALTH_RESOURCES_BY_TYPE[pt].forEach((r) => labelByKey.set(r.key, r.label));
});

export function resourceKeyToLabel(key: string): string {
  return labelByKey.get(key) || key.replace(/_/g, ' ');
}

export function labelsForResourceKeys(keys: string[]): string[] {
  return keys.map((k) => resourceKeyToLabel(k));
}
