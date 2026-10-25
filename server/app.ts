import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (accessible via /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Tech For You - Certificate Management & Verification API',
    database: db.getDatabaseStatus(),
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-runtime',
  });
});

// Download endpoints for Vercel deployment variables
app.get(['/api/download-env', '/download-env'], (req, res) => {
  const envContent = `# ============================================================
# Tech For You — Live Neon PostgreSQL Configuration for Vercel
# ============================================================

DATABASE_URL="postgresql://neondb_owner:npg_Nei9j8zKdlPA@ep-soft-salad-ao55des9-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
POSTGRES_URL="postgresql://neondb_owner:npg_Nei9j8zKdlPA@ep-soft-salad-ao55des9-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="tech-for-you-super-secure-jwt-secret-key-2026"
NODE_ENV="production"
PORT=3000
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=".env"');
  res.send(envContent);
});

app.get(['/api/download-zip', '/download-zip'], (req, res) => {
  const zipPath = path.resolve(process.cwd(), 'public', 'vercel-env.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'vercel-env.zip');
  } else {
    res.status(404).send('ZIP file not found.');
  }
});

// ------------------------------------------------------------
// Every data request must read from PostgreSQL, never from a
// process-local snapshot. Serverless instances do not share memory,
// so a stale snapshot could otherwise serve a deleted record or
// write it back to the database. Health and database-management
// endpoints stay reachable so an admin can repair the connection.
// ------------------------------------------------------------
const requireLiveData = async (req: Request, res: Response, next: NextFunction) => {
  const url = req.originalUrl || req.url;
  if (url.includes('/database/')) {
    next();
    return;
  }

  if (!db.isPostgres) {
    res.status(503).json({
      success: false,
      message: 'PostgreSQL is not connected. Data is unavailable until the database connection is restored.',
    });
    return;
  }

  try {
    await db.ensureFresh();
    next();
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: err?.message || 'Could not read from PostgreSQL.',
    });
  }
};

app.use(['/api', '/auth', '/public', '/admin'], requireLiveData);

// Primary API routes (prefixed with /api)
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', publicRoutes); // for /api/certificates/verify and /api/certificates/search
app.use('/api/admin', adminRoutes);

// Fallback direct routes for environments where /api might be stripped
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/admin', adminRoutes);

export default app;
