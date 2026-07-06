"""
Normalize contributor_province values in the donations table.

Raw Elections Canada CSVs contain inconsistent province strings
(e.g. "Ontario", "Ont", "ONT", "on") that break province-level
aggregation on the map. This script updates each known dirty value
to its two-letter ISO code.

Usage:
    pip install supabase python-dotenv
    python scripts/normalize_provinces.py            # apply changes
    python scripts/normalize_provinces.py --dry-run  # preview without writing

Before running, copy .env.example to .env at the repo root and fill in:
    SUPABASE_URL        - your Supabase project URL
    SUPABASE_SERVICE_KEY - your service role key (not the anon key)

See .env.example and the README for setup instructions.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


# -- Province mapping ---------------------------------------------------------
# Each key is a dirty value found in the raw data; the value is the correct code.
# Add new variants here as they are discovered.

PROVINCE_MAP: dict[str, str] = {
    # Ontario
    "Ontario": "ON",
    "Ont":     "ON",
    "ONT":     "ON",
    "on":      "ON",
    "On":      "ON",
    "\\on":    "ON",

    # Quebec
    "Quebec":  "QC",
    "Québec":  "QC",
    "Qc":      "QC",
    "QUE":     "QC",
    "que":     "QC",
    "PQ":      "QC",  # older historical abbreviation

    # British Columbia
    "British Columbia": "BC",
    "B.C.":             "BC",
    "Bc":               "BC",
    "bc":               "BC",

    # Alberta
    "Alberta": "AB",
    "Alta":    "AB",
    "ALTA":    "AB",
    "alta":    "AB",
    "ab":      "AB",

    # Manitoba
    "Manitoba": "MB",
    "Man":      "MB",
    "MAN":      "MB",
    "mb":       "MB",

    # Saskatchewan
    "Saskatchewan": "SK",
    "Sask":         "SK",
    "SASK":         "SK",
    "sask":         "SK",
    "sk":           "SK",

    # Nova Scotia
    "Nova Scotia": "NS",
    "N.S.":        "NS",
    "ns":          "NS",

    # New Brunswick
    "New Brunswick": "NB",
    "N.B.":          "NB",
    "nb":            "NB",

    # Prince Edward Island
    "Prince Edward Island": "PE",
    "P.E.I.":               "PE",
    "PEI":                  "PE",
    "pei":                  "PE",
    "pe":                   "PE",

    # Newfoundland and Labrador
    "Newfoundland":              "NL",
    "Newfoundland and Labrador": "NL",
    "Nfld":                      "NL",
    "NFLD":                      "NL",
    "NF":                        "NL",  # code used before the 2001 rename

    # Northwest Territories
    "Northwest Territories": "NT",
    "N.W.T.":                "NT",
    "NWT":                   "NT",
    "nt":                    "NT",

    # Nunavut
    "Nunavut": "NU",
    "nu":      "NU",

    # Yukon
    "Yukon":           "YT",
    "Yukon Territory": "YT",
    "YK":              "YT",  # non-standard but occasionally seen
    "yt":              "YT",
}


# -- Helpers ------------------------------------------------------------------

def count_rows(supabase, dirty: str) -> int:
    resp = (
        supabase.table("donations")
        .select("contributor_province", count="exact")
        .eq("contributor_province", dirty)
        .execute()
    )
    return resp.count or 0


def update_rows(supabase, dirty: str, clean: str) -> int:
    resp = (
        supabase.table("donations")
        .update({"contributor_province": clean})
        .eq("contributor_province", dirty)
        .execute()
    )
    # The REST API returns the affected rows; len gives the count.
    return len(resp.data) if resp.data else 0


# -- Main ---------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize contributor_province values in the donations table."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without writing to the database.",
    )
    args = parser.parse_args()

    load_dotenv(Path(__file__).parent.parent / ".env")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env", file=sys.stderr)
        print("See .env.example at the repo root for instructions.", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(url, key)

    mode = "DRY RUN - no changes will be written" if args.dry_run else "Normalizing province values"
    print(f"=== {mode} ===\n")

    total_rows = 0
    dirty_count = 0

    for dirty, clean in PROVINCE_MAP.items():
        row_count = count_rows(supabase, dirty)

        if row_count == 0:
            continue  # value not present in the data, skip silently

        if args.dry_run:
            print(f"  '{dirty}' -> '{clean}'  ({row_count:,} rows)")
        else:
            affected = update_rows(supabase, dirty, clean)
            print(f"  '{dirty}' -> '{clean}'  ({affected:,} rows updated)")

        total_rows += row_count
        dirty_count += 1

    print()
    if args.dry_run:
        print(f"Dry run complete - {dirty_count} dirty values found, {total_rows:,} rows would be updated.")
    else:
        print(f"Done - {dirty_count} dirty values normalized, {total_rows:,} rows updated.")


if __name__ == "__main__":
    main()
