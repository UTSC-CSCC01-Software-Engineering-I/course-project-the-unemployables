# Canadian Donations Mapping Platform (CDMP)

An interactive web application for exploring Canadian federal political donation data from Elections Canada (1993–2024), allowing users to visualize donation patterns geographically by province, filter by party and year, and — for authenticated researchers — access individual-level records.

---

## Team Information

**Team Name:** The Unemployables

| Name | GitHub | Email |
|---|---|---|
| Ayyash Anhardeen | @ayyashanhardeen | ayyashahmedanhardeen@gmail.com |
| Akshayan | — | — |
| Faris | — | — |
| Tri | — | — |
| Tareq | — | — |

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

---

## Design Documents

- [Demo 1 Documentation](docs/Demo1Docs.md) — Project proposal, class diagram, Demo 1 status

---

## Running Locally

### Without Docker

```bash
# Terminal 1 — server (port 3001)
cd server && npm install && npm run dev

# Terminal 2 — client (port 5173)
cd client && npm install && npm run dev
```

Open `http://localhost:5173`


```bash
docker compose up --build
```

- `ridings.geojson` in `client/public/` (Elections Canada 45th General Election, 348 districts) is ready for a future electoral districts view.
- **PostGIS** is planned inside Supabase/PostgreSQL for spatial queries (postal-code → riding lookups).
- Province boundaries sourced from Statistics Canada 2021 Census cartographic boundary files, simplified via `mapshaper`.
