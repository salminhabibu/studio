// src/app/api/aria2/file/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This is a conceptual API route. In a real application, this would:
// 1. Check if the Aria2 task is complete.
// 2. Locate the downloaded file(s) on the server.
// 3. Serve the file.

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } } // Default dynamic segment name is `taskId` as per folder structure.
) {
  try {
    const taskId = params.taskId;
    // The filename might be passed as part of the dynamic route if using [...slug]
    // For a simple [taskId] route, the client might pass filename as query param, or we derive it.
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    // Assuming URL is /api/aria2/file/[taskId]/[filename.ext]
    // Or if filename is not in path, it must be known by taskId or passed as query
    const encodedFileNameFromPath = segments[segments.length -1]; // Last segment could be filename
    
    let conceptualFileName = `task_${taskId}_file.txt`; // Default
    if (encodedFileNameFromPath && encodedFileNameFromPath !== taskId) {
        conceptualFileName = decodeURIComponent(encodedFileNameFromPath);
    }


    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    console.log(`[API Aria2 File] Received file request for Task ID: ${taskId}, Conceptual Filename: ${conceptualFileName}`);

    const fileContent = `This is a placeholder file for ChillyMovies Aria2 download simulation.\n\nTask ID: ${taskId}\nConceptual Filename: ${conceptualFileName}\n\nIn a real application, this would be the actual downloaded movie or TV show file. This simulation confirms that the download completion and file access flow is conceptually working.`;
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(conceptualFileName)}"`); // Use the resolved filename
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    // Content-Length will be set automatically by NextResponse for simple string bodies

    return new NextResponse(fileContent, { status: 200, headers });

  } catch (error) {
    console.error('[API Aria2 File] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to process Aria2 file request', details: errorMessage }, { status: 500 });
  }
}
