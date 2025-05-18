// src/app/api/aria2/status/[taskId]/route.ts
// This API route is removed as Aria2 integration is being stripped for the UI template.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  console.log(`[API Aria2 Status] Endpoint stubbed for Task ID: ${taskId}. Not active in UI Template Mode.`);
  return NextResponse.json({ 
    gid: taskId,
    status: 'paused', // Example stubbed status
    totalLength: "0",
    completedLength: "0",
    downloadSpeed: "0",
    errorMessage: "This is a stubbed response. Aria2 integration not active.",
    message: "Aria2 status API is stubbed."
  }, { status: 501 });
}
