// src/server/config.ts
import dotenv from 'dotenv';
dotenv.config(); // Load .env file

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  apiKey: process.env.BACKEND_API_KEY, // Will be validated in auth middleware
  downloadBasePath: process.env.DOWNLOAD_BASE_PATH || './chillymovies_downloads',
};
