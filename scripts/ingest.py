"""
Elections Canada donation CSV ingestion script.
Loads all post-2004 donation data into Supabase via REST API.

Usage:
    pip install supabase python-dotenv
    python scripts/ingest.py

Requires a .env file at the repo root with:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY=sb_secret_...
"""

from __future__ import annotations

import csv
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────

RAW_DIR = Path(__file__).parent.parent / "CDMP-data" / "donation" / "raw"
PROGRESS_FILE = Path(__file__).parent / ".ingest_progress.json"
BATCH_SIZE = 300
BATCH_DELAY = 0.1
MAX_RETRIES = 5

# Process files from this year onward. Set to None to process all years.
START_YEAR = None

PARTY_MAP = {
    "bloc québécois":               "BQ",
    "bloc quebecois":               "BQ",
    "conservative party of canada": "CPC",
    "green party of canada":        "GPC",
    "liberal party of canada":      "LPC",
    "new democratic party":         "NDP",
    "ndp-new democratic party":     "NDP",
    "people's party of canada":     "PPC",
    "peoples party of canada":      "PPC",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_party(raw: str) -> str:
    return PARTY_MAP.get(raw.strip().lower(), raw.strip())


def format_postal_code(raw: str) -> str | None:
    code = re.sub(r"\s+", "", raw.strip().upper())
    if len(code) == 6 and re.match(r"^[A-Z]\d[A-Z]\d[A-Z]\d$", code):
        return code[:3] + " " + code[3:]
    return None


def parse_date(raw: str) -> str | None:
    raw = raw.strip()
    if not raw:
        return None
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def year_from_filename(name: str) -> int | None:
    match = re.search(r"(\d{4})", name)
    return int(match.group(1)) if match else None


def find_header_row(lines: list[str]) -> int | None:
    for i, line in enumerate(lines):
        if "Client_id" in line:
            return i
    return None


def parse_csv(path: Path) -> list[dict]:
    year = year_from_filename(path.name)
    rows = []

    with open(path, encoding="utf-8-sig", errors="replace") as f:
        lines = f.readlines()

    header_idx = find_header_row(lines)
    if header_idx is None:
        print(f"  ⚠ No header found in {path.name}, skipping")
        return []

    reader = csv.DictReader(lines[header_idx:])

    for row in reader:
        try:
            monetary = float((row.get("Monetary") or "0").replace(",", ""))
        except ValueError:
            monetary = 0.0

        if monetary <= 0:
            continue

        first = (row.get("Contributor_first_name") or "").strip() or None
        last  = (row.get("Contributor_last_name")  or "").strip() or None

        recipient_parts = [
            (row.get("Recipient_first_name") or "").strip(),
            (row.get("Recipient_last_name")  or "").strip(),
        ]
        recipient = " ".join(p for p in recipient_parts if p) or None

        rows.append({
            "client_id":               (row.get("Client_id") or "").strip() or None,
            "contributor_first_name":  first,
            "contributor_last_name":   last,
            "contributor_city":        (row.get("City") or "").strip() or None,
            "contributor_province":    (row.get("Province") or "").strip() or None,
            "contributor_postal_code": format_postal_code(row.get("Postal_code") or ""),
            "political_party":         normalize_party(row.get("Politicial_party") or ""),
            "recipient_name":          recipient,
            "contribution_amount":     monetary,
            "contribution_date":       parse_date(row.get("Date_received") or ""),
            "contribution_year":       year,
            "type_of_contributor":     (row.get("Type_of_contributor") or "").strip() or None,
            "raw_file":                path.name,
        })

    return rows


def insert_batch(supabase, rows: list[dict]) -> None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            supabase.table("donations").insert(rows).execute()
            return
        except Exception as e:
            if attempt == MAX_RETRIES:
                raise
            wait = 2 ** attempt
            print(f"\n  ⚠ Attempt {attempt}/{MAX_RETRIES} failed: {e}. Retrying in {wait}s...")
            time.sleep(wait)


def load_progress() -> set[str]:
    if PROGRESS_FILE.exists():
        return set(json.loads(PROGRESS_FILE.read_text()))
    return set()


def save_progress(completed: set[str]) -> None:
    PROGRESS_FILE.write_text(json.dumps(sorted(completed)))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    load_dotenv()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

    supabase = create_client(url, key)

    csv_files = sorted([
        p for p in RAW_DIR.rglob("*.csv")
        if "PRE2004" not in p.parts
        and (START_YEAR is None or any(int(part) >= START_YEAR for part in p.parts if part.isdigit()))
    ])

    completed = load_progress()
    remaining = [p for p in csv_files if p.name not in completed]

    print(f"Found {len(csv_files)} CSV files — {len(completed)} already done, {len(remaining)} to go\n")

    total_inserted = 0

    for csv_path in remaining:
        print(f"Processing {csv_path.name}...", end=" ", flush=True)
        rows = parse_csv(csv_path)

        if not rows:
            print("0 rows")
            completed.add(csv_path.name)
            save_progress(completed)
            continue

        for i in range(0, len(rows), BATCH_SIZE):
            insert_batch(supabase, rows[i : i + BATCH_SIZE])
            time.sleep(BATCH_DELAY)

        total_inserted += len(rows)
        completed.add(csv_path.name)
        save_progress(completed)
        print(f"{len(rows):,} rows")

    print(f"\nDone — {total_inserted:,} rows inserted this run")


if __name__ == "__main__":
    main()
