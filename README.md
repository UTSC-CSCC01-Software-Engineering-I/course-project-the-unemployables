# Canadian Donations Mapping Platform (CDMP)

An interactive web application for exploring Canadian federal political donation data from Elections Canada (1993–2024). Users can visualize donation patterns geographically, filter by party and time period, and — for authenticated researchers — access individual-level records.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (client + server) |
| Frontend | React 19 + Vite |
| Backend | Express.js 5 |
| Mapping | MapLibre GL JS via `react-map-gl` |
| Map tiles | CARTO Positron (free, no API key) |
| Containerization | Docker + Docker Compose |
| Database (planned) | Supabase (PostgreSQL + PostGIS) |
| Auth (planned) | Supabase Auth |

---

## Project Structure

```
.
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Map/
│   │   │       └── DonationMap.tsx   # Interactive province map
│   │   ├── api/
│   │   │   └── donations.ts          # API client (fetch helpers)
│   │   └── types/
│   │       └── index.ts              # Shared TS types
│   └── public/
│       └── provinces.geojson         # Stats Canada province boundaries
├── server/                   # Express.js API
│   └── src/
│       ├── index.ts                  # Entry point (PORT from env)
│       ├── routes/
│       │   └── donations.ts          # /api/donations, /api/donations/summary
│       └── types/
│           └── index.ts              # Donation, Party, Province types
├── CDMP-data/                # Raw Elections Canada CSVs (not committed)
│   └── donation/
│       ├── raw/              # Per-party per-year CSVs (1993–2024)
│       └── processed/        # provenance.json (5.6M rows total)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Running Locally

### Without Docker

```bash
# Copy environment file
cp .env.example .env

# Server (port 3001)
cd server
npm install
npm run dev

# Client (port 5173) — in a separate terminal
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

### With Docker (recommended for TAs / graders)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |

> **Note (Mac):** macOS Ventura/Sonoma reserves port 5000 for AirPlay Receiver. The server defaults to **port 3001** to avoid this conflict.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/donations/summary` | Aggregated totals by postal code, party, year |
| `GET` | `/api/donations` | Paginated raw donation rows |

All endpoints accept query params: `year`, `party`, `province`, `postalCode`, `page`, `limit`.

---

## Data

~5.6 million donation records from Elections Canada, 1993–2024. Parties covered: **BQ, CPC, GPC, LPC, NDP, PPC**.

The raw CSVs are not committed to this repo (1.1 GB). The `CDMP-data/` folder structure is:

```
CDMP-data/donation/raw/<YEAR>/<PARTY><YEAR>.csv
```

Each CSV has 4 preamble rows before the column header. Key columns: `Postal_code`, `Monetary`, `Date_received`, `Politicial_party`, `Province`, `City`.

---

## Demo 1 Goals

- [x] Interactive province map (MapLibre GL JS, real Stats Canada boundaries)
- [x] Project scaffold — React + Express + TypeScript + Docker
- [x] API route structure for donations (stub, ready for DB connection)
- [ ] Load donation data into Supabase and normalize/clean (Python ingestion script)
- [ ] Filter by year and party on the map
- [ ] Auth for researcher-tier access (Supabase Auth)
- [ ] Home page UI
- [ ] Auth frontend

---

## Team

| Member | Demo 1 Task |
|---|---|
| Ayyash | Interactive map, Docker setup, project scaffold |
| Akshayan | Auth frontend |
| Faris | Home page (based on UI sketches) |
| Tri | TBD |
| Tareq | TBD |

---

## Notes

- **PostGIS** is planned inside Supabase/PostgreSQL for spatial queries (postal-code-to-riding lookups, bounding-box filters). Evaluate once the data ingestion script is running.
- Province boundaries sourced from Statistics Canada 2021 Census cartographic boundary files, simplified to 0.3% via `mapshaper` for browser performance.
- The pre-2004 CSVs contain `_utf8.csv` duplicates — load only one variant per file to avoid double-counting.
