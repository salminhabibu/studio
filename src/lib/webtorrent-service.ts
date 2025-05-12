// src/lib/webtorrent-service.ts
import { Buffer } from 'buffer'; // Import Buffer at the top

// Polyfills - must run before any code that might depend on them
if (typeof window !== 'undefined') {
  if (typeof (window as any).Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
  }
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = {};
  }
  const gProcess = (window as any).process;
  if (typeof gProcess.env === 'undefined') gProcess.env = {};
  if (typeof gProcess.env.DEBUG === 'undefined') gProcess.env.DEBUG = undefined;
  if (typeof gProcess.browser === 'undefined') gProcess.browser = true;
  if (typeof gProcess.version === 'undefined') gProcess.version = 'v0.0.0';
  if (typeof gProcess.versions === 'undefined') gProcess.versions = { node: '0.0.0' };
  if (typeof gProcess.nextTick === 'undefined') {
    gProcess.nextTick = (callback: (...args: any[]) => void, ...args: any[]) => {
      const currentArgs = args.slice();
      setTimeout(() => callback.apply(null, currentArgs), 0);
    };
  }
  if (typeof (window as any).global === 'undefined') {
    (window as any).global = window;
  }
  if (typeof (window as any).common === 'undefined') {
    (window as any).common = {
        WEBRTC_SUPPORT: true, 
        globals: {}, 
    };
    console.warn('[WebTorrentService Polyfill] Defined a minimal global "common" object with WEBRTC_SUPPORT.');
  }
  // Add polyfill for 'os' module
  if (typeof (window as any).os === 'undefined') {
    (window as any).os = {
      EOL: '\n',
      platform: function () { return 'browser'; },
      release: function () { return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'; },
      tmpdir: function () { return '/tmp'; },
      homedir: function () { return '/'; },
      cpus: function () { return []; },
      arch: function () { return typeof navigator !== 'undefined' ? navigator.platform : 'unknown'; },
      networkInterfaces: function () { return {}; }, // Common os method used by some network libs
      // Add any other os methods/properties if they are reported as missing by errors
    };
    console.warn('[WebTorrentService Polyfill] Defined a minimal global "os" object.');
  }
}

// Import WebTorrent types, but use dynamic import for the runtime
import type { Instance as WebTorrentInstance, Torrent as WebTorrentAPITorrent, TorrentFile as WebTorrentAPITorrentFile } from 'webtorrent';

// Ensure ActualWebTorrent is only imported and used on the client-side
let ActualWebTorrent: any = null; // Will be assigned after dynamic import


export interface TorrentFile extends WebTorrentAPITorrentFile {}

export interface Torrent extends WebTorrentAPITorrent {
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  statusForHistory?: HistoryItem['status'];
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
  status: 'idle' | 'downloading' | 'seeding' | 'paused' | 'error' | 'connecting' | 'done' | 'metadata';
};

export interface HistoryItem {
  infoHash: string;
  magnetURI: string;
  name: string;
  itemId?: string | number;
  addedDate: string;
  completedDate?: string;
  status: 'completed' | 'failed' | 'removed' | 'active' | 'error';
  size?: number;
  lastError?: string;
}

const HISTORY_STORAGE_KEY = 'chillymovies_download_history_v2';

class WebTorrentService {
  private client: WebTorrentInstance | null = null;
  private activeTorrents: Map<string, Torrent> = new Map(); // magnetURI -> Torrent
  private initializationPromise: Promise<void> | null = null;

