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
    // console.warn('[WebTorrentService Polyfill] Defined a minimal global "common" object with WEBRTC_SUPPORT.');
  }
  if (typeof (window as any).os === 'undefined') {
    (window as any).os = {
      EOL: '\n',
      platform: function () { return 'browser'; },
      release: function () { return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'; },
      tmpdir: function () { return '/tmp'; },
      homedir: function () { return '/'; },
      cpus: function () { return []; },
      arch: function () { return typeof navigator !== 'undefined' ? navigator.platform : 'unknown'; },
      networkInterfaces: function () { return {}; }, 
    };
    // console.warn('[WebTorrentService Polyfill] Defined a minimal global "os" object.');
  }
  if (typeof (window as any).ConnPool === 'undefined') {
    (window as any).ConnPool = class ConnPool {};
    // console.warn('[WebTorrentService Polyfill] Defined a minimal global "ConnPool" object.');
  }
}

import type { Instance as WebTorrentInstance, Torrent as WebTorrentAPITorrent, TorrentFile as WebTorrentAPITorrentFile } from 'webtorrent';

let ActualWebTorrent: any = null; 


export interface TorrentFile extends WebTorrentAPITorrentFile {}

export interface Torrent extends WebTorrentAPITorrent {
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  statusForHistory?: HistoryItem['status'];
  lastProgressTime?: number; // For detecting stalls
  noPeersReason?: string; // To store why no peers
}

export type TorrentProgressStatus = 
  | 'idle' 
  | 'downloading' 
  | 'seeding' 
  | 'paused' 
  | 'error' 
  | 'connecting' 
  | 'done' 
  | 'metadata' 
  | 'stalled'
  | 'no_peers';

export type TorrentProgress = {
  torrentId: string; 
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
  status: TorrentProgressStatus;
  noPeersReason?: string; 
};

export interface HistoryItem {
  infoHash: string;
  magnetURI: string;
  name: string;
  itemId?: string | number;
  addedDate: string;
  completedDate?: string;
  status: 'completed' | 'failed' | 'removed' | 'active' | 'error' | 'stalled';
  size?: number;
  lastError?: string;
}

const HISTORY_STORAGE_KEY = 'chillymovies_download_history_v2';
const STALL_THRESHOLD_MS = 30000; // 30 seconds for stall detection

class WebTorrentService {
  private client: WebTorrentInstance | null = null;
  private activeTorrents: Map<string, Torrent> = new Map(); 
  private initializationPromise: Promise<void> | null = null;

