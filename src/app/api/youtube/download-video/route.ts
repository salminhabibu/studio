// src/app/api/youtube/download-video/route.ts
// This API route is removed as YouTube download functionality is being stripped for the UI template.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("[API YouTube Download Video] Endpoint stubbed: Not active in UI Template Mode.");
  return NextResponse.json({ 
    message: "YouTube video download API is stubbed and not functional in this UI template.",
  }, { status: 501 });
}
