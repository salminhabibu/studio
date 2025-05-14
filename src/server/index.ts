// src/server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import path from 'path';
import { config } from './config';
import webTorrentManager from './webtorrentManager';
import { apiKeyAuth } from './middleware/auth';

const app = express();

// Middleware
app.use(cors()); // Allow all origins for now, configure as needed for production
app.use(express.json());

// Basic Authentication (using API Key)
app.use(apiKeyAuth); 

// --- Zod Schemas for Request Validation ---
const downloadRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  magnet: z.string().regex(/^magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,40}/, 'Invalid magnet URI'),
  type: z.enum(['movie', 'tv'], { errorMap: () => ({ message: "Type must be 'movie' or 'tv'" }) }),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
  quality: z.string().optional(),
});

// --- API Endpoints ---

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'ChillyMovies Download Server is running.' });
});

// Initiate Download
app.post('/download', async (req: Request, res: Response) => {
  try {
    const validationResult = downloadRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validationResult.error.format() });
    }

    const { title, magnet, type, season, episode, quality } = validationResult.data;

    // Basic validation for TV shows
    if (type === 'tv' && (!season)) { // Episode is optional for full season download
      return res.status(400).json({ error: 'Season number is required for TV show downloads.' });
    }
    
    console.log(`[Server API] Received download request for: ${title} (Type: ${type})`);

    const task = await webTorrentManager.addTask({
      title,
      magnet,
      type,
      season,
      episode,
      quality,
    });

    res.status(202).json({ 
      message: 'Download initiated successfully. Check status endpoint for progress.',
      taskId: task.id,
      initialStatus: task.status,
    });

  } catch (error: any) {
    console.error('[Server API] Error initiating download:', error);
    const errorMessage = error.message || 'An unexpected error occurred while initiating the download.';
    // Check if it's a "torrent already added" type of error to give a more specific response
    if (error.message && error.message.includes('Torrent is already downloading') || error.message.includes('already exists with status')) {
        const existingTaskId = webTorrentManager.generateTaskId(req.body.magnet);
        const existingTask = webTorrentManager.getTaskStatus(existingTaskId);
        return res.status(409).json({ error: 'Conflict: This torrent is already being processed or has been added.', taskId: existingTaskId, currentStatus: existingTask?.status || 'unknown' });
    }
    res.status(500).json({ error: 'Failed to initiate download', details: errorMessage });
  }
});

// Get Download Status
app.get('/status/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = webTorrentManager.getTaskStatus(taskId);

  if (task) {
    res.status(200).json(task);
  } else {
    res.status(404).json({ error: 'Task not found.' });
  }
});

// Get All Tasks Status
app.get('/status', (req: Request, res: Response) => {
  const tasks = webTorrentManager.getAllTasksStatus();
  res.status(200).json(tasks);
});

// Serve downloaded files (Example - Be cautious with this in production)
// This is a very basic static serving. For production, consider Nginx or a dedicated file server.
// Also, ensure proper security (e.g., authentication, authorization) if exposing downloaded files.
app.use('/files', express.static(path.resolve(config.downloadBasePath), {
  // Consider adding more options here, like dotfiles, etag, etc.
}));


// --- Start Server ---
app.listen(config.port, () => {
  console.log(`[Server API] ChillyMovies Download Server listening on http://localhost:${config.port}`);
  console.log(`[Server API] Downloads will be saved to: ${path.resolve(config.downloadBasePath)}`);
  if (!config.apiKey) {
    console.warn('[Server API] WARNING: BACKEND_API_KEY is not set in .env. The server is running in an insecure mode without API key authentication. This is NOT recommended for production.');
  } else {
    console.log('[Server API] API Key authentication is enabled.');
  }
});

// --- Graceful Shutdown (Basic) ---
process.on('SIGINT', () => {
  console.log('[Server API] SIGINT signal received: closing HTTP server');
  // Here you might want to cleanup WebTorrent client, save progress, etc.
  // For now, just exit. WebTorrent might try to save state on its own.
  // client.destroy(() => process.exit(0)); // if client is accessible here
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server API] SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
