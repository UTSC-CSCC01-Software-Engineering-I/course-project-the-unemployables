export type Party = "BQ" | "CPC" | "GPC" | "LPC" | "NDP" | "PPC";

export type Province =
  | "AB" | "BC" | "MB" | "NB" | "NL" | "NS"
  | "NT" | "NU" | "ON" | "PE" | "QC" | "SK" | "YT";

export interface DonationSummary {
  postalCode: string;
  province: Province;
  party: Party;
  year: number;
  totalMonetary: number;
  donationCount: number;
}

export interface Donation {
  clientId: string;
  contributorLastName: string;
  contributorFirstName: string;
  contributionAmount?: number;
  recipientName?: string;
  city: string;
  province: Province;
  postalCode: string;
  politicalParty: string;
  dateReceived: string;
  fiscal_year: string;
  typeOfContributor: string;
  monetary: number;
  nonMonetary: number;
  party: Party;
  year: number;
}

export interface DonationFilters {
  year?: number;
  party?: Party;
  province?: Province;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  politicalParty?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  filters: DonationFilters;
}

export interface SummaryResponse {
  data: DonationSummary[];
  filters: DonationFilters;
}
