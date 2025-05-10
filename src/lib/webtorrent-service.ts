// src/lib/webtorrent-service.ts
import type { Instance as WebTorrentInstance, Torrent as WebTorrentAPITorrent, TorrentFile as WebTorrentAPITorrentFile } from 'webtorrent';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  if (typeof (window as any).Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
  }
  // process.browser polyfill is generally handled by Next.js for client components.
  // If specific issues arise, a minimal polyfill like below could be considered,
  // but dynamic import is preferred to ensure code runs in the correct environment.
  // if (typeof (window as any).process === 'undefined') {
  //   (window as any).process = { browser: true, env: {} };
  // } else if (typeof (window as any).process.browser === 'undefined') {
  //   (window as any).process.browser = true;
  // }
}


export interface TorrentFile extends WebTorrentAPITorrentFile {}

export interface Torrent extends WebTorrentAPITorrent {
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  statusForHistory?: HistoryItem['status']; // For easier history update
}

export type TorrentProgress = {
  torrentId: string; // infoHash
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
  remainingTime?: number;
  downloaded: number;
  length?: number;
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  status: 'idle' | 'downloading' | 'seeding' | 'paused' | 'error' | 'connecting' | 'done';
};

export interface HistoryItem {
  infoHash: string;
  magnetURI: string;
  name: string;
  itemId?: string | number;
  addedDate: string;
  completedDate?: string;
  status: 'completed' | 'failed' | 'removed' | 'active'; // 'active' means it was added but not yet completed/failed/removed
  size?: number;
}

const HISTORY_STORAGE_KEY = 'chillymovies_download_history';

class WebTorrentService {
  private client: WebTorrentInstance | null = null;
  private activeTorrents: Map<string, Torrent> = new Map(); // magnetURI -> Torrent

  private progressListeners: Array<(progress: TorrentProgress) => void> = [];
  private torrentAddedListeners: Array<(torrent: Torrent) => void> = [];
  private torrentRemovedListeners: Array<(infoHash: string) => void> = [];
  private torrentDoneListeners: Array<(torrent: Torrent) => void> = [];
  private torrentErrorListeners: Array<(torrent: Torrent | null, error: Error | string) => void> = [];
  private historyUpdatedListeners: Array<() => void> = [];

  constructor() {
    // Initialization is deferred to getClient to ensure it's async and client-side
  }

  private async initializeClient(): Promise<void> {
    if (this.client || typeof window === 'undefined') return;

    console.log('[WebTorrentService] Initializing client (async)...');
    try {
      const WebTorrentModule = await import('webtorrent');
      // WebTorrent is typically a default export from the CJS module
      const WT = WebTorrentModule.default || WebTorrentModule;
      this.client = new WT();
      this.client.on('error', (err) => {
        console.error('[WebTorrentService] Client error:', err);
        this.torrentErrorListeners.forEach(listener => listener(null, err as Error));
      });
      console.log('[WebTorrentService] Client initialized successfully.');
    } catch (error) {
      console.error('[WebTorrentService] Failed to initialize WebTorrent client:', error);
      this.torrentErrorListeners.forEach(listener => listener(null, error instanceof Error ? error : String(error) ));
    }
  }

  public async getClient(): Promise<WebTorrentInstance | null> {
    if (!this.client && typeof window !== 'undefined') {
      await this.initializeClient();
    }
    return this.client;
  }

  // --- History Management ---
  private getHistory(): HistoryItem[] {
    if (typeof window === 'undefined') return [];
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  }

  private saveHistory(history: HistoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    this.historyUpdatedListeners.forEach(listener => listener());
  }

  private updateHistoryItem(torrent: Torrent, status: HistoryItem['status']) {
    const history = this.getHistory();
    const existingIndex = history.findIndex(item => item.infoHash === torrent.infoHash);
    const now = new Date().toISOString();

    if (existingIndex > -1) {
      history[existingIndex].status = status;
      if (status === 'completed' || status === 'failed') {
        history[existingIndex].completedDate = now;
      }
    } else if (status === 'active') { // Only add if it's a new active item
      history.unshift({ // Add to the beginning
        infoHash: torrent.infoHash,
        magnetURI: torrent.magnetURI,
        name: torrent.customName || torrent.name,
        itemId: torrent.itemId,
        addedDate: torrent.addedDate?.toISOString() || now,
        status: status,
        size: torrent.length
      });
    }
    this.saveHistory(history);
  }
  
