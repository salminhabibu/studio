// src/lib/webtorrent-service.ts
// This file is effectively stubbed out as active WebTorrent functionality is removed for the UI template.
// You can re-implement client-side WebTorrent logic here if needed in the future.

import { Buffer } from 'buffer'; 

// Polyfills - kept for potential future use if client-side JS needs them, but not critical for UI template
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
  }
   if (typeof (window as any).ConnPool === 'undefined') {
    (window as any).ConnPool = class ConnPool {};
  }
}


// Actual WebTorrent import can be removed if no client-side logic remains
// import ActualWebTorrent from 'webtorrent';
// import type { Instance as WebTorrentInstance, Torrent as WebTorrentAPITorrent, TorrentFile as WebTorrentAPITorrentFile } from 'webtorrent';


// Keep type exports if other UI components (like DownloadsPage stub) still reference them.
// Otherwise, these can be removed or simplified.
export interface TorrentFile {/* Stubbed */}
export interface Torrent { /* Stubbed */
  customName?: string;
  addedDate?: Date;
  itemId?: string | number;
  infoHash?: string;
  magnetURI?: string;
  name?: string;
  length?: number;
  progress?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  numPeers?: number;
  timeRemaining?: number;
  downloaded?: number;
  done?: boolean;
  paused?: boolean;
  ready?: boolean;
  statusForHistory?: HistoryItem['status'];
  lastProgressTime?: number;
  noPeersReason?: string;
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

// const HISTORY_STORAGE_KEY = 'chillymovies_download_history_v2'; // Not used if stubbed

class WebTorrentServiceStub {
  constructor() {
    console.log("[WebTorrentService] Stubbed: Not active in UI Template Mode.");
  }

  public async getClient(): Promise<null> { // Returns null as there's no active client
    console.log("[WebTorrentService] getClient() called - returning null (Stubbed).");
    return null;
  }

  public getDownloadHistory(): HistoryItem[] {
    console.log("[WebTorrentService] getDownloadHistory() called - returning empty array (Stubbed).");
    return [];
  }

  public clearHistory(): void {
    console.log("[WebTorrentService] clearHistory() called (Stubbed).");
  }

  public removeFromHistory(infoHash: string): void {
    console.log(`[WebTorrentService] removeFromHistory(${infoHash}) called (Stubbed).`);
  }

  async addTorrent(magnetURI: string, itemName?: string, itemId?: string | number): Promise<null> {
    console.log(`[WebTorrentService] addTorrent for "${itemName || magnetURI}" called - returning null (Stubbed).`);
    return null;
  }
  
  getAllTorrentsProgress(): TorrentProgress[] {
    console.log("[WebTorrentService] getAllTorrentsProgress() called - returning empty array (Stubbed).");
    return [];
  }

  async removeTorrent(infoHashOrMagnetURI: string): Promise<void> {
    console.log(`[WebTorrentService] removeTorrent(${infoHashOrMagnetURI}) called (Stubbed).`);
  }

  pauseTorrent(infoHashOrMagnetURI: string): void {
    console.log(`[WebTorrentService] pauseTorrent(${infoHashOrMagnetURI}) called (Stubbed).`);
  }

  resumeTorrent(infoHashOrMagnetURI: string): void {
    console.log(`[WebTorrentService] resumeTorrent(${infoHashOrMagnetURI}) called (Stubbed).`);
  }
  
  getTorrent(infoHashOrMagnetURI: string): undefined { // Always undefined for stub
    console.log(`[WebTorrentService] getTorrent(${infoHashOrMagnetURI}) called - returning undefined (Stubbed).`);
    return undefined;
  }

  async getLargestFileForStreaming(infoHashOrMagnetURI: string): Promise<null> {
     console.log(`[WebTorrentService] getLargestFileForStreaming(${infoHashOrMagnetURI}) called - returning null (Stubbed).`);
    return null;
  }

  // Listener stubs - they return empty unsubscribe functions
  onTorrentProgress(listener: (progress: TorrentProgress) => void): () => void { return () => {}; }
  onTorrentAdded(listener: (torrent: Torrent) => void): () => void { return () => {}; }
  onTorrentRemoved(listener: (infoHash: string) => void): () => void { return () => {}; }
  onTorrentDone(listener: (torrent: Torrent) => void): () => void { return () => {}; }
  onTorrentError(listener: (torrent: Partial<Torrent> | null, error: Error | string) => void): () => void { return () => {}; }
  onHistoryUpdated(listener: () => void): () => void { return () => {}; }
}

const webTorrentServiceStub = new WebTorrentServiceStub();
export default webTorrentServiceStub;

// export {}; // Keep if needed for module augmentation, otherwise can remove
