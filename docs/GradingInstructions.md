# Grading Instructions — CDMP (The Unemployables)

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- `.env` file with credentials 

---

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/UTSC-CSCC01-Software-Engineering-I/course-project-the-unemployables.git
   cd course-project-the-unemployables
   ```

2. **Create the environment file**

   ```bash
   cp .env.example .env
   ```

   Now in .env just copy paste the email we sent you
   Title will be "The Unemployables .env"

3. **Start the application**

   ```bash
   docker compose up --build
   ```

   | Service | URL |
   |---|---|
   | Frontend | http://localhost:5173 |
   | API | http://localhost:3001 |

   Wait for both services to report ready before opening the app (typically 20–30 seconds on first build).

---

## Running Tests

Open a second terminal after the app is running, or run independently:

```bash
# Server tests (66 passing)
cd server && npm install && npm test

# Client tests (93 passing)
cd client && npm install && npm test
```

All tests should pass with no failures.

---

## Researcher Credentials

| Field | Value |
|---|---|
| Email | test@university.ca |
| Password | Researcher123 |



---

## Notes

- The database is hosted on Supabase and contains 5.4 million donation rows (Elections Canada, 2004–2024). There is no local database.
- If Docker is unavailable, see the [README](../README.md) for manual startup instructions.
