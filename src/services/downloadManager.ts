// src/services/downloadManager.ts

import { DownloadTask, DownloadTaskCreationData } from '../types/download';
import aria2Client, { Aria2StatusResponse } from '../lib/aria2Client'; // Added
import { config as serverConfig } from '../server/config'; // Added
import path from 'path'; // Added
import fs from 'fs/promises'; // Added

/**
 * Maps Aria2 status strings to DownloadTask status strings.
 */
function mapAria2StatusToDownloadTaskStatus(aria2Status: Aria2StatusResponse['status']): DownloadTask['status'] {
  switch (aria2Status) {
    case 'active':
      return 'downloading';
    case 'waiting':
      return 'queued'; // Or 'initializing' depending on context, 'queued' seems more appropriate for Aria2 'waiting'
    case 'paused':
      return 'paused';
    case 'error':
      return 'error';
    case 'complete':
      return 'completed';
    case 'removed':
      return 'cancelled'; // Or a new 'removed' status if desired
    default:
      console.warn(`[DownloadManager] Unknown Aria2 status: ${aria2Status}`);
      return 'error'; // Fallback to 'error' for unknown statuses
  }
}


/**
 * DownloadManager handles the lifecycle of download tasks.
 * It's responsible for adding, monitoring, and managing downloads.
 * This implementation now interacts with an Aria2 backend.
 */
export class DownloadManager {
  private tasks: Map<string, DownloadTask>;

  constructor() {
    this.tasks = new Map<string, DownloadTask>();
    console.log("[DownloadManager] Initialized");
  }

  async addTask(taskData: DownloadTaskCreationData): Promise<DownloadTask> {
    console.log(`[DownloadManager] addTask called with:`, taskData);
    const now = new Date();

    let specificPath;
    const baseTitle = taskData.metadata.seriesTitle || taskData.title;
    // Basic sanitization: replace non-alphanumeric (excluding common separators) with empty, then spaces with underscores.
    const sanitizedTitle = baseTitle.replace(/[^a-zA-Z0-9\-_.,!@#$%^&()=+ ]/g, '').replace(/\s+/g, '_');


    if (taskData.type === 'movie') {
        specificPath = path.join('movies', sanitizedTitle);
    } else if (taskData.type === 'tvEpisode' && taskData.metadata.seriesTitle && typeof taskData.metadata.seasonNumber === 'number') {
        const sanitizedSeriesTitle = taskData.metadata.seriesTitle.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '_');
        specificPath = path.join('tv-shows', sanitizedSeriesTitle, `Season_${String(taskData.metadata.seasonNumber).padStart(2, '0')}`);
    } else if (taskData.type === 'tvSeason' && taskData.metadata.seriesTitle && typeof taskData.metadata.seasonNumber === 'number') {
        const sanitizedSeriesTitle = taskData.metadata.seriesTitle.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '_');
        specificPath = path.join('tv-shows', sanitizedSeriesTitle, `Season_${String(taskData.metadata.seasonNumber).padStart(2, '0')}_Pack`);
    } else if (taskData.type === 'youtube') {
        specificPath = path.join('youtube', sanitizedTitle);
    } else {
        specificPath = path.join('others', sanitizedTitle);
    }
    const downloadDir = path.join(serverConfig.downloadBasePath, specificPath);

    try {
      await fs.mkdir(downloadDir, { recursive: true });
    } catch (mkdirError) {
      console.error(`[DownloadManager] Failed to create directory ${downloadDir}:`, mkdirError);
      // Depending on policy, might want to throw or default to a base path
      throw new Error(`Failed to create download directory: ${(mkdirError as Error).message}`);
    }
    
    const aria2Options: Record<string, any> = { dir: downloadDir };
    if (taskData.metadata.filename) { // e.g., for YouTube downloads with specific output filename
      aria2Options.out = taskData.metadata.filename;
    }

    let gid: string;
    try {
      console.log(`[DownloadManager] Adding URI to Aria2: ${taskData.source}, Options: ${JSON.stringify(aria2Options)}`);
      gid = await aria2Client.addUri(taskData.source, aria2Options);
    } catch (ariaError) {
      console.error(`[DownloadManager] Failed to add URI to Aria2 for source ${taskData.source}:`, ariaError);
      throw new Error(`Aria2 failed to add download: ${(ariaError as Error).message}`);
    }

    const initialAria2Status = await aria2Client.tellStatus(gid);
    
    const completedLength = parseFloat(initialAria2Status.completedLength) || 0;
    const totalLength = parseFloat(initialAria2Status.totalLength) || 0;
    const progress = totalLength > 0 ? (completedLength / totalLength) * 100 : 0;

    const newTask: DownloadTask = {
      id: gid, // Use GID from Aria2 as our task ID
      title: taskData.title,
      type: taskData.type,
      source: taskData.source,
      progress: progress,
      status: mapAria2StatusToDownloadTaskStatus(initialAria2Status.status),
      destinationPath: downloadDir,
      fileSize: totalLength || null,
      downloadedSize: completedLength,
      speed: parseFloat(initialAria2Status.downloadSpeed) || null,
      eta: initialAria2Status.eta ? parseInt(initialAria2Status.eta, 10) : null,
      createdAt: now,
      updatedAt: now,
      error: initialAria2Status.errorCode ? `${initialAria2Status.errorCode} - ${initialAria2Status.errorMessage}` : null,
      metadata: taskData.metadata,
    };

    this.tasks.set(gid, newTask);
    console.log(`[DownloadManager] Task ${gid} added to Aria2 and manager. Path: ${downloadDir}, Title: ${newTask.title}`);
    return newTask;
  }

