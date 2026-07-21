import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlidersHorizontal, Eye, Download, Printer, ShieldCheck, AlertCircle, X } from "lucide-react";
import { fetchDonations } from "../api/donations";
import { supabase } from "../lib/supabase";
import type { Donation, DonationFilters } from "../types/index";

const PAGE_SIZE = 25;

// Party -> badge color. Extend this if new party values show up in the data
// (see disclaimer: exact party string values haven't been fully enumerated yet).
const PARTY_BADGE_STYLES: Record<string, string> = {
  "LPC": "bg-red-50 text-red-700",
  "CPC": "bg-blue-50 text-blue-700",
  "NDP": "bg-orange-50 text-orange-700",
  "BQ": "bg-sky-50 text-sky-700",
  "GPC": "bg-green-50 text-green-700",
};

function partyBadgeClass(party: string): string {
  return PARTY_BADGE_STYLES[party] ?? "bg-gray-100 text-gray-700";
}

type FilterErrors = {
  general?: string;
  dateRange?: string;
  amount?: string;
};

// validates the 3 supported cases:
// 1. Amount <= 0
// 2. Date range where "to" precedes "from"
// 3. Any field left empty -> asks user to fill everything before submitting
function validateFilters(f: DonationFilters): FilterErrors {
  const errors: FilterErrors = {};

  const allFieldsFilled = Boolean(
    f.dateFrom &&
      f.dateTo &&
      f.politicalParty &&
      f.province &&
      f.amountMin &&
      f.amountMax &&
      f.firstName &&
      f.lastName
  );

  if (!allFieldsFilled) {
    errors.general = "Please fill in all fields before submitting.";
  }

  if (f.dateFrom && f.dateTo && f.dateTo < f.dateFrom) {
    errors.dateRange = "Invalid date range: end date cannot precede start date.";
  }

  const min = f.amountMin !== undefined ? Number(f.amountMin) : undefined;
  const max = f.amountMax !== undefined ? Number(f.amountMax) : undefined;
  if ((min !== undefined && min <= 0) || (max !== undefined && max <= 0)) {
    errors.amount = "Amount must be a positive number.";
  }

  return errors;
}

