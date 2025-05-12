// src/types/download.ts

export interface ConceptualAria2Task {
  taskId: string;
  name: string;
  quality: string;
  addedTime: number;
  sourceUrlOrIdentifier: string;
  type: 'magnet' | 'imdb_id' | 'tv_episode' | 'tv_season_pack' | 'tv_season_pack_all';
}

// Matches the structure returned by /api/aria2/status/[taskId] plus local fields
export interface Aria2DownloadItemDisplay {
  taskId: string;
  name: string;
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed' | 'connecting'; // Added connecting
  progress: number; // 0-100
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  totalLength?: number;
  completedLength?: number;
  connections?: number;
  downloadUrl?: string; 
  errorCode?: string;
  errorMessage?: string;
  quality?: string; // Added from ConceptualAria2Task
  addedTime?: number; // Added from ConceptualAria2Task
}