  public getDownloadHistory(): HistoryItem[] {
    return this.getHistory().sort((a,b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
  }

  public clearHistory(): void {
    this.saveHistory([]);
  }
  
  public removeFromHistory(infoHash: string): void {
    let history = this.getHistory();
    history = history.filter(item => item.infoHash !== infoHash);
    this.saveHistory(history);
  }
  // --- End History Management ---

  async addTorrent(magnetURI: string, itemName?: string, itemId?: string | number): Promise<Torrent | null> {
    const client = await this.getClient();
    if (!client) {
      console.error('[WebTorrentService] Client not initialized for addTorrent.');
      this.torrentErrorListeners.forEach(listener => listener(null, 'Client not initialized'));
      return null;
    }

    return new Promise<Torrent | null>((resolve) => {
        if (this.activeTorrents.has(magnetURI)) {
          console.log(`[WebTorrentService] Torrent already in active session: ${itemName || magnetURI}`);
          resolve(this.activeTorrents.get(magnetURI)!);
          return;
        }

        console.log(`[WebTorrentService] Adding torrent: ${itemName || magnetURI}`);
        const torrentInstance = client.add(magnetURI, (t: WebTorrentAPITorrent) => {
          const enhancedTorrent = t as Torrent;
          enhancedTorrent.customName = itemName || t.name;
          enhancedTorrent.addedDate = new Date();
          enhancedTorrent.itemId = itemId;
          enhancedTorrent.statusForHistory = 'active';

          console.log(`[WebTorrentService] Torrent metadata ready for: ${enhancedTorrent.customName}`);
          this.activeTorrents.set(magnetURI, enhancedTorrent);
          this.updateHistoryItem(enhancedTorrent, 'active');
          this.torrentAddedListeners.forEach(listener => listener(enhancedTorrent));
          this.setupTorrentEventListeners(enhancedTorrent);
          resolve(enhancedTorrent);
        }) as Torrent;
        
        if (!torrentInstance) {
            console.error('[WebTorrentService] Failed to initiate torrent addition.');
            this.torrentErrorListeners.forEach(listener => listener(null, 'Failed to initiate torrent addition'));
            resolve(null);
        } else {
            torrentInstance.once('error', (err) => {
                console.error(`[WebTorrentService] Error during torrent initialization for ${itemName || magnetURI}:`, err);
                // This handles errors before the main 'add' callback or 'metadata' event.
                // If the promise hasn't resolved, resolve with null or reject.
                // Assuming the main callback path is the primary resolution.
                // Consider if this should `reject(err)` if the promise might not otherwise resolve.
                // For now, consistent with returning null on failure.
                if (this.activeTorrents.has(magnetURI)) { // if it got added then errored
                    this.activeTorrents.delete(magnetURI);
                }
                this.updateHistoryItem(torrentInstance, 'failed'); // Mark as failed in history
                this.notifyProgress(torrentInstance, 'error');
                resolve(null); 
            });
            // Initial progress notification
            this.notifyProgress(torrentInstance, 'connecting');
        }
    });
  }
  
  private setupTorrentEventListeners(torrent: Torrent) {
    torrent.on('download', () => this.notifyProgress(torrent, 'downloading'));
    torrent.on('upload', () => this.notifyProgress(torrent, torrent.done ? 'seeding' : 'downloading'));
    torrent.on('done', () => {
        console.log(`[WebTorrentService] Torrent done: ${torrent.customName}`);
        torrent.statusForHistory = 'completed';
        this.updateHistoryItem(torrent, 'completed');
        this.notifyProgress(torrent, 'done');
        this.torrentDoneListeners.forEach(listener => listener(torrent));
    });
    torrent.on('error', (err) => {
        console.error(`[WebTorrentService] Torrent error (${torrent.customName}):`, err);
        torrent.statusForHistory = 'failed';
        this.updateHistoryItem(torrent, 'failed');
        this.notifyProgress(torrent, 'error');
        this.torrentErrorListeners.forEach(listener => listener(torrent, err as Error));
    });
  }

  private notifyProgress(torrent: Torrent, statusOverride?: TorrentProgress['status']) {
    // Ensure torrent has infoHash before notifying; can be null briefly for magnet links
    if (!torrent || !torrent.infoHash ||!this.activeTorrents.has(torrent.magnetURI) ) return;
    
    let currentStatus: TorrentProgress['status'] = statusOverride || 'connecting';
    if (!statusOverride) { // Determine status if not overridden
        if (torrent.done) currentStatus = 'done';
        else if (torrent.paused) currentStatus = 'paused';
        else if (torrent.progress > 0 && torrent.progress < 1) currentStatus = 'downloading';
        else if (torrent.progress === 1 && !torrent.done) currentStatus = 'seeding';
        // Default to 'connecting' if no other state matches (e.g. progress = 0, not paused, not done)
    }


    const progressData: TorrentProgress = {
      torrentId: torrent.infoHash, 
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      peers: torrent.numPeers,
      remainingTime: torrent.timeRemaining,
      downloaded: torrent.downloaded,
      length: torrent.length,
      customName: torrent.customName,
      addedDate: torrent.addedDate,
      itemId: torrent.itemId,
      status: currentStatus,
    };
    this.progressListeners.forEach(listener => listener(progressData));
  }

  getTorrent(infoHashOrMagnetURI: string): Torrent | undefined {
    if (this.activeTorrents.has(infoHashOrMagnetURI)) {
        return this.activeTorrents.get(infoHashOrMagnetURI);
    }
    // Fallback to check by infoHash if magnetURI was not the key (e.g. if torrent re-added via infohash somehow)
    for (const torrent of this.activeTorrents.values()) {
        if (torrent.infoHash === infoHashOrMagnetURI) return torrent;
    }
    return undefined;
  }

  getAllTorrentsProgress(): TorrentProgress[] {
    const progressList: TorrentProgress[] = [];
    this.activeTorrents.forEach(torrent => {
      // Ensure infoHash exists before creating progress item
      if (!torrent.infoHash) return; 

      let status: TorrentProgress['status'] = 'connecting';
      if (torrent.ready && torrent.progress === 0 && torrent.downloadSpeed === 0 && torrent.files && torrent.files.length === 0 && !torrent.paused && !torrent.done) status = 'connecting';
      else if (torrent.done) status = 'done';
      else if (torrent.paused) status = 'paused';
      else if (torrent.progress < 1 && (torrent.downloadSpeed > 0 || torrent.downloaded > 0 || torrent.progress > 0)) status = 'downloading';
      else if (torrent.progress === 1 && !torrent.done) status = 'seeding';
      // else if (torrent.downloadSpeed === 0 && torrent.progress > 0 && torrent.progress < 1 && !torrent.paused) status = 'downloading'; // Stalled
      
      progressList.push({
        torrentId: torrent.infoHash,
        progress: torrent.progress,
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        peers: torrent.numPeers,
        remainingTime: torrent.timeRemaining,
        downloaded: torrent.downloaded,
        length: torrent.length,
        customName: torrent.customName,
        addedDate: torrent.addedDate,
        itemId: torrent.itemId,
        status: status,
      });
    });
    return progressList;
  }

  async removeTorrent(infoHashOrMagnetURI: string): Promise<void> {
    const client = await this.getClient();
    if (!client) {
        console.error("[WebTorrentService] Client not available for removeTorrent");
        return;
    }

    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent) {
      this.updateHistoryItem(torrent, torrent.statusForHistory === 'completed' ? 'completed' : 'removed');
      
      await new Promise<void>((resolve, reject) => {
          client.remove(torrent.magnetURI, (err) => {
            if (err) {
                console.error(`[WebTorrentService] Error removing torrent ${torrent.customName}:`, err);
                // Still proceed with removing from activeTorrents map
                reject(err); 
            } else {
                console.log(`[WebTorrentService] Torrent removed from client: ${torrent.customName}`);
                resolve();
            }
          });
      }).catch(err => console.error("Removal promise rejection:", err)); // Catch potential rejection if not handled by caller

      this.activeTorrents.delete(torrent.magnetURI);
      if (torrent.infoHash) { // Ensure infoHash exists
        this.torrentRemovedListeners.forEach(listener => listener(torrent.infoHash));
      }
      console.log(`[WebTorrentService] Torrent removed from active list: ${torrent.customName}`);
    }
  }

  pauseTorrent(infoHashOrMagnetURI: string): void {
    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent && !torrent.paused) {
      torrent.pause();
      this.notifyProgress(torrent, 'paused');
      console.log(`[WebTorrentService] Torrent paused: ${torrent.customName}`);
    }
  }

