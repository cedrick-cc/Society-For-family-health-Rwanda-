/**
 * Canonical Rwanda administrative divisions for SFH OMS forms.
 * Districts and sectors used across program creation, beneficiary registration, and volunteer profiles.
 */

export const RWANDA_DISTRICTS = [
  'Kigali City', 'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo', 'Gisagara', 'Huye', 'Kamonyi',
  'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango', 'Karongi', 'Ngororero',
  'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro',
] as const;

export type RwandaDistrict = (typeof RWANDA_DISTRICTS)[number];

/** Sectors by district — representative sector lists for program/beneficiary targeting */
export const SECTORS_BY_DISTRICT: Record<string, string[]> = {
  'Kigali City': ['Gasabo', 'Kicukiro', 'Nyarugenge', 'Gisozi', 'Remera', 'Kimironko'],
  Bugesera: ['Nyamata', 'Rilima', 'Kanzenze', 'Gashora', 'Juru', 'Mareba'],
  Gatsibo: ['Kabarore', 'Kageyo', 'Gatunda', 'Remera', 'Rugarama', 'Rwimbibi'],
  Kayonza: ['Gahini', 'Kabare', 'Kabarondo', 'Mukarange', 'Murama', 'Ndego'],
  Kirehe: ['Gahara', 'Gatore', 'Kigarama', 'Kigina', 'Mahama', 'Mpanga'],
  Ngoma: ['Gashanda', 'Jarama', 'Karembo', 'Kazo', 'Mutenderi', 'Remera'],
  Nyagatare: ['Gatunda', 'Karangazi', 'Katabagemu', 'Matimba', 'Mimuri', 'Nyagatare'],
  Rwamagana: ['Fumbwe', 'Gahengeri', 'Karenge', 'Kigabiro', 'Muhazi', 'Rwamagana'],
  Burera: ['Bungwe', 'Butaro', 'Cyanika', 'Gahunga', 'Gatebe', 'Gitovu'],
  Gakenke: ['Busengo', 'Coko', 'Cyabingo', 'Gakenke', 'Gashenyi', 'Janja'],
  Gicumbi: ['Bukure', 'Bwisige', 'Byumba', 'Cyumba', 'Giti', 'Kaniga'],
  Musanze: ['Busogo', 'Gacaca', 'Gashaki', 'Kinigi', 'Muhoza', 'Remera'],
  Rulindo: ['Base', 'Burega', 'Cyinzuzi', 'Cyungo', 'Kinihira', 'Murambi'],
  Gisagara: ['Gikonko', 'Gishubi', 'Kibirizi', 'Mamba', 'Muganza', 'Musha'],
  Huye: ['Gishamvu', 'Huye', 'Karama', 'Kigoma', 'Mukura', 'Tumba'],
  Kamonyi: ['Gacurabwenge', 'Karama', 'Kayenzi', 'Kayumbu', 'Mugina', 'Rukoma'],
  Muhanga: ['Cyeza', 'Kabacuzi', 'Kibangu', 'Muhanga', 'Nyamabuye', 'Shyogwe'],
  Nyamagabe: ['Buruhukiro', 'Cuanika', 'Gatare', 'Kibirizi', 'Kibumbwe', 'Mugano'],
  Nyanza: ['Busasamana', 'Busoro', 'Cyabakamyi', 'Kibirizi', 'Mukingo', 'Ntyazo'],
  Nyaruguru: ['Cyahinda', 'Kibeho', 'Kivu', 'Mata', 'Munini', 'Ngera'],
  Ruhango: ['Bweramana', 'Byimana', 'Kabagali', 'Kinazi', 'Mbuye', 'Ruhango'],
  Karongi: ['Bwishyura', 'Gishyita', 'Gitesi', 'Mubuga', 'Murundi', 'Rubengera'],
  Ngororero: ['Bwira', 'Gatumba', 'Hindiro', 'Kabatwa', 'Matyazo', 'Ngororero'],
  Nyabihu: ['Bigogwe', 'Jenda', 'Jomba', 'Kabatwa', 'Karago', 'Rugera'],
  Nyamasheke: ['Bushekeri', 'Bushenge', 'Cyato', 'Gihombo', 'Kagano', 'Kanjongo'],
  Rubavu: ['Bugeshi', 'Busasamana', 'Gisenyi', 'Kanama', 'Mudende', 'Nyakiriba'],
  Rusizi: ['Bugarama', 'Butare', 'Gashonga', 'Giheke', 'Kamembe', 'Muganza'],
  Rutsiro: ['Boneza', 'Gihango', 'Kigeyo', 'Manihira', 'Mukura', 'Rusebeya'],
};

export const BENEFICIARY_CATEGORIES = [
  'General Population',
  'Women of Reproductive Age',
  'Pregnant Women',
  'Children Under 5',
  'Adolescents (10-19)',
  'People Living with HIV',
  'Vulnerable Households',
] as const;

export function getSectorsForDistricts(districts: string[]): string[] {
  const set = new Set<string>();
  districts.forEach((d) => {
    (SECTORS_BY_DISTRICT[d] || []).forEach((s) => set.add(s));
  });
  return Array.from(set).sort();
}

/** Extract birth year from Rwanda national ID (16 digits, positions 2-5 = YY century logic) */
export function birthYearFromRwandaNationalId(nationalId: string): number | null {
  const cleaned = nationalId.replace(/\D/g, '');
  if (cleaned.length !== 16) return null;
  const yy = parseInt(cleaned.slice(1, 5), 10);
  if (!Number.isFinite(yy)) return null;
  return yy;
}

export function ageFromRwandaNationalId(nationalId: string, referenceDate = new Date()): number | null {
  const birthYear = birthYearFromRwandaNationalId(nationalId);
  if (birthYear === null) return null;
  const refYear = referenceDate.getFullYear();
  const age = refYear - birthYear;
  if (age < 0 || age > 130) return null;
  return age;
}

export function validateNationalIdFormat(nationalId: string): boolean {
  return /^\d{16}$/.test(nationalId.replace(/\s/g, ''));
}
