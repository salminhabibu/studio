// src/app/api/aria2/file/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This is a conceptual API route. In a real application, this would:
// 1. Check if the Aria2 task is complete.
// 2. Locate the downloaded file(s) on the server.
// 3. Serve the file.

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    console.log(`[API Aria2 File] Received file request for Task ID: ${taskId}`);

    // In a real scenario:
    // 1. Query Aria2 for task status: aria2.tellStatus(taskId)
    // 2. If complete, get file path(s) from status.files[0].path
    // 3. Serve the file.

    // For this stub, we'll serve a placeholder text file.
    const conceptualFileName = `task_${taskId}_completed_file.txt`;
    const fileContent = `This is a placeholder file for conceptual Aria2 download task ${taskId}.\nIn a real application, this would be the actual downloaded movie or TV show file.`;
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(conceptualFileName)}"`);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Content-Length', String(new TextEncoder().encode(fileContent).length));

    return new NextResponse(fileContent, { status: 200, headers });

  } catch (error) {
    console.error('[API Aria2 File] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to process Aria2 file request', details: errorMessage }, { status: 500 });
  }
}
