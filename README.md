# Canadian Donations Mapping Platform (CDMP)

An interactive web application for exploring Canadian federal political donation data from Elections Canada, allowing users to visualize donation patterns geographically by province, filter by party and year, and for authenticated researchers, access individual-level records.

---

## Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/UTSC-CSCC01-Software-Engineering-I/course-project-the-unemployables.git
   cd course-project-the-unemployables
   ```

2. **Set up environment file**
   Contact the project lead for credentials, then:
   ```bash
   cp .env.example .env
   # fill in the values you received
   ```

3. **Install dependencies and run**

   ```bash
   # Terminal 1 — server (port 3001)
   cd server && npm install && npm run dev

   # Terminal 2 — client (port 5173)
   cd client && npm install && npm run dev
   ```
   Open `http://localhost:5173`

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
- [Meeting Minutes](meetings/meetings.md)

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
| Database | Supabase (PostgreSQL) — 5.4M donation rows (2004–2024) |
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
