# Canadian Donations Mapping Platform (CDMP)

## Notes

- **PostGIS** is planned inside Supabase/PostgreSQL for spatial queries (postal-code-to-riding lookups, bounding-box filters). Evaluate once the data ingestion script is running.
- Province boundaries sourced from Statistics Canada 2021 Census cartographic boundary files, simplified to 0.3% via `mapshaper` for browser performance.
- The pre-2004 CSVs contain `_utf8.csv` duplicates — load only one variant per file to avoid double-counting.
