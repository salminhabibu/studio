// src/app/api/aria2/file/[taskId]/route.ts
// This API route is removed as Aria2 integration is being stripped for the UI template.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  console.log(`[API Aria2 File] Endpoint stubbed for Task ID: ${taskId}. Not active in UI Template Mode.`);
  
  const headers = new Headers();
  headers.set('Content-Type', 'text/plain');
  return new NextResponse("This is a stubbed file response. Aria2 file serving not active.", { status: 501, headers });
}
