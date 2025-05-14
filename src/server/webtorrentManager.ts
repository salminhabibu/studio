// src/server/webtorrentManager.ts
import WebTorrent, { Torrent, TorrentFile } from 'webtorrent';
import path from 'path';
import fs from 'fs-extra';
import { config } from './config';

interface Task {
  id: string; // infoHash
  title: string;
  magnet: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  quality?: string;
  status: 'pending' | 'downloading_metadata' | 'downloading' | 'seeding' | 'completed' | 'error' | 'paused';
  progress: number; // 0-100
  downloadSpeed: number; // bytes/s
  downloaded: number; // bytes
  totalLength: number; // bytes
  files: { name: string; path: string; length: number }[];
  downloadPath: string;
  error?: string;
  addedTime: number;
}

class WebTorrentManager {
  private client: WebTorrent.Instance;
  private tasks: Map<string, Task> = new Map(); // infoHash -> Task

  constructor() {
    this.client = new WebTorrent();
    this.client.on('error', (err) => {
      console.error('[WebTorrentManager] Global client error:', err);
    });
    console.log('[WebTorrentManager] WebTorrent client initialized.');
  }

  generateTaskId(magnet: string): string {
    // Basic way to get an ID before infoHash is available, could be improved
    try {
      const parsedMagnet = new URL(magnet);
      const xt = parsedMagnet.searchParams.get('xt');
      if (xt && xt.startsWith('urn:btih:')) {
        return xt.substring('urn:btih:'.length).toLowerCase();
      }
    } catch (e) {
      // Not a valid magnet URL or cannot parse, fallback
    }
    // Fallback if proper infoHash extraction fails initially
    return Buffer.from(magnet).toString('hex').slice(0, 40); 
  }


  async addTask(details: {
    title: string;
    magnet: string;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
    quality?: string;
  }): Promise<Task> {
    return new Promise((resolve, reject) => {
      const preliminaryId = this.generateTaskId(details.magnet);

      if (this.tasks.has(preliminaryId) && this.tasks.get(preliminaryId)?.status !== 'error') {
         const existingTask = this.tasks.get(preliminaryId)!;
         console.log(`[WebTorrentManager] Task with magnet ${details.magnet.substring(0,30)}... (preliminaryId: ${preliminaryId}) already exists with status: ${existingTask.status}`);
         return resolve(existingTask);
      }
      
      let downloadPath = path.join(config.downloadBasePath, details.type === 'movie' ? 'movies' : 'tv', details.title);
      if (details.type === 'tv' && details.season) {
        downloadPath = path.join(downloadPath, `Season ${String(details.season).padStart(2, '0')}`);
      }
      // Episode-specific folder could be added here if needed, but WebTorrent downloads torrent content as is.

      const taskPlaceholder: Task = {
        id: preliminaryId, // Temporary, will be updated with actual infoHash
        ...details,
        status: 'pending',
        progress: 0,
        downloadSpeed: 0,
        downloaded: 0,
        totalLength: 0,
        files: [],
        downloadPath: downloadPath, // This path is for the torrent's content root
        addedTime: Date.now(),
      };
      this.tasks.set(preliminaryId, taskPlaceholder); // Store with preliminary ID

      console.log(`[WebTorrentManager] Adding torrent: ${details.title}, Magnet: ${details.magnet.substring(0,50)}...`);
      console.log(`[WebTorrentManager] Download path set to: ${downloadPath}`);

      try {
        fs.ensureDirSync(downloadPath); // Ensure directory exists

        this.client.add(details.magnet, { path: downloadPath }, (torrent: Torrent) => {
          console.log(`[WebTorrentManager] Torrent metadata ready for: ${torrent.name} (InfoHash: ${torrent.infoHash})`);
          
          // Update task with actual infoHash and details
          const actualInfoHash = torrent.infoHash;
          if (preliminaryId !== actualInfoHash && this.tasks.has(preliminaryId)) {
            const placeholder = this.tasks.get(preliminaryId)!;
            this.tasks.delete(preliminaryId); // Remove placeholder
            placeholder.id = actualInfoHash; // Update ID
            this.tasks.set(actualInfoHash, placeholder); // Re-add with correct ID
          } else if (!this.tasks.has(actualInfoHash)) {
             this.tasks.set(actualInfoHash, taskPlaceholder); // If placeholder wasn't set or matched
          }

          const task = this.tasks.get(actualInfoHash)!;
          task.id = actualInfoHash; // Ensure ID is correct
          task.status = 'downloading_metadata'; // Or 'downloading' if files are already known
          task.totalLength = torrent.length;
          task.title = torrent.name; // Update title from torrent metadata if preferred

          torrent.on('metadata', () => {
            task.status = 'downloading';
            task.totalLength = torrent.length;
            task.title = torrent.name;
            task.files = torrent.files.map(f => ({ name: f.name, path: f.path, length: f.length }));
            console.log(`[WebTorrentManager] Metadata for ${task.title} (ID: ${task.id}). Files: ${task.files.length}`);
          });

          torrent.on('download', (bytes: number) => {
            task.status = 'downloading';
            task.downloadSpeed = torrent.downloadSpeed;
            task.downloaded = torrent.downloaded;
            task.progress = Math.round(torrent.progress * 100);
            // console.log(`[WebTorrentManager] Progress for ${task.title}: ${task.progress}%, Speed: ${formatBytes(task.downloadSpeed)}/s`);
          });

          torrent.on('done', () => {
            task.status = 'completed';
            task.progress = 100;
            task.downloadSpeed = 0;
            task.files = torrent.files.map(f => ({ name: f.name, path: path.join(downloadPath, f.path), length: f.length }));
            console.log(`[WebTorrentManager] Download completed for: ${task.title} (ID: ${task.id})`);
            // Optionally, start seeding or perform other actions
            // torrent.destroy(); // if not seeding
          });
          
          torrent.on('error', (err: Error | string) => {
            const errorMsg = typeof err === 'string' ? err : err.message;
            task.status = 'error';
            task.error = errorMsg;
            console.error(`[WebTorrentManager] Error for torrent ${task.title} (ID: ${task.id}):`, errorMsg);
            reject(new Error(`Torrent error for ${task.title}: ${errorMsg}`));
          });

          torrent.on('warning', (warn: Error | string) => {
            console.warn(`[WebTorrentManager] Warning for torrent ${task.title} (ID: ${task.id}):`, warn);
          });

          resolve(task);
        });
      } catch (error: any) {
        console.error('[WebTorrentManager] Error adding torrent to client:', error);
        taskPlaceholder.status = 'error';
        taskPlaceholder.error = error.message || 'Failed to add torrent to client';
        this.tasks.set(preliminaryId, taskPlaceholder); // Update placeholder with error
        reject(error);
      }
    });
  }

  getTaskStatus(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasksStatus(): Task[] {
    return Array.from(this.tasks.values());
  }

  // TODO: Implement pause, resume, remove task functionalities
  // TODO: Implement graceful shutdown
}

// Singleton instance
const instance = new WebTorrentManager();
export default instance;

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
