# Classvoice — Student Feedback Management System

A responsive student-feedback app with an Express/MongoDB API, JWT-based student and administrator access, and a vanilla HTML/CSS/JavaScript client.

## Features

- Student registration and sign-in; passwords are hashed with bcrypt.
- Students can select a course, submit a teacher rating with optional comments, and have their authenticated name, student ID, and email attached automatically; students can view only their own feedback history.
- Administrators can review feedback with student identity details, filter by student ID, teacher, and course, remove entries, and view course-level rating statistics.
- Role-based API access, request validation, login rate limiting, CORS allowlisting, and centralized error responses.
- Jest/Supertest API coverage using an isolated in-memory MongoDB instance.

## Requirements

- Node.js 20 or newer
- MongoDB locally or a MongoDB Atlas connection string

## Run locally

```powershell
Copy-Item .env.example .env
npm install
npm run seed:admin
npm run dev
```

Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` before starting. Use a long, unique secret and a strong administrator password. On startup, the server creates the initial administrator if the configured email is not already registered. Open `http://localhost:3000`.

To run in production mode, use `npm start`.

## Publish the project to GitHub

Create an empty repository in your GitHub account, then run these commands from this project directory (replace the URL with your repository URL):

```powershell
git init -b main
git add .
git commit -m "Initial student feedback system"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

`.env`, `node_modules`, and generated build output are excluded by `.gitignore`. Keep the repository private if it contains institution-specific code or data.

## MongoDB Atlas

1. Create an Atlas cluster and a dedicated database user with read/write access to the application database; do not use your Atlas account password as the database password.
2. Add the connection URI from **Connect → Drivers** to Render as `MONGODB_URI`. Replace the URI's password placeholder in the Render dashboard only; never commit the completed URI.
3. Configure Atlas Network Access for Render. Render's outbound IPs can change; for plans without fixed outbound IPs, Atlas may require `0.0.0.0/0`. If you use that setting, protect the cluster with a unique, strong database-user password and least-privilege database access. Prefer fixed Render egress IPs and a narrower Atlas allowlist where available.

## API

All request and response bodies use JSON. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Health check |
| `POST` | `/api/auth/register` | Public | Register a student (`name`, `email`, `studentId`, `password`) |
| `POST` | `/api/auth/login` | Public | Student login (`email`, `password`) |
| `POST` | `/api/auth/admin/login` | Public | Administrator login (`email`, `password`) |
| `POST` | `/api/feedback` | Student | Submit feedback (`teacherName`, `courseName`, `rating` 1–5, optional `comment`) |
| `GET` | `/api/feedback/history` | Student | Get the signed-in student's feedback |
| `GET` | `/api/feedback` | Administrator | Review up to 500 records; optional `?studentId=`, `?teacher=`, and `?course=` filters |
| `DELETE` | `/api/feedback/:id` | Administrator | Delete a feedback record |
| `GET` | `/api/feedback/stats` | Administrator | Feedback totals, average rating, course statistics, recent feedback |

### Postman

Import [`postman/Student-Feedback-System.postman_collection.json`](postman/Student-Feedback-System.postman_collection.json) into Postman. The collection saves returned student/admin tokens automatically. Create a student first; create the admin with `npm run seed:admin`.

## Tests

```powershell
npm test
```

The test suite starts and stops its own MongoDB Memory Server and does not require the configured development database.

## Deployment

### Render (backend)

1. Create a Render Web Service connected to this repository (or use the included `render.yaml` Blueprint).
2. Set **Build Command** to `npm ci` and **Start Command** to `npm start`.
3. Configure `MONGODB_URI`, a strong `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` as Render environment variables. The Blueprint generates a JWT secret; set the remaining private values through the Render dashboard, not source control. The service provisions the initial admin during startup if the account does not exist yet.
4. Set `CLIENT_ORIGIN` to the exact Vercel frontend origin. If you do not know the Vercel URL yet, deploy the frontend first with the Render URL, then set the final origin in Render and redeploy. The API rejects browser origins that are not explicitly allowed in production.

### Vercel (frontend)

1. Import the repository into Vercel with the project root at this directory. The included `vercel.json` builds and serves the static frontend from `dist`.
2. Set `API_BASE_URL` in the Vercel project's environment variables to the Render service origin plus `/api` (for example, `https://your-service.onrender.com/api`).
3. Vercel runs `npm run build:frontend`; the build validates the public HTTPS API URL and injects it into the generated static site. The production build fails if `API_BASE_URL` is unset, local, or not HTTPS.
4. Set the backend `CLIENT_ORIGIN` to the exact Vercel deployment origin, then redeploy the Render service.

The admin feedback inbox supports CSV export of the currently displayed (optionally filtered) report. GitHub Actions runs the API tests on pushes and pull requests.

## Security notes

- Never commit `.env`; configure secrets in the deployment platform.
- Administrator accounts are provisioned with the seed script; there is no public admin-registration route.
- Feedback is currently associated with the student and visible to administrators. The UI copy describing sharing should match your institution's actual privacy and retention policy before production use.
