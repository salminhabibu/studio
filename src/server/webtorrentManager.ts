// src/server/webtorrentManager.ts
import WebTorrent, { Torrent, TorrentFile } from 'webtorrent';
import { config as serverConfig } from './config'; // For download path
import path from 'path';
import fs from 'fs'; // For ensuring directory exists

// Define a structure for the file info we want to return
interface ManagedFile {
  name: string;
  path: string; // Path within the torrent
  length: number;
}

interface AddTorrentResult {
  torrentId: string;
  files: ManagedFile[];
  name: string; // Torrent name
}

class WebTorrentManager {
  private client: WebTorrent.Instance;
  private activeTorrents: Map<string, Torrent>; // Store torrents by infoHash

  constructor() {
    console.log("[WebTorrentManager] Initializing WebTorrent client...");
    this.client = new WebTorrent();
    this.activeTorrents = new Map();

    this.client.on('error', (err) => {
      console.error('[WebTorrentManager] WebTorrent client error:', err);
    });

    // Ensure download path exists
    const torrentDownloadPath = path.join(serverConfig.downloadBasePath, 'webtorrent');
    if (!fs.existsSync(torrentDownloadPath)) {
      fs.mkdirSync(torrentDownloadPath, { recursive: true });
      console.log(`[WebTorrentManager] Created download directory: ${torrentDownloadPath}`);
    }
    console.log(`[WebTorrentManager] Downloads will be saved to: ${torrentDownloadPath}`);
  }

  public addTorrent(magnetUri: string): Promise<AddTorrentResult> {
    return new Promise((resolve, reject) => {
      console.log(`[WebTorrentManager] Adding torrent: ${magnetUri}`);
      const torrentDownloadPath = path.join(serverConfig.downloadBasePath, 'webtorrent');

      // Check if torrent already exists
      // Note: client.add automatically handles deduplication if the same magnet is added,
      // but it will call the callback immediately if already present.
      // We can parse magnet to get infoHash for a more robust check first.
      let infoHash = '';
      try {
        // A simple way to extract infoHash, more robust parsing might be needed
        const match = magnetUri.match(/btih:([a-f0-9]+)/i);
        if (match && match[1]) {
          infoHash = match[1].toLowerCase();
        }
      } catch (e) {
        console.warn('[WebTorrentManager] Could not parse infoHash from magnet on add attempt.');
      }

      if (infoHash && this.activeTorrents.has(infoHash)) {
        const existingTorrent = this.activeTorrents.get(infoHash)!;
        console.log(`[WebTorrentManager] Torrent ${existingTorrent.name} (${infoHash}) already added.`);
        resolve({
          torrentId: existingTorrent.infoHash,
          name: existingTorrent.name,
          files: existingTorrent.files.map(file => ({
            name: file.name,
            path: file.path,
            length: file.length,
          })),
        });
        return;
      }

      this.client.add(magnetUri, { path: torrentDownloadPath }, (torrent: Torrent) => {
        console.log(`[WebTorrentManager] Torrent added: ${torrent.name} (InfoHash: ${torrent.infoHash})`);
        
        torrent.on('metadata', () => {
          console.log(`[WebTorrentManager] Metadata received for: ${torrent.name}`);
        });

        torrent.on('ready', () => {
          console.log(`[WebTorrentManager] Torrent ready: ${torrent.name}`);
          if (!this.activeTorrents.has(torrent.infoHash)) {
            this.activeTorrents.set(torrent.infoHash, torrent);
            console.log(`[WebTorrentManager] Stored torrent: ${torrent.name}`);
          }
          
          const files = torrent.files.map((file: TorrentFile) => ({
            name: file.name,
            path: file.path, // This is the path within the torrent, e.g., "MovieName/file.mp4"
            length: file.length,
          }));

          resolve({
            torrentId: torrent.infoHash,
            name: torrent.name,
            files: files,
          });
        });

        torrent.on('warning', (warn) => {
            console.warn(`[WebTorrentManager] Warning for torrent ${torrent.name}:`, warn);
        });
        
        torrent.on('error', (err) => {
          console.error(`[WebTorrentManager] Error with torrent ${torrent.name}:`, err);
          // If the promise hasn't resolved yet (e.g. error before 'ready'), reject it.
          // Otherwise, the torrent was added but encountered an error later.
          if (!this.activeTorrents.has(torrent.infoHash)) { // Check if it resolved
            reject(new Error(`Torrent error for ${torrent.name}: ${err.message || err}`));
          }
          // Consider removing from activeTorrents if it's a fatal error for this torrent
          this.removeTorrent(torrent.infoHash, true).catch(removeErr => {
            console.error(`[WebTorrentManager] Failed to auto-remove torrent ${torrent.infoHash} after error:`, removeErr);
          });
        });

        torrent.on('done', () => {
            console.log(`[WebTorrentManager] Torrent download finished: ${torrent.name}`);
            // Optionally remove from activeTorrents after some time if not actively streaming/seeding
        });
      });
    });
  }

