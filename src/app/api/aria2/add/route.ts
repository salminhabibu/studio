// src/app/api/aria2/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// This is a conceptual API route. In a real application, this would interact
// with an Aria2 instance, likely via its JSON-RPC interface.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, type, name, quality, seriesTitle, season, episode } = body;

    console.log(`[API Aria2 Add] Received request:`, { identifier, type, name, quality, seriesTitle, season, episode });

    if (!identifier && !(type === 'tv_episode' && seriesTitle && season && episode) && !(type === 'tv_season_pack' && seriesTitle && season) && !(type === 'tv_season_pack_all' && seriesTitle) ) {
      console.warn('[API Aria2 Add] Missing identifier or TV show details for search.', body);
      return NextResponse.json({ error: 'Missing identifier (magnet/URL) or TV show details for search' }, { status: 400 });
    }

    const taskId = randomUUID();
    let taskNameResolved = name;

    if (!taskNameResolved) {
        if (type === 'magnet') taskNameResolved = identifier.substring(0, 50) + '... (Magnet)';
        else if (type === 'imdb_id') taskNameResolved = `IMDB ${identifier}`;
        else if (type === 'tv_episode') taskNameResolved = `${seriesTitle} S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`;
        else if (type === 'tv_season_pack') taskNameResolved = `${seriesTitle} Season ${season}`;
        else if (type === 'tv_season_pack_all') taskNameResolved = `${seriesTitle} All Seasons`;
        else taskNameResolved = identifier;
    }
    taskNameResolved += ` (${quality})`;


    console.log(`[API Aria2 Add] Conceptual task added: "${taskNameResolved}", ID: ${taskId}, Quality: ${quality}, Type: ${type}`);

    // For simulation, store task name in a cookie so status API can pick it up (DEV only hack)
    const response = NextResponse.json({ message: 'Task conceptually added to Aria2 (Simulated)', taskId: taskId, taskName: taskNameResolved }, { status: 200 });
    
    // Super simplified way to pass info to status API for simulation; NOT FOR PRODUCTION
    // In a real app, status API would query Aria2, which knows task details.
    let conceptualTasks: any[] = [];
    const cookie = request.cookies.get('chillymovies-conceptual-tasks-for-sim');
    if (cookie?.value) {
        try { conceptualTasks = JSON.parse(cookie.value); } catch (e) {}
    }
    conceptualTasks.push({ taskId, name: taskNameResolved, type });
    conceptualTasks = conceptualTasks.slice(-10); // Keep last 10 for cookie size
    response.cookies.set('chillymovies-conceptual-tasks-for-sim', JSON.stringify(conceptualTasks), { path: '/', maxAge: 3600 });


    return response;

  } catch (error) {
    console.error('[API Aria2 Add] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to process Aria2 add request', details: errorMessage }, { status: 500 });
  }
}