  private progressListeners: Array<(progress: TorrentProgress) => void> = [];
  private torrentAddedListeners: Array<(torrent: Torrent) => void> = [];
  private torrentRemovedListeners: Array<(infoHash: string) => void> = [];
  private torrentDoneListeners: Array<(torrent: Torrent) => void> = [];
  private torrentErrorListeners: Array<(torrent: Partial<Torrent> | { infoHash: string, magnetURI: string, customName?: string }, error: Error | string) => void> = [];
  private historyUpdatedListeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && !this.initializationPromise) {
       this.initializationPromise = this._initializeClient();
    }
  }

  private async _initializeClient(): Promise<void> {
    if (this.client) {
      console.log('[WebTorrentService] Client already initialized.');
      return;
    }
    if (typeof window === 'undefined') {
      console.log('[WebTorrentService] Not in browser, skipping client initialization.');
      return; 
    }

    console.log('[WebTorrentService] Initializing WebTorrent client (async)...');
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
      this.initializationPromise = null; 
      throw error; 
    }
  }

  public async getClient(): Promise<WebTorrentInstance | null> {
    if (!this.client || !ActualWebTorrent) {
      if (!this.initializationPromise) {
        this.initializationPromise = this._initializeClient();
      }
      await this.initializationPromise;
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

  private updateHistoryItem(torrent: Partial<Torrent>, status: HistoryItem['status'], errorMessage?: string) {
    if (!torrent.infoHash && !torrent.magnetURI) return;
    const history = this.getHistory();
    const idKey = torrent.infoHash || torrent.magnetURI!;
    const existingIndex = history.findIndex(item => item.infoHash === idKey || item.magnetURI === idKey);
    const now = new Date().toISOString();

    const name = torrent.customName || torrent.name || 'Unknown Torrent';

    if (existingIndex > -1) {
      history[existingIndex].status = status;
      if (status === 'completed' || status === 'failed' || status === 'error' || status === 'stalled') {
        history[existingIndex].completedDate = now; // Treat stalled/failed as completed for history purposes
      }
      if (torrent.length && !history[existingIndex].size) {
        history[existingIndex].size = torrent.length;
      }
      if (errorMessage) {
          history[existingIndex].lastError = errorMessage;
      }
       history[existingIndex].name = name; // Update name if it changed
    } else { 
      history.unshift({
        infoHash: torrent.infoHash || torrent.magnetURI!, 
        magnetURI: torrent.magnetURI!,
        name: name,
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
      this.torrentErrorListeners.forEach(listener => listener({infoHash: 'add_fail_no_client', magnetURI: magnetURI, customName: itemName}, 'Client not initialized'));
      return null;
    }

    if (this.activeTorrents.has(magnetURI)) {
      const existing = this.activeTorrents.get(magnetURI)!;
      console.log(`[WebTorrentService] Torrent already in active session: ${existing.customName || magnetURI}`);
      return existing;
    }
    
    const existingFromHistory = this.getHistory().find(item => item.magnetURI === magnetURI && item.status !== 'removed' && item.status !== 'failed' && item.status !== 'error');
    if(existingFromHistory && this.getTorrent(existingFromHistory.infoHash)){
      const existingTorrent = this.getTorrent(existingFromHistory.infoHash)!;
      console.log(`[WebTorrentService] Torrent ${existingTorrent.customName || magnetURI} with infoHash ${existingFromHistory.infoHash} already exists and active.`);
      return existingTorrent;
    }

    console.log(`[WebTorrentService] Attempting to add torrent: ${itemName || magnetURI.substring(0, 60)}...`);
    
    return new Promise<Torrent | null>((resolve, reject) => {
        let torrentInstance: Torrent | null = null;
        try {
            const tempConnectingTorrent = {
                infoHash: magnetURI, 
                magnetURI: magnetURI,
                customName: itemName || 'Connecting...',
                addedDate: new Date(),
                itemId: itemId,
                length: 0,
                lastProgressTime: Date.now(),
            } as Torrent;
            this.notifyProgress(tempConnectingTorrent, 'connecting');

            torrentInstance = client.add(magnetURI, {}, (t: WebTorrentAPITorrent) => {
              const enhancedTorrent = t as Torrent;
              enhancedTorrent.customName = itemName || t.name || 'Unnamed Torrent';
              enhancedTorrent.addedDate = new Date();
              enhancedTorrent.itemId = itemId;
              enhancedTorrent.statusForHistory = 'active';
              enhancedTorrent.lastProgressTime = Date.now();

              console.log(`[WebTorrentService] Torrent metadata ready for: ${enhancedTorrent.customName} (InfoHash: ${enhancedTorrent.infoHash}, Magnet: ${magnetURI.substring(0,30)}...)`);
              this.activeTorrents.set(magnetURI, enhancedTorrent); 
              if (enhancedTorrent.infoHash && magnetURI !== enhancedTorrent.infoHash) { 
                this.activeTorrents.set(enhancedTorrent.infoHash, enhancedTorrent);
              }
              this.updateHistoryItem(enhancedTorrent, 'active');
              this.torrentAddedListeners.forEach(listener => listener(enhancedTorrent));
              this.setupTorrentEventListeners(enhancedTorrent);
              this.notifyProgress(enhancedTorrent, 'metadata');
              resolve(enhancedTorrent);
            }) as Torrent;

            if (!torrentInstance) {
                 console.error('[WebTorrentService] client.add returned null or undefined directly.');
                 throw new Error('Failed to initiate torrent addition: client.add returned null/undefined.');
            }

            torrentInstance.once('error', (err: any) => {
                const errorMsg = err.message || String(err);
                console.error(`[WebTorrentService] Error during torrent instantiation for ${itemName || magnetURI}:`, errorMsg);
                
                this.activeTorrents.delete(magnetURI);
                if (torrentInstance?.infoHash) this.activeTorrents.delete(torrentInstance.infoHash);

                const errorTorrentStub = {
                    infoHash: torrentInstance?.infoHash || magnetURI,
                    magnetURI: magnetURI,
                    customName: itemName || 'Failed Torrent (Instantiation)',
                    addedDate: new Date(),
                    itemId: itemId,
                } as Partial<Torrent>;
                this.updateHistoryItem(errorTorrentStub, 'error', errorMsg);
                this.notifyProgress(errorTorrentStub as Torrent, 'error');
                this.torrentErrorListeners.forEach(listener => listener(errorTorrentStub, errorMsg));
                reject(new Error(errorMsg)); 
            });

        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.error('[WebTorrentService] Exception in client.add call:', errorMsg, error);
            const errorTorrentStub = {
                infoHash: magnetURI, 
                magnetURI: magnetURI,
                customName: itemName || 'Failed Torrent (client.add exception)',
                addedDate: new Date(),
                itemId: itemId,
            } as Partial<Torrent>;
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
    const updateLastProgressTime = () => { torrent.lastProgressTime = Date.now(); };
    torrent.on('download', (bytes) => { 
        updateLastProgressTime();
        this.notifyProgress(torrent, 'downloading');
        // console.debug(`[WebTorrentService] ${torrent.customName} downloaded ${bytes} bytes`);
    });
    torrent.on('upload', () => {
        updateLastProgressTime();
        this.notifyProgress(torrent, torrent.done ? 'seeding' : 'downloading');
    });
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
    torrent.on('warning', (warn: any) => {
        const warnMsg = warn.message || String(warn);
        console.warn(`[WebTorrentService] Torrent warning (${torrent.customName || torrent.infoHash}):`, warnMsg);
         if (warnMsg.toLowerCase().includes('no peers found')) {
             torrent.noPeersReason = warnMsg;
             this.notifyProgress(torrent, 'no_peers');
         }
    });
    torrent.on('noPeers', (announceType) => {
        console.warn(`[WebTorrentService] No peers found for torrent ${torrent.customName} on ${announceType} tracker.`);
        torrent.noPeersReason = `No peers on ${announceType} tracker.`;
        this.notifyProgress(torrent, 'no_peers');
    });
     torrent.on('metadata', () => {
        console.log(`[WebTorrentService] Metadata received for ${torrent.customName}`);
        torrent.lastProgressTime = Date.now(); // Reset timer on metadata
        this.notifyProgress(torrent, 'metadata');
    });
    torrent.on('ready', () => {
        console.log(`[WebTorrentService] Torrent ready (has metadata): ${torrent.customName}`);
        torrent.lastProgressTime = Date.now(); // Reset timer on ready
        this.notifyProgress(torrent); // General progress update
    });
  }

  private notifyProgress(torrent: Torrent, statusOverride?: TorrentProgressStatus) {
    if (!torrent || (!torrent.infoHash && !torrent.magnetURI) ) {
        if (torrent && (statusOverride === 'error')) { // Simplified error path
             const progressData: TorrentProgress = {
                torrentId: torrent.magnetURI || "unknown_error_torrent", // Use magnet if infoHash not available
                progress: 0, downloadSpeed: 0, uploadSpeed: 0, peers: 0,
                downloaded: 0, length: torrent.length || 0,
                customName: torrent.customName || torrent.name || "Error initializing torrent",
                addedDate: torrent.addedDate || new Date(),
                itemId: torrent.itemId,
                status: 'error', // Hardcode error status
            };
            this.progressListeners.forEach(listener => listener(progressData));
        } else {
            console.warn("[WebTorrentService] notifyProgress called with invalid torrent object:", torrent);
        }
        return;
    }

    let currentStatus: TorrentProgressStatus = statusOverride || 'connecting';
    
    if (!statusOverride) { 
        if (torrent.done) currentStatus = 'done';
        else if (torrent.paused) currentStatus = 'paused';
        else if (!torrent.ready) currentStatus = 'metadata';
        else if (torrent.numPeers === 0 && torrent.progress < 1) {
            currentStatus = 'no_peers';
            torrent.noPeersReason = torrent.noPeersReason || "Awaiting peers...";
        }
        else if (torrent.downloadSpeed === 0 && torrent.progress < 1 && torrent.numPeers > 0 && Date.now() - (torrent.lastProgressTime || 0) > STALL_THRESHOLD_MS) {
            currentStatus = 'stalled';
        }
        else if (torrent.progress < 1) currentStatus = 'downloading';
        else if (torrent.progress >= 1 && !torrent.done) currentStatus = 'seeding'; // If progress is 1 but not 'done' yet (e.g. verifying)
        else currentStatus = 'connecting'; // Default fallback
    }
    
    // If status is downloading but speed is 0 and has peers, check for stall
    if (currentStatus === 'downloading' && torrent.downloadSpeed === 0 && torrent.numPeers > 0 && Date.now() - (torrent.lastProgressTime || 0) > STALL_THRESHOLD_MS) {
        currentStatus = 'stalled';
    }


    const progressData: TorrentProgress = {
      torrentId: torrent.infoHash || torrent.magnetURI, 
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
      noPeersReason: currentStatus === 'no_peers' ? torrent.noPeersReason : undefined,
    };
    // console.debug(`[WebTorrentService] Notifying progress for ${progressData.customName}: Status ${progressData.status}, Peers ${progressData.peers}, Speed ${progressData.downloadSpeed}`);
    this.progressListeners.forEach(listener => listener(progressData));
  }

  getTorrent(infoHashOrMagnetURI: string): Torrent | undefined {
    if (!infoHashOrMagnetURI) return undefined;
    // Prioritize infoHash if it looks like one
    if (infoHashOrMagnetURI.length === 40 && /^[a-f0-9]+$/i.test(infoHashOrMagnetURI)) {
      if (this.activeTorrents.has(infoHashOrMagnetURI)) {
          return this.activeTorrents.get(infoHashOrMagnetURI);
      }
      // Check if any active torrent has this infoHash, even if keyed by magnet initially
      for (const t of this.activeTorrents.values()){
          if (t.infoHash === infoHashOrMagnetURI) return t;
      }
    }
    // Fallback to checking by magnetURI (or if infoHashOrMagnetURI was a magnet)
    if (this.activeTorrents.has(infoHashOrMagnetURI)) { 
        return this.activeTorrents.get(infoHashOrMagnetURI);
    }
    // Final attempt: check client directly if it's an infoHash
    if (this.client && infoHashOrMagnetURI.length === 40 && /^[a-f0-9]+$/i.test(infoHashOrMagnetURI)) { 
        const clientTorrent = this.client.get(infoHashOrMagnetURI);
        if (clientTorrent) return clientTorrent as Torrent;
    }
    return undefined;
  }

  getAllTorrentsProgress(): TorrentProgress[] {
    const progressList: TorrentProgress[] = [];
    this.activeTorrents.forEach(torrent => {
      // Use infoHash as primary ID if available, otherwise magnetURI
      const id = torrent.infoHash || torrent.magnetURI; 
      if (!id) {
          console.warn("[WebTorrentService] Skipping torrent in getAllTorrentsProgress due to missing ID (infoHash/magnetURI).", torrent.customName);
          return;
      }
      // Avoid duplicates if a torrent is keyed by both magnet and infoHash temporarily
      if (progressList.some(p => p.torrentId === id && torrent.infoHash)) return;

      let status: TorrentProgressStatus;
      if (torrent.statusForHistory === 'error') status = 'error';
      else if (torrent.done) status = 'done';
      else if (torrent.paused) status = 'paused';
      else if (!torrent.ready) status = 'metadata'; // Still fetching metadata
      else if (torrent.numPeers === 0 && torrent.progress < 1) {
        status = 'no_peers';
        torrent.noPeersReason = torrent.noPeersReason || "Awaiting peers...";
      }
      else if (torrent.downloadSpeed === 0 && torrent.progress < 1 && torrent.numPeers > 0 && Date.now() - (torrent.lastProgressTime || 0) > STALL_THRESHOLD_MS) {
        status = 'stalled';
      }
      else if (torrent.progress < 1) status = 'downloading';
      else if (torrent.progress >= 1 && !torrent.done) status = 'seeding'; 
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
        noPeersReason: status === 'no_peers' ? torrent.noPeersReason : undefined,
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
      console.log(`[WebTorrentService] Removing torrent: ${torrent.customName || infoHashOrMagnetURI}`);
      const finalStatusForHistory = torrent.statusForHistory === 'completed' ? 'completed' :
                                   (torrent.statusForHistory === 'error' ? 'failed' : 
                                   (torrent.statusForHistory === 'stalled' ? 'stalled' : 'removed'));
      this.updateHistoryItem(torrent, finalStatusForHistory, torrent.statusForHistory === 'error' ? "Torrent removed by user after error" : (finalStatusForHistory === 'stalled' ? 'Torrent removed while stalled' : undefined));

      const magnetToRemove = torrent.magnetURI;
      const infoHashToRemove = torrent.infoHash;

      client.remove(torrent.infoHash || torrent.magnetURI, { destroyStore: true }, (err) => { 
        if (err) {
            console.error(`[WebTorrentService] Error removing torrent ${torrent.customName || magnetToRemove} from client:`, err);
        } else {
            console.log(`[WebTorrentService] Torrent removed from client instance: ${torrent.customName || magnetToRemove}`);
        }
      });

      if (magnetToRemove) this.activeTorrents.delete(magnetToRemove);
      if(infoHashToRemove) this.activeTorrents.delete(infoHashToRemove);

      if (infoHashToRemove) {
        this.torrentRemovedListeners.forEach(listener => listener(infoHashToRemove));
      }
      // console.log(`[WebTorrentService] Torrent removed from active list map: ${torrent.customName || magnetToRemove}`);
    } else {
        console.warn(`[WebTorrentService] Attempted to remove torrent not found in active list: ${infoHashOrMagnetURI}. Trying direct client removal.`);
        client.remove(infoHashOrMagnetURI, { destroyStore: true }, (err) => {
            if (err) console.error(`[WebTorrentService] Error directly removing unknown torrent ${infoHashOrMagnetURI} from client:`, err);
            else console.log(`[WebTorrentService] Directly removed unknown torrent ${infoHashOrMagnetURI} from client.`);
        });
        // Update history if it was just a history item without active torrent
        const history = this.getHistory();
        const historyItem = history.find(h => h.infoHash === infoHashOrMagnetURI || h.magnetURI === infoHashOrMagnetURI);
        if (historyItem) {
            this.updateHistoryItem({ infoHash: historyItem.infoHash, magnetURI: historyItem.magnetURI, name: historyItem.name } as Partial<Torrent>, 'removed');
        }
    }
  }

  pauseTorrent(infoHashOrMagnetURI: string): void {
    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent && !torrent.paused) {
      torrent.pause();
      this.notifyProgress(torrent, 'paused');
      console.log(`[WebTorrentService] Torrent paused: ${torrent.customName}`);
    } else if (torrent) {
        console.warn(`[WebTorrentService] Torrent ${torrent.customName} already paused or not pausable.`);
    } else {
        console.warn(`[WebTorrentService] Torrent not found for pause: ${infoHashOrMagnetURI}`);
    }
  }

  resumeTorrent(infoHashOrMagnetURI: string): void {
    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent && torrent.paused) {
      torrent.resume();
      torrent.lastProgressTime = Date.now(); // Reset stall timer
      this.notifyProgress(torrent); 
      console.log(`[WebTorrentService] Torrent resumed: ${torrent.customName}`);
    } else if (torrent) {
      console.warn(`[WebTorrentService] Torrent ${torrent.customName} not paused or not resumable.`);
    } else {
      console.warn(`[WebTorrentService] Torrent not found for resume: ${infoHashOrMagnetURI}`);
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
  onTorrentError(listener: (torrent: Partial<Torrent> | { infoHash: string, magnetURI: string, customName?: string }, error: Error | string) => void): () => void {
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

export {};