  public getTorrentFileStream(torrentId: string, filePath: string): NodeJS.ReadableStream | null {
    const torrent = this.activeTorrents.get(torrentId);
    if (!torrent) {
      console.warn(`[WebTorrentManager] Torrent with ID ${torrentId} not found for streaming.`);
      return null;
    }

    const file = torrent.files.find(f => f.path === filePath);
    if (!file) {
      console.warn(`[WebTorrentManager] File with path "${filePath}" not found in torrent ${torrentId}.`);
      return null;
    }

    console.log(`[WebTorrentManager] Creating stream for file: ${file.name} in torrent: ${torrent.name}`);
    return file.createReadStream();
  }

  public getTorrent(torrentId: string): Torrent | undefined {
    return this.activeTorrents.get(torrentId);
  }

  /**
   * Removes a torrent from the client and our active list.
   * @param torrentId The infoHash of the torrent to remove.
   * @param silent If true, suppresses "not found" warnings (used for cleanup).
   */
  public removeTorrent(torrentId: string, silent: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      const torrent = this.activeTorrents.get(torrentId);
      if (torrent) {
        this.client.remove(torrentId, (err) => {
          if (err) {
            console.error(`[WebTorrentManager] Error removing torrent ${torrentId} from client:`, err);
            return reject(err);
          }
          this.activeTorrents.delete(torrentId);
          console.log(`[WebTorrentManager] Torrent ${torrentId} removed successfully.`);
          resolve();
        });
      } else {
        if (!silent) {
            console.warn(`[WebTorrentManager] Torrent ${torrentId} not found for removal.`);
        }
        resolve(); // Resolve even if not found, as the goal is to ensure it's gone.
      }
    });
  }

  // Basic cleanup (example, might need more robust scheduling)
  public cleanupInactiveTorrents(maxInactiveTimeMs = 30 * 60 * 1000 /* 30 minutes */) {
    const now = Date.now();
    this.activeTorrents.forEach(torrent => {
      // This is a very basic check. 'torrent.lastUsed' isn't a standard property.
      // A more robust check would involve tracking last stream access time or if it's seeding and desired.
      // For now, if it's downloaded and not being actively interacted with (hard to tell without more state),
      // we might remove it. Or remove based on time since added if not completed.
      
      // Example: Remove completed torrents if they haven't been used recently (requires tracking 'lastUsed')
      // if (torrent.done && (now - (torrent as any).lastUsed > maxInactiveTimeMs)) {
      //   console.log(`[WebTorrentManager] Cleaning up inactive torrent: ${torrent.name}`);
      //   this.removeTorrent(torrent.infoHash);
      // }

      // For simplicity in this implementation, we are not doing time-based cleanup.
      // This would be a place to implement such logic.
    });
  }

  public getActiveTorrentsInfo(): AddTorrentResult[] {
    return Array.from(this.activeTorrents.values()).map(torrent => ({
        torrentId: torrent.infoHash,
        name: torrent.name,
        files: torrent.files.map(file => ({
            name: file.name,
            path: file.path,
            length: file.length,
        })),
    }));
  }

  public destroy(callback?: (err?: Error | string) => void): void {
    console.log('[WebTorrentManager] Destroying WebTorrent client...');
    this.client.destroy(err => {
        if (err) {
            console.error('[WebTorrentManager] Error destroying client:', err);
        } else {
            console.log('[WebTorrentManager] WebTorrent client destroyed.');
        }
        this.activeTorrents.clear();
        if (callback) callback(err);
    });
  }
}

const webTorrentManager = new WebTorrentManager();
export default webTorrentManager;
