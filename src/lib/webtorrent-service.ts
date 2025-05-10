// src/lib/webtorrent-service.ts
import { Buffer } from 'buffer'; // Import Buffer at the top

// Polyfills - must run before any code that might depend on them
if (typeof window !== 'undefined') {
  // Polyfill Buffer
  if (typeof (window as any).Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
  }

  // Polyfill process
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = {};
  }

  const gProcess = (window as any).process;

  if (typeof gProcess.env === 'undefined') {
    gProcess.env = {};
  }
  // Ensure DEBUG is available, as 'debug' lib checks for it.
  if (typeof gProcess.env.DEBUG === 'undefined') {
    gProcess.env.DEBUG = undefined; 
  }

  if (typeof gProcess.browser === 'undefined') {
    gProcess.browser = true;
  }

  if (typeof gProcess.version === 'undefined') {
    gProcess.version = 'v0.0.0'; // Mock version string
  }

  if (typeof gProcess.versions === 'undefined') {
    // Provide a mock versions object; 'node' is sometimes checked
    gProcess.versions = { node: '0.0.0' }; 
  }

  if (typeof gProcess.nextTick === 'undefined') {
    gProcess.nextTick = (callback: (...args: any[]) => void, ...args: any[]) => {
      const currentArgs = args.slice(); // Capture current arguments
      setTimeout(() => callback.apply(null, currentArgs), 0);
    };
  }
  
  // Polyfill global for browser environment if some lib expects it
  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }
}


import type { Instance as WebTorrentInstance, Torrent as WebTorrentAPITorrent, TorrentFile as WebTorrentAPITorrentFile } from 'webtorrent';

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
    // Polyfills are applied at the top of the file if window is defined.
    // This check is just to prevent server-side execution.
    if (this.client || typeof window === 'undefined') return;

    console.log('[WebTorrentService] Initializing client (async)...');
    try {
      // Dynamically import WebTorrent
      const WebTorrentModule = await import('webtorrent');
      const WT = WebTorrentModule.default || WebTorrentModule; // Handle CJS/ESM export
      
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
                if (this.activeTorrents.has(magnetURI)) { 
                    this.activeTorrents.delete(magnetURI);
                }
                this.updateHistoryItem(torrentInstance, 'failed'); 
                this.notifyProgress(torrentInstance, 'error');
                resolve(null); 
            });
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
    if (!torrent || !torrent.infoHash ||!this.activeTorrents.has(torrent.magnetURI) ) return;
    
    let currentStatus: TorrentProgress['status'] = statusOverride || 'connecting';
    if (!statusOverride) { 
        if (torrent.done) currentStatus = 'done';
        else if (torrent.paused) currentStatus = 'paused';
        else if (torrent.progress > 0 && torrent.progress < 1) currentStatus = 'downloading';
        else if (torrent.progress === 1 && !torrent.done) currentStatus = 'seeding';
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
    for (const torrent of this.activeTorrents.values()) {
        if (torrent.infoHash === infoHashOrMagnetURI) return torrent;
    }
    return undefined;
  }

  getAllTorrentsProgress(): TorrentProgress[] {
    const progressList: TorrentProgress[] = [];
    this.activeTorrents.forEach(torrent => {
      if (!torrent.infoHash) return; 

      let status: TorrentProgress['status'] = 'connecting';
      if (torrent.ready && torrent.progress === 0 && torrent.downloadSpeed === 0 && torrent.files && torrent.files.length === 0 && !torrent.paused && !torrent.done) status = 'connecting';
      else if (torrent.done) status = 'done';
      else if (torrent.paused) status = 'paused';
      else if (torrent.progress < 1 && (torrent.downloadSpeed > 0 || torrent.downloaded > 0 || torrent.progress > 0)) status = 'downloading';
      else if (torrent.progress === 1 && !torrent.done) status = 'seeding';
      
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
                reject(err); 
            } else {
                console.log(`[WebTorrentService] Torrent removed from client: ${torrent.customName}`);
                resolve();
            }
          });
      }).catch(err => console.error("Removal promise rejection:", err)); 

      this.activeTorrents.delete(torrent.magnetURI);
      if (torrent.infoHash) { 
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
