// src/app/api/aria2/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// This is a conceptual API route. In a real application, this would interact
// with an Aria2 instance, likely via its JSON-RPC interface.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, type, name, quality, seriesTitle, season, episode } = body;

    if (!identifier && !(type === 'tv_episode' && seriesTitle && season && episode) && !(type === 'tv_season_pack' && seriesTitle && season)) {
      return NextResponse.json({ error: 'Missing identifier (magnet/URL) or TV show details for search' }, { status: 400 });
    }

    // Simulate adding to Aria2 and getting a task ID
    const taskId = randomUUID();
    const taskName = name || (type === 'magnet' ? identifier.substring(0, 50) + '...' : identifier);

    console.log(`[API Aria2 Add] Received request:`, { identifier, type, name, quality, seriesTitle, season, episode });
    console.log(`[API Aria2 Add] Conceptual task added: ${taskName}, ID: ${taskId}, Quality: ${quality}`);

    // Here, you would make an RPC call to your Aria2 server.
    // Example: aria2.addUri([identifier], { "gid": taskId, "out": taskName, ...otherOptions })
    // Or if it's a TV show, you might search for a torrent first based on seriesTitle, season, episode, quality.

    // For now, just return a success with the simulated task ID.
    return NextResponse.json({ message: 'Task conceptually added to Aria2', taskId: taskId, taskName: taskName }, { status: 200 });

  } catch (error) {
    console.error('[API Aria2 Add] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to process Aria2 add request', details: errorMessage }, { status: 500 });
  }
}
