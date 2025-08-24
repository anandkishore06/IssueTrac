# Minimal Issue Tracker (React + Express + PostgreSQL + Docker) — with Real‑time Comments (SSE)

This is a minimal, production‑leaning Issue Tracker implementing the requested features:

- **Auth**: signup/login with **JWT**.
- **RBAC**: `admin` can edit/close/delete any issue; `user` can CRUD only their own.
- **Endpoints**: issues CRUD, comments on an issue.
- **Pagination & filtering**: `GET /issues?status=OPEN|CLOSED&page=&page_size=&q=`.
- **Frontend**: list, search/filter, create/edit, detail + comment, **optimistic UI** for create/close.
- **Real-time (Option A)**: **SSE** stream `GET /issues/:id/stream` pushes new comments live. Includes `/health` and built-in browser reconnection strategy.
- **Errors**: proper HTTP codes; **Zod** input validation.
- **Bonus**: Containerized local setup (**Docker Compose** for PostgreSQL).

---

## Project Structure

```
issue-tracker-sse/
  docker-compose.yml          # PostgreSQL
  server/
    .env.example
    package.json
    prisma/
      schema.prisma
    src/
      index.js                # Express app
      seed.js                 # Seed users, issue, comments
  client/
    index.html
    package.json
    vite.config.js
    src/
      main.jsx
      App.jsx
      api.js
      components/
        IssueList.jsx
        IssueDetail.jsx
        IssueForm.jsx
        Login.jsx
        Signup.jsx
```

---

## Prerequisites

- Node.js 18+ and npm
- Docker + Docker Compose

---

## 1) Start PostgreSQL (Docker)

```bash
docker compose up -d
# DB runs at: postgres://postgres:postgres@localhost:5432/issuetracker
```

---

## 2) Server Setup

```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run db:push      # or: npm run db:migrate
npm run db:seed
npm run dev          # starts on http://localhost:4000
```

**Seeded users**:

- Admin — `admin@example.com` / `admin123`
- User  — `user@example.com`  / `user1234`

Health check: `GET http://localhost:4000/health` → `{ ok: true }`

---

## 3) Client Setup

```bash
cd client
npm install
# Point the client to the API if different:
# echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev          # http://localhost:5173
```

Log in with the seeded user to try everything immediately.

---

## API: Endpoints Overview

### Auth
- `POST /auth/signup` — `{ email, password, name }` → `{ token, user }`
- `POST /auth/login` — `{ email, password }` → `{ token, user }`

Use the returned token as: `Authorization: Bearer <token>`

### Issues
- `GET /issues?status=OPEN|CLOSED&page=1&page_size=10&q=search`
- `POST /issues` — `{ title, description }`
- `GET /issues/:id`
- `PUT /issues/:id` — `{ title?, description?, status? }` (owner or admin)
- `PATCH /issues/:id/close` — closes (owner or admin)
- `DELETE /issues/:id` — delete (owner or admin)

### Comments
- `GET /issues/:id/comments`
- `POST /issues/:id/comments` — `{ body }`

### Real-time (SSE)
- `GET /issues/:id/stream` — server-sent events; emits `{ type: 'comment.created', comment }`

### Health
- `GET /health`

---

## RBAC Rules

- **User** can create issues, edit/close/delete **their own** issues.
- **Admin** can edit/close/delete **any** issue.
- Everyone can read issues and comments.

---

## Pagination & Filtering

`GET /issues?status=OPEN|CLOSED&page=&page_size=&q=`

- `status`: optional (`OPEN` or `CLOSED`)
- `page`: default `1`
- `page_size`: default `10` (max `100`)
- `q`: full-text-ish search over title/description (case-insensitive)

Response:

```json
{
  "items": [ { "id": 1, "title": "First issue", "status": "OPEN", "author": { "id": 2, "name": "Alice" }, "createdAt": "...", "updatedAt": "..." } ],
  "total": 12,
  "page": 1,
  "page_size": 10
}
```

---

## Example cURL

### Login
```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "password": "user1234" }'
```

### Create Issue
```bash
TOKEN="PUT_TOKEN_HERE"
curl -s -X POST http://localhost:4000/issues \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "title": "Bug: Save fails", "description": "Steps to reproduce..." }'
```

### List (open, search, page)
```bash
curl -s "http://localhost:4000/issues?status=OPEN&page=1&page_size=5&q=bug"
```

### Close Issue
```bash
curl -s -X PATCH http://localhost:4000/issues/1/close \
  -H "Authorization: Bearer $TOKEN"
```

### Add Comment
```bash
curl -s -X POST http://localhost:4000/issues/1/comments \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "body": "Working on it." }'
```

### SSE Stream (using curl)
```bash
curl -N http://localhost:4000/issues/1/stream
```

---

## Notes

- **Validation** via Zod; errors returned as `400` with details.
- **Auth errors**: `401` for missing/invalid token; `403` for RBAC violations.
- **Not found**: `404` on missing resources.
- **Optimistic UI** implemented for creating issues and closing issues; comments use optimistic insert and reconcile.
- For production, add proper HTTPS, CORS origins, secure secret management, rate limits, etc.

Enjoy!
