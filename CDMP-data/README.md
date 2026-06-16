# Canadian elections, donations & census — raw data

A collection of raw public-data files covering Canadian **political donations**.

The files are unmodified source data as published by Elections Canada and
Statistics Canada. 

- **Time coverage:** donations 1993–2024

---

## At a glance

| Theme | What it covers | Provider | Size |
|-|-|-|-|
| Political donations | Annual party contribution records, 1993–2024 | Elections Canada | 1.1 GB |

---

## The dataset

### Political donations — Elections Canada, 1993–2024

Annual contribution returns, one file per party per year. Parties present:
Bloc Québécois (BQ), Conservative (CPC), Green (GPC), Liberal (LPC),
NDP, People's Party (PPC). Each record includes the contributor's postal code,
contribution amount, and date.

| Dataset | What it is | Format | Size | Folder |
|-|-|-|-|-|
| Annual returns, 2004–2024 | Per-party, per-year contribution records | CSV (by year) | ~1.0 GB | `/donation/raw/<YEAR>/` |
| Pre-2004 archive | Candidate and party contributions, 1993–2004 | CSV (+ some xlsx) | 240 MB | `/donation/raw/PRE2004/` |

A `provenance.json` record sits alongside the donation data
(`…/processed/`) and tallies the raw files: **~5.6 million contribution
rows** in total across all years.

---

## Working with the files

A few practical notes so the data loads cleanly:

- **Donation CSVs have 4 preamble lines** before the column header. Skip the
  first 4 rows when reading them; don't hand-edit the top of the files.
- **The pre-2004 archive contains encoding variants.** Some files appear in both
  an original-encoding `.csv` and a `_utf8.csv` / `.xlsx` re-encoding of the same
  records. They are duplicates of one another — load only one variant per file to
  avoid double-counting rows.

---

## Sources & citation

| Data | Source |
|-|-|
| Political donations | Elections Canada — political financing / contribution returns |

---
