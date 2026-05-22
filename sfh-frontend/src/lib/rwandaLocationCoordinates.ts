/**
 * Lightweight Rwanda location coordinates for map markers and coverage circles.
 * District centroids + major sector coordinates (no GIS polygons).
 */

export type LatLng = [number, number];

/** All 30 districts — canonical names match program forms */
export const DISTRICT_COORDINATES: Record<string, LatLng> = {
  'Kigali City': [-1.9501, 30.0588],
  Bugesera: [-2.1554, 30.2031],
  Gatsibo: [-1.6728, 30.4347],
  Kayonza: [-1.8589, 30.5976],
  Kirehe: [-2.1658, 30.6439],
  Ngoma: [-2.1803, 30.4769],
  Nyagatare: [-1.2978, 30.3256],
  Rwamagana: [-1.9489, 30.4347],
  Burera: [-1.4603, 29.8311],
  Gakenke: [-1.6961, 29.7812],
  Gicumbi: [-1.5897, 30.0649],
  Musanze: [-1.4991, 29.6347],
  Rulindo: [-1.7185, 29.9943],
  Gisagara: [-2.4842, 29.9851],
  Huye: [-2.5956, 29.7422],
  Kamonyi: [-2.0071, 29.8778],
  Muhanga: [-2.0842, 29.7523],
  Nyamagabe: [-2.4845, 29.5612],
  Nyanza: [-2.3496, 29.7402],
  Nyaruguru: [-2.5881, 29.3502],
  Ruhango: [-2.2302, 29.8767],
  Karongi: [-2.0751, 29.3487],
  Ngororero: [-1.8921, 29.6404],
  Nyabihu: [-1.5892, 29.4601],
  Nyamasheke: [-2.3221, 29.2551],
  Rubavu: [-1.6763, 29.2601],
  Rusizi: [-2.4845, 28.9071],
  Rutsiro: [-2.0765, 29.2565],
};

/** Major sectors — key format: "District|Sector" (case-insensitive lookup) */
export const SECTOR_COORDINATES: Record<string, LatLng> = {
  'Kigali City|Gasabo': [-1.9147, 30.1254],
  'Kigali City|Kicukiro': [-1.9742, 30.1048],
  'Kigali City|Nyarugenge': [-1.9436, 30.0594],
  'Kigali City|Gisozi': [-1.9368, 30.0821],
  'Kigali City|Remera': [-1.9594, 30.1125],
  'Kigali City|Kimironko': [-1.9298, 30.1012],
  'Bugesera|Nyamata': [-2.1534, 30.1968],
  'Huye|Tumba': [-2.6089, 29.7389],
  'Musanze|Muhoza': [-1.5089, 29.6341],
  'Rubavu|Gisenyi': [-1.6938, 29.2564],
  'Nyagatare|Nyagatare': [-1.2912, 30.3251],
  'Rwamagana|Rwamagana': [-1.9482, 30.4341],
};

const RW_MIN_LAT = -2.85;
const RW_MAX_LAT = -1.05;
const RW_MIN_LNG = 28.85;
const RW_MAX_LNG = 30.95;

const DISTRICT_ALIASES: Record<string, string> = {
  kigali: 'Kigali City',
  'city of kigali': 'Kigali City',
  'kigali city': 'Kigali City',
};

export function normalizeDistrictName(district: string): string {
  const trimmed = district?.trim() || '';
  if (!trimmed) return '';
  const alias = DISTRICT_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const match = Object.keys(DISTRICT_COORDINATES).find(
    (d) => d.toLowerCase() === trimmed.toLowerCase()
  );
  return match || trimmed;
}

function normalizeSector(sector: string): string {
  return sector.trim().replace(/\s+/g, ' ');
}

function sectorKey(district: string, sector: string): string {
  return `${normalizeDistrictName(district)}|${normalizeSector(sector)}`;
}

function clampCoord([lat, lng]: LatLng): LatLng {
  return [
    Math.min(RW_MAX_LAT, Math.max(RW_MIN_LAT, lat)),
    Math.min(RW_MAX_LNG, Math.max(RW_MIN_LNG, lng)),
  ];
}

function tinyOffset(salt: string): LatLng {
  let h = 0;
  for (let i = 0; i < salt.length; i += 1) h = (h << 5) - h + salt.charCodeAt(i);
  const dx = ((Math.abs(h) % 40) - 20) / 8000;
  const dy = (((Math.abs(h) >> 6) % 40) - 20) / 8000;
  return [dx, dy];
}

/** Count sectors when comma/semicolon-separated in a single field */
export function countSectors(sector?: string | null): number {
  if (!sector?.trim()) return 0;
  return sector.split(/[,;]/).map((s) => s.trim()).filter(Boolean).length;
}

/**
 * Resolve marker coordinates: sector (if known) > district centroid > Rwanda center.
 * Optional salt adds a tiny offset so overlapping programs remain visible.
 */
export function getLocationCoordinates(
  district: string,
  sector?: string | null,
  salt?: string
): LatLng {
  const districtNorm = normalizeDistrictName(district);
  const sectors = sector?.trim()
    ? sector.split(/[,;]/).map((s) => normalizeSector(s)).filter(Boolean)
    : [];

  if (sectors.length === 1) {
    const key = sectorKey(districtNorm, sectors[0]);
    const sectorMatch = Object.entries(SECTOR_COORDINATES).find(
      ([k]) => k.toLowerCase() === key.toLowerCase()
    );
    if (sectorMatch) {
      const base = sectorMatch[1];
      if (salt) {
        const [dx, dy] = tinyOffset(salt);
        return clampCoord([base[0] + dx, base[1] + dy]);
      }
      return clampCoord(base);
    }
  }

  const districtBase = DISTRICT_COORDINATES[districtNorm] || [-1.9403, 29.8739];
  if (salt) {
    const [dx, dy] = tinyOffset(salt);
    return clampCoord([districtBase[0] + dx, districtBase[1] + dy]);
  }
  return clampCoord(districtBase);
}

/**
 * Coverage radius in meters — scales with outreach scope.
 * District-level (no sector): larger. Sector-level: smaller. Multiple sectors: medium scale-up.
 */
export function getCoverageRadiusMeters(sector?: string | null): number {
  const count = countSectors(sector);
  if (count === 0) return 14000;
  if (count === 1) return 5500;
  return Math.min(10000, 4500 + count * 1200);
}

/** @deprecated Use getLocationCoordinates — kept for existing imports */
export function latLngForDistrict(
  district: string,
  sector?: string | null,
  salt?: string
): LatLng {
  return getLocationCoordinates(district, sector, salt);
}

/** @deprecated Use getCoverageRadiusMeters */
export function coverageRadiusMeters(sector?: string | null): number {
  return getCoverageRadiusMeters(sector);
}
