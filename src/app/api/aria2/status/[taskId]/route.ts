// src/app/api/aria2/status/[taskId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import downloadManager from '@/services/downloadManager'; // Adjusted path
import { DownloadTask } from '@/types/download'; // Adjusted path

// PRD Appendix A.1 (ensure it's consistent with DownloadTask)
interface DownloadStatusResponse {
  taskId: string;
  status: DownloadTask['status'];
  progress: number;
  speed: number | null; // Matched to DownloadTask['speed']
  eta: number | null;   // Matched to DownloadTask['eta']
  fileSize?: number | null; // Matched to DownloadTask['fileSize']
  downloadedSize?: number; // Matched to DownloadTask['downloadedSize']
  message?: string; // General message (optional)
  error?: string | null; // Error message if any, from DownloadTask['error']
  // Potentially other fields from DownloadTask if needed by client for status display
  title?: string; // Added: Useful for display
  type?: DownloadTask['type']; // Added: Useful for display
}

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    console.log(`[API /aria2/status] Received request for task ID: ${taskId}`);

    if (!taskId) {
      // This case should ideally not be hit if Next.js routing works as expected
      // but good practice to check.
      console.warn('[API /aria2/status] Task ID missing in request params.');
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // The DownloadManager's getTaskProgress method in the stub simulates progress.
    // In a real implementation, this might trigger an update from a backend service
    // or simply fetch the latest state. For the stub, calling it ensures the
    // task object is updated if it's 'downloading'.
    await downloadManager.getTaskProgress(taskId); 

    const task = await downloadManager.getTaskById(taskId);

    if (task) {
      const response: DownloadStatusResponse = {
        taskId: task.id,
        title: task.title,
        type: task.type,
        status: task.status,
        progress: task.progress,
        speed: task.speed,
        eta: task.eta,
        fileSize: task.fileSize,
        downloadedSize: task.downloadedSize,
        error: task.error,
        message: `Status for task ${task.id}`
      };
      return NextResponse.json(response, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Download task not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('[API /aria2/status] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