// ResearcherDashboardPage is the main page for researchers to view and 
// filter donation records.
export function ResearcherDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [validationErrors, setValidationErrors] = useState<FilterErrors>({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  const [submittedFilters, setSubmittedFilters] = useState<DonationFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [filters, setFilters] = useState<DonationFilters>({
    page: 1,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    let active = true;

    // Load the current session to check if the user is authenticated and retrieve 
    // their name.
    async function loadSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;

      const user = sessionData.session?.user;
      if (!user) {
        navigate("/login");
        return;
      }

      setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Researcher");
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!hasSubmitted) {
      setDonations([]);
      setTotal(0);
      return;
    }

    let active = true;

    // Load donations based on the submitted filters and current page.
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchDonations({ ...submittedFilters, page, limit: PAGE_SIZE });
        if (!active) return;
        setDonations(response.data);
        setTotal(response.total);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load donations.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hasSubmitted, page, submittedFilters]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const updateFilter = (field: keyof DonationFilters, value: string) => {
    setFilters((current) => ({ ...current, [field]: value || undefined }));
  };


  const submit = (nextFilters: DonationFilters) => {
    setPage(1);
    setHasSubmitted(true);
    setSubmittedFilters({ ...nextFilters, page: 1, limit: PAGE_SIZE });
  };

  const submitFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateFilters(filters);
    setValidationErrors(errors);
    setShowErrorBanner(Object.keys(errors).length > 0);
    if (Object.keys(errors).length > 0) return;
    submit(filters);
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: PAGE_SIZE });
    setValidationErrors({});
    setShowErrorBanner(false);
  };

  return (
    <div className="min-h-full bg-gray-50 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900">Individual Donation Records</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            You have research-tier access. All queries are logged for audit purposes. Signed in as{" "}
            <span className="font-medium text-gray-900">{userName}</span>.
          </span>
        </div>

        {/* this is an error banner that goes off based on the boolean */}
        {showErrorBanner && (validationErrors.general || validationErrors.dateRange || validationErrors.amount) ? (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {validationErrors.general ??
                  "One or more filters contain invalid values. Please correct them before applying."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorBanner(false)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {/* advanced filters panel */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center gap-2 px-5 py-4 text-left"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="text-base font-semibold text-gray-900">Advanced Filters</span>
          </button>

          {showAdvanced ? (
            <form onSubmit={submitFilters} className="border-t border-gray-100 px-5 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom ?? ""}
                      onChange={(event) => updateFilter("dateFrom", event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                        validationErrors.dateRange
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-emerald-600"
                      }`}
                    />
                    <span className="text-sm text-gray-400">to</span>
                    <input
                      type="date"
                      value={filters.dateTo ?? ""}
                      onChange={(event) => updateFilter("dateTo", event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                        validationErrors.dateRange
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-emerald-600"
                      }`}
                    />
                  </div>
                  {validationErrors.dateRange ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {validationErrors.dateRange}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Political organization
                  </label>
                  <select
                    value={filters.politicalParty ?? ""}
                    onChange={(event) => updateFilter("politicalParty", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">All parties</option>
                    <option value="LPC">Liberal Party of Canada</option>
                    <option value="CPC">Conservative Party of Canada</option>
                    <option value="NDP">New Democratic Party</option>
                    <option value="BQ">Bloc Québécois</option>
                    <option value="GPC">Green Party of Canada</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    Single-select — the API currently filters on one party at a time.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Province
                  </label>
                  <input
                    placeholder="e.g. ON"
                    value={filters.province ?? ""}
                    onChange={(event) => updateFilter("province", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Donation amount range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="$ Min"
                      value={filters.amountMin ?? ""}
                      onChange={(event) => updateFilter("amountMin", event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                        validationErrors.amount
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-emerald-600"
                      }`}
                    />
                    <span className="text-sm text-gray-400">–</span>
                    <input
                      type="number"
                      placeholder="$ Max"
                      value={filters.amountMax ?? ""}
                      onChange={(event) => updateFilter("amountMax", event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                        validationErrors.amount
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-emerald-600"
                      }`}
                    />
                  </div>
                  {validationErrors.amount ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {validationErrors.amount}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Donor first name
                  </label>
                  <input
                    value={filters.firstName ?? ""}
                    onChange={(event) => updateFilter("firstName", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Donor last name
                  </label>
                  <input
                    value={filters.lastName ?? ""}
                    onChange={(event) => updateFilter("lastName", event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-medium text-gray-500 underline-offset-2 hover:underline"
                >
                  Reset all filters
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {!hasSubmitted ? null : loading ? (
          <p className="mt-6 text-sm text-gray-500">Loading records…</p>
        ) : null}

        {hasSubmitted && !loading && !error ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Found {total.toLocaleString()} records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Export not yet wired up — see note below"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3">Donor Name</th>
                    <th className="px-5 py-3">Political Body</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation, index) => {
                    const donorName = [donation.contributorFirstName, donation.contributorLastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim();

                    return (
                      <tr
                        key={donation.clientId ?? index}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900">{donorName || "Unknown donor"}</div>
                          <div className="text-xs text-gray-400">
                            {donation.typeOfContributor || "Individual Donor"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${partyBadgeClass(
                              donation.politicalParty
                            )}`}
                          >
                            {donation.politicalParty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-emerald-700">
                          {typeof donation.contributionAmount === "number"
                            ? `$${donation.contributionAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}`
                            : donation.contributionAmount}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{donation.dateReceived}</td>
                        <td className="px-5 py-3.5">
                          <div className="text-gray-800">{donation.postalCode}</div>
                          <div className="text-xs text-gray-400">{donation.recipientName || donation.city}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            title="View detail — not yet implemented"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <span className="text-sm text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + (donations.length ? 1 : 0)}–
                {(page - 1) * PAGE_SIZE + donations.length} of {total.toLocaleString()} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white">
                  {page}
                </span>
                <span className="text-sm text-gray-400">of {pageCount}</span>
                <button
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}