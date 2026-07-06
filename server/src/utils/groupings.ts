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
  const byProvince: Record<string, ProvinceSummary> = {};
  for (const row of rows) {
    if (!byProvince[row.province]) {
      byProvince[row.province] = {
        province: row.province,
        totalMonetary: 0,
        donationCount: 0,
        donorCount: Number(row.donor_count),
        byParty: [],
      };
    }
    byProvince[row.province].totalMonetary += Number(row.total_monetary);
    byProvince[row.province].donationCount += Number(row.donation_count);
    byProvince[row.province].byParty.push({
      party: row.party,
      totalMonetary: Number(row.total_monetary),
      donationCount: Number(row.donation_count),
    });
  }
  return Object.values(byProvince);
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
  const byRiding: Record<string, RidingSummary> = {};
  for (const row of rows) {
    const key = String(row.fed_num);
    if (!byRiding[key]) {
      byRiding[key] = {
        fedNum: row.fed_num,
        totalMonetary: 0,
        donationCount: 0,
        donorCount: Number(row.donor_count),
        byParty: [],
      };
    }
    byRiding[key].totalMonetary += Number(row.total_monetary);
    byRiding[key].donationCount += Number(row.donation_count);
    byRiding[key].byParty.push({
      party: row.party,
      totalMonetary: Number(row.total_monetary),
      donationCount: Number(row.donation_count),
    });
  }
  return Object.values(byRiding);
}
