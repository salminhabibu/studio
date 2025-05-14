// src/server/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const providedApiKey = req.header('X-API-Key');

  if (!config.apiKey) {
    console.warn('[AuthMiddleware] BACKEND_API_KEY is not set. Allowing request without authentication for development. THIS IS INSECURE FOR PRODUCTION.');
    return next();
  }

  if (!providedApiKey) {
    return res.status(401).json({ error: 'Unauthorized: API key is missing.' });
  }

  if (providedApiKey !== config.apiKey) {
    return res.status(403).json({ error: 'Forbidden: Invalid API key.' });
  }

  next();
}
