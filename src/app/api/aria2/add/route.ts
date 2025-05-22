// src/app/api/aria2/add/route.ts

import { NextRequest, NextResponse } from 'next/server';
import downloadManager from '@/services/downloadManager'; // Adjusted path
import { DownloadTaskCreationData, DownloadTask } from '@/types/download'; // Adjusted path

// PRD Appendix A.1
interface DownloadStartRequest {
  title: string;
  type: 'movie' | 'tvEpisode' | 'tvSeason' | 'youtube'; // Ensure this matches DownloadTask['type']
  source: string; // URL or magnet link
  metadata: {
    tmdbId?: string;
    imdbId?: string;
    season?: number;
    episode?: number;
    youtubeVideoId?: string; // Added for consistency
    selectedQuality?: string; // Renamed from 'quality' for clarity
    [key: string]: any;
  };
  destinationPath?: string; // Optional custom save location, maps to DownloadTaskCreationData
}

interface DownloadStartResponse {
  taskId: string;
  status: DownloadTask['status']; // Use the status from DownloadTask
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /aria2/add] Received request to add download:", body);

    // Validate that the parsed body contains the required fields for DownloadStartRequest
    if (!body.title || !body.type || !body.source || !body.metadata || 
        typeof body.title !== 'string' || 
        typeof body.type !== 'string' || 
        typeof body.source !== 'string' || 
        typeof body.metadata !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload. Missing or invalid required fields.' }, { status: 400 });
    }

    // Further validation for 'type' field to match DownloadTask['type']
    // Note: DownloadTask['type'] was defined as 'movie' | 'tvEpisode' | 'tvSeason' | 'youtube'
    const validTypes: DownloadTask['type'][] = ['movie', 'tvEpisode', 'tvSeason', 'youtube'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: `Invalid 'type' specified. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const requestData = body as DownloadStartRequest;

    const taskCreationData: DownloadTaskCreationData = {
      title: requestData.title,
      type: requestData.type,
      source: requestData.source,
      metadata: requestData.metadata,
      // destinationPath is optional in DownloadTaskCreationData, so pass it if provided
      ...(requestData.destinationPath && { destinationPath: requestData.destinationPath }),
    };

    const newTask = await downloadManager.addTask(taskCreationData);

    // Our stubbed addTask always returns a task, so newTask should always be defined.
    // However, in a real scenario, addTask might fail (e.g., validation error, backend issue).
    if (newTask) {
      const response: DownloadStartResponse = {
        taskId: newTask.id,
        status: newTask.status,
        message: 'Download task created successfully.'
      };
      return NextResponse.json(response, { status: 201 }); // 201 Created
    } else {
      // This case might not be hit with the current stubbed downloadManager.addTask
      console.error('[API /aria2/add] DownloadManager failed to create task.');
      return NextResponse.json({ error: 'Failed to create download task' }, { status: 500 });
    }

  } catch (error) {
    console.error('[API /aria2/add] Error:', error);
    if (error instanceof SyntaxError) { // Specifically for req.json() parsing errors
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    // General error handling
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
