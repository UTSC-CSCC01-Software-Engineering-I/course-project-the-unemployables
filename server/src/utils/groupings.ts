export type ProvinceRow = {
  province: string;
  party: string;
  total_monetary: number | string;
  donation_count: number | string;
  donor_count: number | string;
};

export type ProvinceSummary = {
  province: string;
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
  byParty: { party: string; totalMonetary: number; donationCount: number }[];
};

export function groupByProvince(rows: ProvinceRow[]): ProvinceSummary[] {
  const byProvince: Record<string, {
    province: string;
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byPartyMap: Record<string, { party: string; totalMonetary: number; donationCount: number }>;
  }> = {};

  for (const row of rows) {
    if (!byProvince[row.province]) {
      byProvince[row.province] = { province: row.province, totalMonetary: 0, donationCount: 0, donorCount: 0, byPartyMap: {} };
    }
    const entry = byProvince[row.province];
    entry.totalMonetary += Number(row.total_monetary);
    entry.donationCount += Number(row.donation_count);
    entry.donorCount += Number(row.donor_count);

    if (!entry.byPartyMap[row.party]) {
      entry.byPartyMap[row.party] = { party: row.party, totalMonetary: 0, donationCount: 0 };
    }
    entry.byPartyMap[row.party].totalMonetary += Number(row.total_monetary);
    entry.byPartyMap[row.party].donationCount += Number(row.donation_count);
  }

  return Object.values(byProvince).map(e => ({
    province: e.province,
    totalMonetary: e.totalMonetary,
    donationCount: e.donationCount,
    donorCount: e.donorCount,
    byParty: Object.values(e.byPartyMap),
  }));
}

export type RidingRow = {
  fed_num: number;
  party: string;
  total_monetary: number | string;
  donation_count: number | string;
  donor_count: number | string;
};

export type RidingSummary = {
  fedNum: number;
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
  byParty: { party: string; totalMonetary: number; donationCount: number }[];
};

export function groupByRiding(rows: RidingRow[]): RidingSummary[] {
  const byRiding: Record<string, {
    fedNum: number;
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byPartyMap: Record<string, { party: string; totalMonetary: number; donationCount: number }>;
  }> = {};

  for (const row of rows) {
    const key = String(row.fed_num);
    if (!byRiding[key]) {
      byRiding[key] = { fedNum: Number(row.fed_num), totalMonetary: 0, donationCount: 0, donorCount: 0, byPartyMap: {} };
    }
    const entry = byRiding[key];
    entry.totalMonetary += Number(row.total_monetary);
    entry.donationCount += Number(row.donation_count);
    entry.donorCount += Number(row.donor_count);

    if (!entry.byPartyMap[row.party]) {
      entry.byPartyMap[row.party] = { party: row.party, totalMonetary: 0, donationCount: 0 };
    }
    entry.byPartyMap[row.party].totalMonetary += Number(row.total_monetary);
    entry.byPartyMap[row.party].donationCount += Number(row.donation_count);
  }

  return Object.values(byRiding).map(e => ({
    fedNum: e.fedNum,
    totalMonetary: e.totalMonetary,
    donationCount: e.donationCount,
    donorCount: e.donorCount,
    byParty: Object.values(e.byPartyMap),
  }));
}