  private progressListeners: Array<(progress: TorrentProgress) => void> = [];
  private torrentAddedListeners: Array<(torrent: Torrent) => void> = [];
  private torrentRemovedListeners: Array<(infoHash: string) => void> = [];
  private torrentDoneListeners: Array<(torrent: Torrent) => void> = [];
  private torrentErrorListeners: Array<(torrent: Torrent | { infoHash: string, magnetURI: string, customName?: string }, error: Error | string) => void> = [];
  private historyUpdatedListeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializationPromise = this.initializeClient();
    }
  }

  private async initializeClient(): Promise<void> {
    if (this.client || typeof window === 'undefined') {
      console.log('[WebTorrentService] Client already initialized or not in browser.');
      return;
    }
    if (this.initializationPromise && this.client) { // Check if client is already set by a concurrent call
        console.log('[WebTorrentService] Initialization already completed or in progress by another call.');
        return this.initializationPromise;
    }
    // Create a new promise if one doesn't exist or if client is not set
    if (!this.initializationPromise || !this.client) {
        this.initializationPromise = (async () => {
            console.log('[WebTorrentService] Initializing WebTorrent client...');
            try {
              const WebTorrentModule = await import('webtorrent');
              ActualWebTorrent = WebTorrentModule.default || WebTorrentModule;
        
              this.client = new ActualWebTorrent() as WebTorrentInstance;
              this.client.on('error', (err) => {
                console.error('[WebTorrentService] Global Client error:', err);
                this.torrentErrorListeners.forEach(listener => listener({infoHash: 'global', magnetURI: 'global'}, err as Error));
              });
              console.log('[WebTorrentService] WebTorrent client initialized successfully.');
            } catch (error) {
              console.error('[WebTorrentService] Failed to initialize WebTorrent client:', error);
              this.torrentErrorListeners.forEach(listener => listener({infoHash: 'global_init_fail', magnetURI: 'global_init_fail'}, error instanceof Error ? error : String(error) ));
              this.initializationPromise = null; // Reset promise on failure to allow retry
              throw error; 
            }
        })();
    }
    return this.initializationPromise;
  }

  public async getClient(): Promise<WebTorrentInstance | null> {
    if (!this.client && typeof window !== 'undefined') {
      await this.initializeClient(); // Ensure initialization is complete
    }
    return this.client;
  }

  private getHistory(): HistoryItem[] {
    if (typeof window === 'undefined') return [];
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    try {
        return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
        console.error("[WebTorrentService] Error parsing history from localStorage:", e);
        return [];
    }
  }

  private saveHistory(history: HistoryItem[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        this.historyUpdatedListeners.forEach(listener => listener());
    } catch (e) {
        console.error("[WebTorrentService] Error saving history to localStorage:", e);
    }
  }

  private updateHistoryItem(torrent: Torrent, status: HistoryItem['status'], errorMessage?: string) {
    const history = this.getHistory();
    const existingIndex = history.findIndex(item => item.infoHash === torrent.infoHash);
    const now = new Date().toISOString();

    if (existingIndex > -1) {
      history[existingIndex].status = status;
      if (status === 'completed' || status === 'failed' || status === 'error') {
        history[existingIndex].completedDate = now;
      }
      if (torrent.length && !history[existingIndex].size) {
        history[existingIndex].size = torrent.length;
      }
      if (errorMessage) {
          history[existingIndex].lastError = errorMessage;
      }
    } else { // Only add if new or status implies it should be added
      history.unshift({
        infoHash: torrent.infoHash || torrent.magnetURI, // Use magnet as fallback if infoHash not yet available
        magnetURI: torrent.magnetURI,
        name: torrent.customName || torrent.name || 'Unknown Torrent',
        itemId: torrent.itemId,
        addedDate: torrent.addedDate?.toISOString() || now,
        status: status,
        size: torrent.length,
        lastError: errorMessage,
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

  async addTorrent(magnetURI: string, itemName?: string, itemId?: string | number): Promise<Torrent | null> {
    const client = await this.getClient();
    if (!client) {
      console.error('[WebTorrentService] Client not initialized for addTorrent.');
      this.torrentErrorListeners.forEach(listener => listener({infoHash: 'unknown', magnetURI: magnetURI, customName: itemName}, 'Client not initialized'));
      return null;
    }

    if (this.activeTorrents.has(magnetURI)) {
      console.log(`[WebTorrentService] Torrent already in active session: ${itemName || magnetURI}`);
      return this.activeTorrents.get(magnetURI)!;
    }
    
    const existingHistoryItem = this.getHistory().find(item => item.magnetURI === magnetURI && item.status !== 'removed');
    if(existingHistoryItem && this.getTorrent(existingHistoryItem.infoHash)){
      console.log(`[WebTorrentService] Torrent ${itemName || magnetURI} with infoHash ${existingHistoryItem.infoHash} already exists from history.`);
      return this.getTorrent(existingHistoryItem.infoHash) || null;
    }


    console.log(`[WebTorrentService] Attempting to add torrent: ${itemName || magnetURI}`);
    
    return new Promise<Torrent | null>((resolve, reject) => {
        let torrentInstance: Torrent | null = null;
        try {
            torrentInstance = client.add(magnetURI, {
            }, (t: WebTorrentAPITorrent) => {
              const enhancedTorrent = t as Torrent;
              enhancedTorrent.customName = itemName || t.name || 'Unnamed Torrent';
              enhancedTorrent.addedDate = new Date();
              enhancedTorrent.itemId = itemId;
              enhancedTorrent.statusForHistory = 'active';

              console.log(`[WebTorrentService] Torrent metadata ready for: ${enhancedTorrent.customName} (InfoHash: ${enhancedTorrent.infoHash})`);
              this.activeTorrents.set(magnetURI, enhancedTorrent); // Store by magnetURI for initial lookup
              if (enhancedTorrent.infoHash) { // Also store by infoHash once available
                this.activeTorrents.set(enhancedTorrent.infoHash, enhancedTorrent);
              }
              this.updateHistoryItem(enhancedTorrent, 'active');
              this.torrentAddedListeners.forEach(listener => listener(enhancedTorrent));
              this.setupTorrentEventListeners(enhancedTorrent);
              this.notifyProgress(enhancedTorrent, 'metadata');
              resolve(enhancedTorrent);
            }) as Torrent;

            if (torrentInstance) {
                const tempConnectingTorrent = {
                    infoHash: torrentInstance.infoHash || magnetURI, 
                    magnetURI: magnetURI,
                    customName: itemName || 'Connecting...',
                    addedDate: new Date(),
                    itemId: itemId,
                    length: 0,
                 } as Torrent;
                this.notifyProgress(tempConnectingTorrent, 'connecting');

                torrentInstance.once('error', (err: any) => {
                    const errorMsg = err.message || String(err);
                    console.error(`[WebTorrentService] Error early in torrent lifecycle for ${itemName || magnetURI}:`, errorMsg);
                    
                    this.activeTorrents.delete(magnetURI);

                    const errorTorrentStub = {
                        infoHash: torrentInstance?.infoHash || magnetURI,
                        magnetURI: magnetURI,
                        customName: itemName || 'Failed Torrent',
                        addedDate: new Date(),
                        itemId: itemId,
                        length: 0,
                    } as Torrent;
                    this.updateHistoryItem(errorTorrentStub, 'error', errorMsg);
                    this.notifyProgress(errorTorrentStub, 'error');
                    this.torrentErrorListeners.forEach(listener => listener(errorTorrentStub, errorMsg));
                    reject(new Error(errorMsg)); 
                });
            } else {
                 console.error('[WebTorrentService] client.add returned null or undefined.');
                 reject(new Error('Failed to initiate torrent addition by client.add'));
            }

        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.error('[WebTorrentService] Error in client.add call:', errorMsg);
            const errorTorrentStub = {
                infoHash: magnetURI, 
                magnetURI: magnetURI,
                customName: itemName || 'Failed Torrent (client.add error)',
                addedDate: new Date(),
                itemId: itemId,
                length: 0,
            } as Torrent;
            this.updateHistoryItem(errorTorrentStub, 'error', errorMsg);
            this.torrentErrorListeners.forEach(listener => listener(errorTorrentStub, errorMsg));
            reject(error);
        }
    }).catch(error => {
        console.error(`[WebTorrentService] Promise rejected for addTorrent ${itemName || magnetURI}:`, error);
        return null; 
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
    torrent.on('error', (err: any) => {
        const errorMsg = err.message || String(err);
        console.error(`[WebTorrentService] Torrent error (${torrent.customName || torrent.infoHash}):`, errorMsg);
        torrent.statusForHistory = 'error';
        this.updateHistoryItem(torrent, 'error', errorMsg);
        this.notifyProgress(torrent, 'error');
        this.torrentErrorListeners.forEach(listener => listener(torrent, errorMsg));
    });
    torrent.on('noPeers', (announceType) => {
        console.warn(`[WebTorrentService] No peers found for torrent ${torrent.customName} on ${announceType} tracker.`);
    });
  }

  private notifyProgress(torrent: Torrent, statusOverride?: TorrentProgress['status']) {
    if (!torrent || (!torrent.infoHash && !torrent.magnetURI) ) {
        if (torrent && (statusOverride === 'error' || statusOverride === 'failed')) {
             const progressData: TorrentProgress = {
                torrentId: torrent.infoHash || torrent.magnetURI,
                progress: 0, downloadSpeed: 0, uploadSpeed: 0, peers: 0,
                downloaded: 0, length: torrent.length,
                customName: torrent.customName || torrent.name || "Error initializing torrent",
                addedDate: torrent.addedDate || new Date(),
                itemId: torrent.itemId,
                status: statusOverride,
            };
            this.progressListeners.forEach(listener => listener(progressData));
        }
        return;
    }

    let currentStatus: TorrentProgress['status'] = statusOverride || 'connecting';
    if (!statusOverride) { 
        if (torrent.done) currentStatus = 'done';
        else if (torrent.paused) currentStatus = 'paused';
        else if (torrent.ready && torrent.progress === 0 && torrent.downloadSpeed === 0 && torrent.numPeers === 0) currentStatus = 'connecting'; 
        else if (torrent.ready && torrent.progress < 1) currentStatus = 'downloading';
        else if (torrent.ready && torrent.progress === 1 && !torrent.done) currentStatus = 'seeding';
        else if (!torrent.ready) currentStatus = 'metadata'; 
    }


    const progressData: TorrentProgress = {
      torrentId: torrent.infoHash, 
      progress: torrent.progress || 0,
      downloadSpeed: torrent.downloadSpeed || 0,
      uploadSpeed: torrent.uploadSpeed || 0,
      peers: torrent.numPeers || 0,
      remainingTime: torrent.timeRemaining,
      downloaded: torrent.downloaded || 0,
      length: torrent.length,
      customName: torrent.customName || torrent.name || (torrent.infoHash ? `Torrent ${torrent.infoHash.substring(0,8)}...` : "Loading..."),
      addedDate: torrent.addedDate,
      itemId: torrent.itemId,
      status: currentStatus,
    };
    this.progressListeners.forEach(listener => listener(progressData));
  }

  getTorrent(infoHashOrMagnetURI: string): Torrent | undefined {
    // Prioritize infoHash if it's likely an infoHash
    if (infoHashOrMagnetURI.length === 40 && /^[a-f0-9]+$/i.test(infoHashOrMagnetURI)) {
      for (const torrent of this.activeTorrents.values()) {
        if (torrent.infoHash === infoHashOrMagnetURI) return torrent;
      }
    }
    // Then check by magnet URI (which might also be used as infoHash key if infoHash wasn't ready initially)
    if (this.activeTorrents.has(infoHashOrMagnetURI)) { 
        return this.activeTorrents.get(infoHashOrMagnetURI);
    }
    // Fallback to client.get() if infoHash was provided
    if (this.client && infoHashOrMagnetURI.length === 40 && /^[a-f0-9]+$/i.test(infoHashOrMagnetURI)) { 
        const clientTorrent = this.client.get(infoHashOrMagnetURI);
        if (clientTorrent) return clientTorrent as Torrent;
    }
    return undefined;
  }

  getAllTorrentsProgress(): TorrentProgress[] {
    const progressList: TorrentProgress[] = [];
    this.activeTorrents.forEach(torrent => {
      // Only consider unique torrents by infoHash if available, otherwise magnetURI
      const id = torrent.infoHash || torrent.magnetURI;
      if (!id || progressList.some(p => p.torrentId === id && torrent.infoHash)) return;


      let status: TorrentProgress['status'];
      if (torrent.statusForHistory === 'error' || torrent.statusForHistory === 'failed') status = 'error';
      else if (torrent.done) status = 'done';
      else if (torrent.paused) status = 'paused';
      else if (!torrent.ready) status = 'metadata';
      else if (torrent.progress < 1 && (torrent.downloadSpeed > 0 || torrent.downloaded > 0 || torrent.numPeers > 0)) status = 'downloading';
      else if (torrent.progress === 1 && !torrent.done) status = 'seeding';
      else status = 'connecting';


      progressList.push({
        torrentId: id, 
        progress: torrent.progress || 0,
        downloadSpeed: torrent.downloadSpeed || 0,
        uploadSpeed: torrent.uploadSpeed || 0,
        peers: torrent.numPeers || 0,
        remainingTime: torrent.timeRemaining,
        downloaded: torrent.downloaded || 0,
        length: torrent.length,
        customName: torrent.customName || torrent.name || (id.startsWith('magnet:') ? "Loading..." : `Torrent ${id.substring(0,8)}...`),
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
      const finalStatusForHistory = torrent.statusForHistory === 'completed' ? 'completed' :
                                   (torrent.statusForHistory === 'error' || torrent.statusForHistory === 'failed' ? 'failed' : 'removed');
      this.updateHistoryItem(torrent, finalStatusForHistory, torrent.statusForHistory === 'error' ? "Torrent removed by user after error" : undefined);

      const magnetToRemove = torrent.magnetURI;
      const infoHashToRemove = torrent.infoHash;

      client.remove(magnetToRemove, { destroyStore: true }, (err) => { 
        if (err) {
            console.error(`[WebTorrentService] Error removing torrent ${torrent.customName || magnetToRemove} from client:`, err);
        } else {
            console.log(`[WebTorrentService] Torrent removed from client: ${torrent.customName || magnetToRemove}`);
        }
      });

      // Remove from our activeTorrents map by both magnet and infoHash
      this.activeTorrents.delete(magnetToRemove);
      if(infoHashToRemove) this.activeTorrents.delete(infoHashToRemove);


      if (infoHashToRemove) {
        this.torrentRemovedListeners.forEach(listener => listener(infoHashToRemove));
      }
      console.log(`[WebTorrentService] Torrent removed from active list: ${torrent.customName || magnetToRemove}`);
    } else {
        console.warn(`[WebTorrentService] Attempted to remove torrent not found in active list: ${infoHashOrMagnetURI}`);
        client.remove(infoHashOrMagnetURI, { destroyStore: true }, (err) => {
            if (err) console.error(`[WebTorrentService] Error directly removing unknown torrent ${infoHashOrMagnetURI} from client:`, err);
            else console.log(`[WebTorrentService] Directly removed unknown torrent ${infoHashOrMagnetURI} from client.`);
        });
        const history = this.getHistory();
        const historyItem = history.find(h => h.infoHash === infoHashOrMagnetURI || h.magnetURI === infoHashOrMagnetURI);
        if (historyItem) {
            this.updateHistoryItem({ infoHash: historyItem.infoHash, magnetURI: historyItem.magnetURI, name: historyItem.name } as Torrent, 'removed');
        }

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

  // --- Event Listener Subscriptions ---
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
  onTorrentError(listener: (torrent: Torrent | { infoHash: string, magnetURI: string, customName?: string }, error: Error | string) => void): () => void {
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

