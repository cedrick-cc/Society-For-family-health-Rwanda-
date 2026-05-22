/** Default inventory items per program type — mirrors frontend programResources.ts */
const DEFAULT_RESOURCES = [
  { resourceKey: 'MALE_CONDOMS', name: 'Male Condoms', category: 'HIV_AIDS_AWARENESS', unit: 'pieces' },
  { resourceKey: 'FEMALE_CONDOMS', name: 'Female Condoms', category: 'HIV_AIDS_AWARENESS', unit: 'pieces' },
  { resourceKey: 'HIV_TEST_KITS', name: 'HIV Test Kits', category: 'HIV_AIDS_AWARENESS', unit: 'kits' },
  { resourceKey: 'PREP_MEDICATION', name: 'PrEP Medication', category: 'HIV_AIDS_AWARENESS', unit: 'doses' },
  { resourceKey: 'PEP_MEDICATION', name: 'PEP Medication', category: 'HIV_AIDS_AWARENESS', unit: 'doses' },
  { resourceKey: 'AWARENESS_BROCHURES', name: 'Awareness Brochures', category: 'HIV_AIDS_AWARENESS', unit: 'pieces' },
  { resourceKey: 'PRENATAL_KITS', name: 'Prenatal Kits', category: 'MATERNAL_HEALTH', unit: 'kits' },
  { resourceKey: 'IRON_SUPPLEMENTS', name: 'Iron Supplements', category: 'MATERNAL_HEALTH', unit: 'bottles' },
  { resourceKey: 'MATERNAL_HEALTH_GUIDES', name: 'Maternal Health Guides', category: 'MATERNAL_HEALTH', unit: 'pieces' },
  { resourceKey: 'DELIVERY_KITS', name: 'Delivery Kits', category: 'MATERNAL_HEALTH', unit: 'kits' },
  { resourceKey: 'CONTRACEPTIVE_PILLS', name: 'Contraceptive Pills', category: 'FAMILY_PLANNING', unit: 'packs' },
  { resourceKey: 'CONDOMS_FP', name: 'Condoms', category: 'FAMILY_PLANNING', unit: 'pieces' },
  { resourceKey: 'INJECTABLES', name: 'Injectables', category: 'FAMILY_PLANNING', unit: 'doses' },
  { resourceKey: 'IUD_KITS', name: 'IUD Kits', category: 'FAMILY_PLANNING', unit: 'kits' },
  { resourceKey: 'NUTRITION_SUPPLEMENTS', name: 'Nutrition Supplements', category: 'CHILD_NUTRITION', unit: 'packs' },
  { resourceKey: 'GROWTH_MONITORING_CARDS', name: 'Growth Monitoring Cards', category: 'CHILD_NUTRITION', unit: 'cards' },
  { resourceKey: 'VITAMIN_A_SUPPLEMENTS', name: 'Vitamin A Supplements', category: 'CHILD_NUTRITION', unit: 'doses' },
  { resourceKey: 'VACCINES', name: 'Vaccines', category: 'VACCINATION_CAMPAIGN', unit: 'doses' },
  { resourceKey: 'SYRINGES', name: 'Syringes', category: 'VACCINATION_CAMPAIGN', unit: 'pieces' },
  { resourceKey: 'COLD_STORAGE_KITS', name: 'Cold Storage Kits', category: 'VACCINATION_CAMPAIGN', unit: 'kits' },
  { resourceKey: 'VACCINATION_CARDS', name: 'Vaccination Cards', category: 'VACCINATION_CAMPAIGN', unit: 'cards' },
];

module.exports = { DEFAULT_RESOURCES };