  async getTaskById(id: string): Promise<DownloadTask | undefined> {
    console.log(`[DownloadManager] getTaskById called for id:`, id);
    return this.tasks.get(id);
  }

  async getAllTasks(): Promise<DownloadTask[]> {
    console.log("[DownloadManager] getAllTasks called");
    return Array.from(this.tasks.values());
  }

  async pauseTask(id: string): Promise<DownloadTask | undefined> {
    console.log(`[DownloadManager] pauseTask called for id:`, id);
    const task = this.tasks.get(id);
    if (task && (task.status === 'downloading' || task.status === 'queued' || task.status === 'initializing')) {
      task.status = 'paused';
      task.updatedAt = new Date();
      task.speed = 0; // Reset speed when paused
      this.tasks.set(id, task);
      return task;
    }
    return undefined;
  }

  async resumeTask(id: string): Promise<DownloadTask | undefined> {
    console.log(`[DownloadManager] resumeTask called for id:`, id);
    const task = this.tasks.get(id);
    if (task && task.status === 'paused') {
      // If it was paused, it should go back to downloading, or queued if it never started.
      // For simplicity, let's assume 'downloading' for active resume.
      // A more sophisticated check might see if progress > 0 to determine if it should be 'downloading' or 'queued'.
      task.status = 'downloading'; 
      task.updatedAt = new Date();
      this.tasks.set(id, task);
      return task;
    }
    return undefined;
  }

  async cancelTask(id: string): Promise<DownloadTask | undefined> {
    console.log(`[DownloadManager] cancelTask called for id:`, id);
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'cancelled';
      task.updatedAt = new Date();
      task.progress = 0; // Optional: reset progress
      task.speed = 0;
      task.eta = null;
      this.tasks.set(id, task);
      // For a real cancel, you might remove it from the list: this.tasks.delete(id);
      // But for stubbing, 'cancelled' status is fine.
      return task;
    }
    return undefined;
  }

  async getTaskProgress(id: string): Promise<{ progress: number; speed: number | null; eta: number | null } | undefined> {
    console.log(`[DownloadManager] getTaskProgress called for id:`, id);
    const task = this.tasks.get(id);
    if (task) {
      // Simulate some progress for testing if the task is 'downloading'
      if (task.status === 'downloading') {
        if (task.progress < 100) {
          task.progress = Math.min(task.progress + 5, 100); // Increment progress by 5%
          task.downloadedSize = task.fileSize ? (task.fileSize * task.progress) / 100 : task.downloadedSize + 1024 * 1024; // Simulate downloaded size
          task.updatedAt = new Date();
        }
        task.speed = 1024 * 500; // Simulate 500 KB/s
        task.eta = task.fileSize && task.speed ? (task.fileSize - task.downloadedSize) / task.speed : 60; // Simulate ETA
        if (task.progress === 100) {
            task.status = 'completed';
            task.speed = 0;
            task.eta = 0;
        }
        this.tasks.set(id, task);
      }
      return { progress: task.progress, speed: task.speed, eta: task.eta };
    }
    return undefined;
  }
}

const downloadManager = new DownloadManager();
export default downloadManager;
