// Elections Canada federal electoral district numbers encode the province or
// territory in their first two digits (Statistics Canada's Standard
// Geographical Classification codes) — stable across representation orders,
// so this needs no lookup table or extra data source, just the FED_NUM
// that's already on every riding.
export interface ProvinceInfo {
  code: string;
  name: string;
}

const PROVINCE_BY_CODE: Record<string, ProvinceInfo> = {
  "10": { code: "NL", name: "Newfoundland and Labrador" },
  "11": { code: "PE", name: "Prince Edward Island" },
  "12": { code: "NS", name: "Nova Scotia" },
  "13": { code: "NB", name: "New Brunswick" },
  "24": { code: "QC", name: "Quebec" },
  "35": { code: "ON", name: "Ontario" },
  "46": { code: "MB", name: "Manitoba" },
  "47": { code: "SK", name: "Saskatchewan" },
  "48": { code: "AB", name: "Alberta" },
  "59": { code: "BC", name: "British Columbia" },
  "60": { code: "YT", name: "Yukon" },
  "61": { code: "NT", name: "Northwest Territories" },
  "62": { code: "NU", name: "Nunavut" },
};

// All provinces/territories present in the map, sorted alphabetically by name
// — used to populate the province filter dropdown.
export const ALL_PROVINCES: ProvinceInfo[] = Object.values(PROVINCE_BY_CODE).sort((a, b) =>
  a.name.localeCompare(b.name)
);

export function provinceForFedNum(fedNum: number): ProvinceInfo | null {
  const prefix = String(fedNum).padStart(5, "0").slice(0, 2);
  return PROVINCE_BY_CODE[prefix] ?? null;
}
