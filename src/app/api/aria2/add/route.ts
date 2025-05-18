// src/app/api/aria2/add/route.ts
// This API route is removed as Aria2 integration is being stripped for the UI template.
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log("[API Aria2 Add] Endpoint stubbed: Not active in UI Template Mode.");
  return NextResponse.json({ 
    message: "Aria2 add task API is stubbed. In a full app, this would interact with an Aria2 instance.",
    taskId: "stubbed-task-id-" + Date.now() 
  }, { status: 501 });
}
