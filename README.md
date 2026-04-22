# SkillBridge — Attendance Management System

A deployed, end-to-end attendance management system for the SkillBridge state-level skilling programme. Five roles, one live system, real data.

---

## 1. Live URLs

| Service    | URL |
|------------|-----|
| Frontend   | `https://skillbridge-attendance.vercel.app` ← replace after deploy |
| Backend    | `https://skillbridge-api.up.railway.app` ← replace after deploy |
| API Health | `https://skillbridge-api.up.railway.app/health` |

---

## 2. Test Accounts

Sign in at the frontend URL above with these credentials:

| Role                | Email                                  | Password        |
|---------------------|----------------------------------------|-----------------|
| Student             | student@skillbridge.com                | SkillBridge@123 |
| Trainer             | trainer@skillbridge.com                | SkillBridge@123 |
| Trainer             | trainer2@skillbridge.com               | SkillBridge@123 |
| Institution Admin   | institution@skillbridge.com            | SkillBridge@123 |
| Programme Manager   | pm@skillbridge.com                     | SkillBridge@123 |
| Monitoring Officer  | monitor@skillbridge.com                | SkillBridge@123 |

> After sign-in, each user lands on their role-specific dashboard with real data from the database.

---

## 3. Local Setup

### Prerequisites
- Node.js 18+
- A Clerk account (at clerk.com)
- A Neon account (at neon.tech)

### Step 1 — Clone and install

```bash
git clone <your-repo-url>

# Backend
cd backend
npm install
cp .env.example .env 

# Frontend
cd ../frontend
npm install
cp .env.example .env.local   
```

### Step 2 — Set up Clerk

1. Go to [clerk.com](https://clerk.com) → Create application → name it "SkillBridge"
2. Copy your **Publishable Key** and **Secret Key**
3. In Clerk dashboard → **Sessions** → enable "Custom session token" — this is how roles are embedded in JWTs
4. In Clerk dashboard → **JWT Templates** → create a template named `default` with:
   ```json
   { "role": "{{user.public_metadata.role}}" }
   ```
5. Paste your keys into both `.env` files

### Step 3 — Set up Neon database

1. Go to [neon.tech](https://neon.tech) → Create project → name it "skillbridge"
2. Copy the **Connection String** (with `?sslmode=require`)
3. Paste it as `DATABASE_URL` in `backend/.env`

### Step 4 — Run migrations

```bash
cd backend
npm run migrate
```

### Step 5 — Run locally

```bash
# Terminal 1 — backend
cd backend
npm run dev     # runs on http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm run dev     # runs on http://localhost:3000
```

### Step 6 — Create test accounts

1. Open `http://localhost:3000/sign-up`
2. Sign up 5 accounts — one per role (Student, Trainer, Institution, Programme Manager, Monitoring Officer)
3. After each signup you'll be taken to `/onboarding` — select the correct role
4. Once all 5 are created:

```bash
cd backend
npm run seed    # links trainer/student to a sample batch and session
```

---

## 4. Schema Decisions

### Why these tables?

**`users`** — stores a local copy of each Clerk user with their role. We never trust the frontend's claim about who a user is. Every protected API call verifies the Clerk JWT and then looks up the user's role in this table server-side.

**`institutions`** — a first-class entity. Batches belong to an institution. Users (trainers, institution admins) are linked via `institution_id_fk`. This allows programme-wide roll-ups without joining through users.

**`batches`** — the central entity linking trainers to students via two join tables. Each batch carries an `invite_code` (nanoid, 10 chars) so students can self-onboard without admin involvement.

**`batch_trainers`** — many-to-many, explicitly modelled. A batch can have multiple trainers; a trainer can run multiple batches. When a trainer creates a batch they're automatically linked.

**`batch_students`** — students join via invite code, creating a row here. This is how we scope which sessions a student can mark attendance for (they must be in the batch).

**`sessions`** — each session has an explicit `batch_id` and `trainer_id`. This lets us scope attendance to a specific class event. Start/end time stored as `TIME` (not `TIMESTAMPTZ`) because sessions recur on known dates.

**`attendance`** — `UNIQUE(session_id, student_id)` enforces one record per student per session with `ON CONFLICT DO UPDATE` allowing re-marking. Status is constrained to `present/absent/late` at the DB level.

### Why no soft deletes?
Scope. This is a prototype. Cascade deletes are in place so test data can be cleaned up.

### Why UUIDs over serial IDs?
Invite codes are separate from IDs, so there's no sequential guessing risk. UUIDs also make it safe to generate IDs client-side if needed later.

---

## 5. Stack Choices

| Layer      | Choice          | Why |
|------------|-----------------|-----|
| Frontend   | Next.js 14      | Single deployment target (Vercel), server components available if needed, file-based routing, native TypeScript |
| Backend    | Node.js + Express | Straightforward REST API, fast to write, easy Railway deployment |
| Database   | Neon (PostgreSQL) | Free tier, serverless-friendly connection pooling, standard SQL |
| Auth       | Clerk           | Handles sign-up/sign-in UI, JWT issuance, and public metadata (we store `role` there). Eliminates the need to build password reset, email verification, etc. |
| Deployment | Vercel + Railway | Both have zero-config deploys from GitHub, free tiers, and instant rollbacks |

**Divergences from recommendations:** None. The recommended stack was sensible.

---

## 6. What's Working / Partial / Skipped

### Fully working
- All 5 roles can sign up, select role on onboarding, and log in
- Role-specific dashboards with real DB data (no hardcoded values)
- Server-side role validation on every protected endpoint — 403 if wrong role
- Student: view enrolled sessions, mark attendance (present/absent/late), re-mark
- Trainer: create batches, create sessions, generate invite codes, copy invite link, view per-session attendance with student list
- Institution: view all batches and trainers, attendance summary per batch with progress bars
- Programme Manager: create institutions, view programme-wide summary, drill into institution-level batch data
- Monitoring Officer: read-only dashboard — no create/edit/delete buttons rendered anywhere in UI
- Student batch join via invite link and manual code entry
- Full CORS configuration for frontend ↔ backend

###  Partially done
- **Trainer-to-institution linking**: trainers are linked to an institution when the PM manually updates the DB or via seed. There's no in-app UI for a PM to assign a trainer to an institution (the data model supports it, the UI flow is missing).
- **Active session window**: students can mark attendance for any session in their batch, not just "currently active" sessions. A production system would lock marking to sessions happening within ±30 minutes of `now()`.

###  Skipped
- Email notifications
- Pagination on large tables (lists are unbounded)
- Admin UI for managing invite code expiry
- Mobile-optimised layout (works on mobile but not polished)

---

## 7. One Thing I'd Do Differently

I would implement the **active session window** from day one. Right now students can mark attendance for sessions days after the fact, which breaks the core integrity guarantee of an attendance system. I'd add a `NOW() BETWEEN (date + start_time - interval '15 minutes') AND (date + end_time + interval '15 minutes')` check server-side on `POST /attendance/mark`, and surface a clear "Session not currently active" error in the UI. This is a one-line SQL change but I'd want it in before any real users touch the system.

---

