# Canadian Donations Mapping Platform (CDMP)



---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (client + server) |
| Frontend | React 19 + Vite |
| Backend | Express.js 5 |
| Mapping | MapLibre GL JS via `mapcn` |
| Map tiles | CARTO Positron (free, no API key needed) |
| Styling | Tailwind CSS v3 + shadcn/ui compatible |
| Containerization | Docker + Docker Compose |
| Database (planned) | Supabase (PostgreSQL + PostGIS) |
| Auth (planned) | Supabase Auth |


## Notes

- `ridings.geojson` in `client/public/` (Elections Canada 45th General Election, 348 districts) is ready for a future electoral districts toggle.
- **PostGIS** is planned inside Supabase/PostgreSQL for spatial queries (postal-code → riding lookups). Evaluate once the data ingestion script is running.
- Province boundaries sourced from Statistics Canada 2021 Census cartographic boundary files, simplified via `mapshaper`.
