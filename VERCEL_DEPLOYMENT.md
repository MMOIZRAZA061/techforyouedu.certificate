# Deploying Tech For You to Vercel (with Neon PostgreSQL)

This project is fully configured and ready for 1-click or Git deployment to **Vercel** with **Neon Serverless PostgreSQL**.

---

## Architecture Overview on Vercel

- **Frontend**: High-performance React 19 SPA built by Vite into the `dist/` directory, served globally across Vercel's Edge CDN.
- **Backend API**: Modular Node.js / Express backend deployed as a Serverless Function at `/api/index.ts`.
- **Database**: Cloud persistence via **Neon PostgreSQL** (`DATABASE_URL`). Neon's `-pooler` connection with PgBouncer guarantees seamless scalability and zero connection dropouts during serverless execution.
- **Routing**: `vercel.json` rewrites `/api/*` to the serverless function and routes all client-side pages to `/index.html` for single-page client routing.

---

## Step-by-Step Deployment Instructions

### 1. Push Code to GitHub / GitLab / Bitbucket
Push this repository to your Git provider.

### 2. Import into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." → "Project"**.
2. Select your repository and click **"Import"**.

### 3. Build & Output Settings
Vercel automatically detects `vercel.json`:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Configure Environment Variables in Vercel
In the **Environment Variables** section on Vercel, copy and paste these exact variables:

| Key | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_Nei9j8zKdlPA@ep-soft-salad-ao55des9-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Live Neon PostgreSQL pooled connection URL |
| `POSTGRES_URL` | `postgresql://neondb_owner:npg_Nei9j8zKdlPA@ep-soft-salad-ao55des9-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Vercel Postgres alias |
| `JWT_SECRET` | `tech-for-you-super-secure-jwt-secret-key-2026` | Secret key for signing admin authentication tokens |
| `APP_URL` | `https://your-app-name.vercel.app` | (Optional) Your production Vercel domain for QR code generation |

*(Note: Neon PostgreSQL pooler handles connection reuse across Vercel serverless lambdas automatically, requiring no extra VPC or IP whitelisting).*

### 5. Click "Deploy"
Vercel will compile the Vite frontend, bundle the serverless `/api` handler, and provide your live production URL (e.g., `https://tech-for-you.vercel.app`).
All tables (`students`, `courses`, `enrollments`, `certificates`, `institute_settings`, `grading_configs`, `templates`, `audit_logs`) bootstrap automatically on first request.

---

## Local Development vs Vercel Serverless

- **Local Development**:
  ```bash
  npm run dev
  ```
  Runs Vite dev server with Express middleware on `http://localhost:3000`.

- **Production Standalone Server**:
  ```bash
  npm run build
  npm start
  ```

- **Vercel Serverless Function**:
  Handled by `/api/index.ts` and configured in `vercel.json`.
