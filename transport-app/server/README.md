# Transport API (server)

This is a minimal Express + MySQL API scaffold for the Transport app. Intended for local development and to be used by the Electron desktop app and mobile app.

Quick start (local, using Docker Compose)

1. Copy environment file

   cp .env.example .env
   # edit .env if needed

2. Run docker compose

   docker compose up -d

3. The API will be reachable at http://localhost:3000

Endpoints (examples)

- POST /api/auth/login    { username, password } -> { token, user }
- POST /api/auth/register (admin only)
- GET  /api/loads
- POST /api/loads
- DELETE /api/loads/:id (admin only)
- GET/POST /api/vehicles, /api/drivers, /api/trips, /api/expenses, /api/invoices

Security notes

- Change `JWT_SECRET` and MySQL root password for production.
- Use HTTPS and secure env storage when deploying.
