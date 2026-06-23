# Canadian Donations Mapping Platform (CDMP)

An interactive web application for exploring Canadian federal political donation data from Elections Canada, allowing users to visualize donation patterns geographically by province, filter by party and year, and for authenticated researchers, access individual-level records.

---

## Team Information

**Team Name:** The Unemployables

| Name |
|---|
| Ayyash Anhardeen |
| Akshayan |
| Faris |
| Tri |
| Tareq |

---

## Design Documents

- [Demo 1 Documentation](docs/Demo1Docs.md) — Project proposal, class diagram, Demo 1 status
- [Meeting Minutes](meetings/meeting1.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (client + server) |
| Frontend | React 19 + Vite |
| Backend | Express.js 5 |
| Mapping | MapLibre GL JS via `mapcn` |
| Styling | Tailwind CSS v3 + shadcn/ui compatible |
| Containerization | Docker + Docker Compose |
| Database (planned) | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth |

---

## Running Locally

### With Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |

### Without Docker

```bash
# Terminal 1 — server (port 3001)
cd server && npm install && npm run dev

# Terminal 2 — client (port 5173)
cd client && npm install && npm run dev
```

Open `http://localhost:5173`

---


