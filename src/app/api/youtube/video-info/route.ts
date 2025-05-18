// src/app/api/youtube/video-info/route.ts
// This API route is removed as YouTube download functionality is being stripped for the UI template.
// If you re-implement YouTube downloads, you can recreate this file.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("[API YouTube Video Info] Endpoint stubbed: Not active in UI Template Mode.");
  return NextResponse.json({ 
    message: "YouTube video info API is stubbed and not functional in this UI template.",
    note: "To implement, you would use a library like ytdl-core here." 
  }, { status: 501 }); // 501 Not Implemented
}
