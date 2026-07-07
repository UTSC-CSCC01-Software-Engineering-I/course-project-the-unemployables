from __future__ import annotations
"""
Ingest PCFRF (Postal Codes by Federal Ridings File) into Supabase.

Fixed-width format:
  chars 1-6   postal code (no space, e.g. A1B0R7)
  chars 7-11  FED_NUM (5-digit riding code, 2013 Representation Order)

Run from repo root:
  python scripts/ingest_pcfrf.py
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

PCFRF_PATH = Path(__file__).parent.parent / "PCFRF_FCPCF_V2212_2021.txt"
BATCH_SIZE = 500
BATCH_DELAY = 0.05

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def format_postal_code(raw: str) -> str:
    """Convert A1A1A1 → A1A 1A1 to match donations table format."""
    raw = raw.strip().upper().replace(" ", "")
    return f"{raw[:3]} {raw[3:]}" if len(raw) == 6 else raw


def parse_pcfrf(path: Path) -> list[dict]:
    seen: set[str] = set()
    rows: list[dict] = []

    with open(path, encoding="latin-1") as f:
        for line in f:
            if len(line) < 11:
                continue
            postal_raw = line[0:6].strip()
            fed_num = line[6:11].strip()

            if not postal_raw or not fed_num:
                continue

            postal = format_postal_code(postal_raw)

            # Keep first occurrence only (one riding per postal code)
            if postal in seen:
                continue
            seen.add(postal)

            rows.append({"postal_code": postal, "fed_num": int(fed_num)})

    return rows


def ingest(rows: list[dict]) -> None:
    total = len(rows)
    inserted = 0
    errors = 0

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        try:
            supabase.table("postal_riding").upsert(batch, on_conflict="postal_code").execute()
            inserted += len(batch)
        except Exception as e:
            errors += len(batch)
            print(f"  ERROR batch {i//BATCH_SIZE + 1}: {e}")
        pct = min((i + BATCH_SIZE) / total * 100, 100)
        print(f"  {pct:.0f}%  {inserted} inserted  {errors} errors", end="\r")
        time.sleep(BATCH_DELAY)

    print(f"\nDone. {inserted} rows inserted, {errors} errors.")


if __name__ == "__main__":
    if not PCFRF_PATH.exists():
        print(f"ERROR: {PCFRF_PATH} not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Parsing {PCFRF_PATH.name}…")
    rows = parse_pcfrf(PCFRF_PATH)
    print(f"  {len(rows)} unique postal codes found")

    print("Ingesting into postal_riding table…")
    ingest(rows)
