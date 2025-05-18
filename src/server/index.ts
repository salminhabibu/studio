// src/server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { apiKeyAuth } from './middleware/auth';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic Authentication (using API Key)
// This can be kept if you plan to add other backend services later that need auth.
// If the backend will truly have no active functionality, this could also be removed.
app.use(apiKeyAuth);

// --- API Endpoints ---

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'ChillyMovies Backend Server is running (UI Template Mode).' });
});

// --- Removed Download & Streaming Endpoints ---
// POST /api/stream - Removed
// GET /api/watch/:streamId - Removed
// POST /download - Removed
// GET /status/:taskId - Removed
// GET /status - Removed
// GET /files - Removed

// --- Start Server ---
app.listen(config.port, () => {
  console.log(`[Server API] ChillyMovies Backend Server listening on http://localhost:${config.port}`);
  console.log(`[Server API] Running in UI Template Mode. Download/streaming functionalities are stubbed on the frontend.`);
  if (!config.apiKey) {
    console.warn('[Server API] WARNING: BACKEND_API_KEY is not set. This is less critical for a UI template but remember to set it for future backend features.');
  } else {
    console.log('[Server API] API Key authentication is nominally enabled.');
  }
});

// --- Graceful Shutdown (Basic) ---
process.on('SIGINT', () => {
  console.log('[Server API] SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server API] SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
