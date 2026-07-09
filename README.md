# DeveloperHub

> A modern software engineering platform combining the core capabilities of **GitHub**, **Jira**, and **Trello** — organizations, repositories, Kanban-based project management, issue tracking, and pull request workflows, all in one place.

Built as a full-stack reference project demonstrating scalable backend architecture, secure authentication, normalized relational database design, and modern frontend engineering.

---

## Tech Stack

**Backend**
- FastAPI (async)
- SQLAlchemy 2.0 (async engine)
- Alembic (migrations)
- Pydantic v2
- JWT Authentication (access + refresh tokens)
- PostgreSQL (hosted on Supabase)

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + Shadcn UI
- Axios + React Query

**DevOps**
- Docker + Docker Compose
- GitHub Actions (CI/CD — planned)

**Architecture**
- Repository Pattern
- Service Layer
- Clean Architecture principles
- Role-Based Access Control (RBAC)

---

## Features

| Module | Status |
|---|---|
| Authentication (JWT, register/login/refresh) | ✅ Implemented |
| User Profiles | ✅ Implemented |
| Organizations + Membership (roles) | ✅ Implemented |
| Repositories | ✅ Implemented |
| Projects + Kanban Board (drag-and-drop) | ✅ Implemented |
| Issue Tracker (nested comments, labels, types) | ✅ Implemented |
| Pull Request Simulation (reviews, merge) | ✅ Implemented |
| Notifications | 🔜 Planned |
| Activity Timeline | 🔜 Planned |
| Search | 🔜 Planned |
| Dashboard | 🔜 Planned |
| Admin Panel | 🔜 Planned |

Role hierarchy (org and repo level): `owner → admin → maintainer → developer → guest`

---

## Project Structure

```
DeveloperHub/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI route handlers
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic layer
│   │   ├── repositories/   # Data access layer (Repository Pattern)
│   │   ├── auth/           # JWT, password hashing, auth dependencies
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/         # Settings, database connection
│   ├── alembic/             # DB migrations
│   └── main.py
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/
│   ├── hooks/
│   ├── lib/                 # Axios client, utilities
│   ├── services/
│   └── layouts/
├── database/
├── docker/
├── docs/
├── tests/
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- A [Supabase](https://supabase.com) project (managed PostgreSQL)
- Docker (optional, for containerized setup)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/DeveloperHub.git
cd DeveloperHub
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (see `.env.example` for the full list):
```
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<supabase-host>:5432/postgres
JWT_SECRET_KEY=<generate with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development
```

Run migrations:
```bash
alembic upgrade head
```

Start the backend:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Verify: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```
Visit: [http://localhost:3000](http://localhost:3000)

### 4. (Optional) Run with Docker Compose
```bash
docker compose up --build
```
This runs both backend and frontend in containers. Postgres itself is not containerized — both local and containerized modes connect to the same hosted Supabase instance.

> Don't run manual (`uvicorn` + `npm run dev`) and Docker Compose at the same time — both bind ports 8000/3000 and will conflict. Run `docker compose down` before switching modes.

---

## API Overview

All endpoints are prefixed as shown; full request/response contracts are documented in `docs/API_CONTRACT.md`.

```
Auth            POST /register, /login, /refresh
Users           GET  /users/me
Organizations   POST/GET/PUT/DELETE /organizations, /organizations/{id}
                POST/PUT/DELETE     /organizations/{id}/members
Repositories    POST/GET/PUT/DELETE /organizations/{id}/repositories, /repositories/{id}
Projects        POST/GET/PUT/DELETE /repositories/{id}/projects, /projects/{id}
Tasks (Kanban)  POST /projects/{id}/tasks   PATCH/DELETE /tasks/{id}
Issues          POST/GET/PATCH/DELETE /repositories/{id}/issues, /issues/{id}
                POST /issues/{id}/comments, /issues/{id}/labels
Pull Requests   POST/GET /repositories/{id}/pull_requests, /pull_requests/{id}
                POST /pull_requests/{id}/reviews, /merge, /comments
```

All mutating routes require `Authorization: Bearer <access_token>`. Interactive API docs are available at `http://localhost:8000/docs` (FastAPI's built-in Swagger UI) once the backend is running.

---

## Authentication & Security

- Passwords hashed with bcrypt (never stored in plaintext)
- JWT access tokens (short-lived) + refresh tokens (long-lived)
- Rate limiting on `/login` and `/register`
- Role-based permission checks enforced at the service layer for every mutating operation
- CORS configured for local development; update allowed origins before deploying

---

## Database Schema

Core entities: `users`, `organizations`, `organization_members`, `repositories`, `projects`, `tasks`, `labels`, `milestones`, `issues`, `issue_comments`, `pull_requests`, `pr_reviews`, `pr_comments`.

Key design decisions:
- Issues and pull requests are **repository-scoped**, with optional links to a task / issue respectively (not hard-nested).
- Comments (on both issues and PRs) support **nested threading** via a `parent_comment_id` self-reference.
- Deleting an organization or repository **cascades** to all dependent records.
- Labels are a single shared entity usable across both tasks and issues.

---

## Testing

```bash
cd backend
pytest
```

Manual verification checklists for each phase are in `docs/verification/`.

---

## Deployment

| Component | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com) |
| Backend | Render / Railway |
| Database | Supabase (PostgreSQL) |

CI/CD via GitHub Actions is planned for automated linting, testing, and deployment on merge to `main`.

---

## Roadmap

- [ ] Real-time notifications (WebSockets)
- [ ] Activity timeline
- [ ] Global search
- [ ] Dashboard with charts/widgets
- [ ] Admin panel
- [ ] File attachments on issues/comments
- [ ] AI-assisted code review / issue summarization

---

## License

This project is for educational/portfolio purposes. License to be finalized before public release.

---

## Author

Built by [Your Name] — [LinkedIn] · [Portfolio]
