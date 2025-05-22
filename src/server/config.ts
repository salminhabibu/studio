// src/server/config.ts
import dotenv from 'dotenv';
dotenv.config(); // Load .env file

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  apiKey: process.env.BACKEND_API_KEY, // Will be validated in auth middleware
  downloadBasePath: process.env.DOWNLOAD_BASE_PATH || './chillymovies_downloads',
  aria2RpcUrl: process.env.ARIA2_RPC_URL || 'http://localhost:6800/jsonrpc',
  aria2SecretToken: process.env.ARIA2_SECRET_TOKEN || 'my_secret_token',
};

if (config.aria2SecretToken === 'my_secret_token') {
  console.warn(
    "[Server Config] Using default Aria2 secret token. Please change 'my_secret_token' in your .env file for production security."
  );
}
