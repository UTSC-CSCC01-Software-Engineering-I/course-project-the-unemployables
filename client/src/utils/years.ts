// Single source of truth for the dataset's coverage window.
//
// Donation data covers 2004-2024 per CDMP-data/README.md. This lived as a
// duplicated literal in both the Riding Lookup page and the homepage stat
// band, which meant a future data refresh had to be remembered in two
// places. Update it here only.

export const DATA_FIRST_YEAR = 2004;
export const DATA_LAST_YEAR = 2024;

/** Every covered year, newest first — used to populate year pickers. */
export const DATA_YEARS = Array.from(
  { length: DATA_LAST_YEAR - DATA_FIRST_YEAR + 1 },
  (_, i) => DATA_LAST_YEAR - i
);
