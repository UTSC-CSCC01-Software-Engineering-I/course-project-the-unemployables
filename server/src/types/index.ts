export type Party = "BQ" | "CPC" | "GPC" | "LPC" | "NDP" | "PPC";

export type Province =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS"
  | "NT" | "NU" | "ON" | "PE" | "QC" | "SK" | "YT";

export interface Donation {
  clientId: string;
  contributorLastName: string;
  contributorFirstName: string;
  contributorMiddleInitial?: string;
  city: string;
  province: Province;
  postalCode: string;
  politicalParty: string;
  dateReceived: string;
  fiscalYear: string;
  typeOfContributor: string;
  monetary: number;
  nonMonetary: number;
  party: Party;
  year: number;
  contributionAmount?: number;
  recipientName?: string;
}

export interface DonationSummary {
  postalCode: string;
  province: Province;
  party: Party;
  year: number;
  totalMonetary: number;
  donationCount: number;
}

export interface DonationFilters {
  year?: number;
  party?: Party;
  province?: Province;
  postalCode?: string;
  firstName: string;
  lastName: string;
  donorName: string;
  dateFrom: string;
  dateTo: string;
  amountMin: number;
  amountMax: number;
  politicalParty: string;
  page: number;
  limit: number;
}

export interface RidingPartyBreakdown {
  party: string;
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
}

export interface RidingYearSummary {
  year: number;
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
  byParty: RidingPartyBreakdown[];
}

export interface RidingSummary {
  fedNum: number;
  allTime: {
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byParty: RidingPartyBreakdown[];
  };
  byYear: RidingYearSummary[];
}

export interface RidingRankingEntry {
  fedNum: number;
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
}

export interface RidingRankingsResponse {
  ridings: RidingRankingEntry[];
  ridingCount: number;
  nationalTotals: {
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byParty: RidingPartyBreakdown[];
  };
}

export interface DonationYearPartySum {
  year: number;
  party: string;
  total: number;
}

export interface DonationMonthPartySum {
  month: number; // 1–12
  party: string;
  total: number;
}
