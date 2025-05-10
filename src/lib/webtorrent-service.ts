import WebTorrent from 'webtorrent';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

export interface TorrentFile extends WebTorrent.TorrentFile {}

export interface Torrent extends WebTorrent.Torrent {
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
  private client: WebTorrent.Instance | null = null;
  private activeTorrents: Map<string, Torrent> = new Map(); // magnetURI -> Torrent

  private progressListeners: Array<(progress: TorrentProgress) => void> = [];
  private torrentAddedListeners: Array<(torrent: Torrent) => void> = [];
  private torrentRemovedListeners: Array<(infoHash: string) => void> = [];
  private torrentDoneListeners: Array<(torrent: Torrent) => void> = [];
  private torrentErrorListeners: Array<(torrent: Torrent | null, error: Error | string) => void> = [];
  private historyUpdatedListeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeClient();
    }
  }

  private initializeClient() {
    if (this.client) return;
    console.log('[WebTorrentService] Initializing client...');
    this.client = new WebTorrent();
    this.client.on('error', (err) => {
      console.error('[WebTorrentService] Client error:', err);
      this.torrentErrorListeners.forEach(listener => listener(null, err as Error));
    });
  }

  getClient(): WebTorrent.Instance | null {
    if (!this.client) this.initializeClient();
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

  addTorrent(magnetURI: string, itemName?: string, itemId?: string | number): Torrent | null {
    const client = this.getClient();
    if (!client) {
      console.error('[WebTorrentService] Client not initialized.');
      this.torrentErrorListeners.forEach(listener => listener(null, 'Client not initialized'));
      return null;
    }

    if (this.activeTorrents.has(magnetURI)) {
      console.log(`[WebTorrentService] Torrent already in active session: ${itemName || magnetURI}`);
      return this.activeTorrents.get(magnetURI)!;
    }

    console.log(`[WebTorrentService] Adding torrent: ${itemName || magnetURI}`);
    const torrent = client.add(magnetURI, (t: WebTorrent.Torrent) => {
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
    }) as Torrent;
    
    if (torrent) {
        // If client.add returns torrent synchronously (it does for magnet URIs before metadata)
        // we might not have infoHash yet. History update might be better inside the callback.
        // However, the current structure adds to history once metadata is ready (inside the callback).
        this.notifyProgress(torrent, 'connecting');
    }
    return torrent;
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
    if (!torrent || !this.activeTorrents.has(torrent.magnetURI)) return;
    
    let currentStatus: TorrentProgress['status'] = statusOverride || 'connecting';
    if (!statusOverride) {
        if (torrent.done) currentStatus = 'done';
        else if (torrent.paused) currentStatus = 'paused'; // Check paused state
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
      let status: TorrentProgress['status'] = 'connecting';
      if (torrent.ready && torrent.progress === 0 && torrent.downloadSpeed === 0 && torrent.files && torrent.files.length === 0 && !torrent.paused) status = 'connecting';
      else if (torrent.done) status = 'done';
      else if (torrent.paused) status = 'paused';
      else if (torrent.progress < 1 && (torrent.downloadSpeed > 0 || torrent.downloaded > 0)) status = 'downloading';
      else if (torrent.progress === 1 && !torrent.done) status = 'seeding';
      else if (torrent.downloadSpeed === 0 && torrent.progress > 0 && torrent.progress < 1 && !torrent.paused) status = 'downloading'; // Could be stalled, but still downloading category
      
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

  removeTorrent(infoHashOrMagnetURI: string): void {
    const client = this.getClient();
    if (!client) return;

    const torrent = this.getTorrent(infoHashOrMagnetURI);
    if (torrent) {
      this.updateHistoryItem(torrent, torrent.statusForHistory === 'completed' ? 'completed' : 'removed'); // Keep completed status, otherwise mark as removed
      client.remove(torrent.magnetURI, (err) => {
        if (err) console.error(`[WebTorrentService] Error removing torrent ${torrent.customName}:`, err);
        else console.log(`[WebTorrentService] Torrent removed from client: ${torrent.customName}`);
      });
      this.activeTorrents.delete(torrent.magnetURI);
      this.torrentRemovedListeners.forEach(listener => listener(torrent.infoHash));
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
      this.notifyProgress(torrent, 'downloading'); 
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