  resumeTorrent(infoHashOrMagnetURI: string): void {
    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent && torrent.paused) {
      torrent.resume();
      // Status will be determined by notifyProgress based on actual state (e.g. downloading, connecting)
      this.notifyProgress(torrent); 
      console.log(`[WebTorrentService] Torrent resumed: ${torrent.customName}`);
    }
  }
  
  onTorrentProgress(listener: (progress: TorrentProgress) => void): () => void {
    this.progressListeners.push(listener);
    return () => { this.progressListeners = this.progressListeners.filter(l => l !== listener); };
  }
  onTorrentAdded(listener: (torrent: Torrent) => void): () => void {
    this.torrentAddedListeners.push(listener);
    return () => { this.torrentAddedListeners = this.torrentAddedListeners.filter(l => l !== listener); };
  }
  onTorrentRemoved(listener: (infoHash: string) => void): () => void {
    this.torrentRemovedListeners.push(listener);
    return () => { this.torrentRemovedListeners = this.torrentRemovedListeners.filter(l => l !== listener); };
  }
  onTorrentDone(listener: (torrent: Torrent) => void): () => void {
    this.torrentDoneListeners.push(listener);
    return () => { this.torrentDoneListeners = this.torrentDoneListeners.filter(l => l !== listener); };
  }
  onTorrentError(listener: (torrent: Torrent | null, error: Error | string) => void): () => void {
    this.torrentErrorListeners.push(listener);
    return () => { this.torrentErrorListeners = this.torrentErrorListeners.filter(l => l !== listener); };
  }
  onHistoryUpdated(listener: () => void): () => void {
    this.historyUpdatedListeners.push(listener);
    return () => { this.historyUpdatedListeners = this.historyUpdatedListeners.filter(l => l !== listener); };
  }
}

const webTorrentService = new WebTorrentService();
export default webTorrentService;
