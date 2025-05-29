// src/app/api/webtorrent/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webTorrentManager from '@/server/webtorrentManager'; // Adjust path as necessary

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const magnetUri = body.magnetUri;

    if (!magnetUri || typeof magnetUri !== 'string') {
      return NextResponse.json({ error: 'magnetUri is required and must be a string.' }, { status: 400 });
    }

    // Validate magnet URI format (basic check)
    if (!magnetUri.startsWith('magnet:?xt=urn:btih:')) {
      return NextResponse.json({ error: 'Invalid magnet URI format.' }, { status: 400 });
    }

    console.log(`[API /webtorrent/add] Received request to add magnet: ${magnetUri}`);
    const result = await webTorrentManager.addTorrent(magnetUri);
    console.log(`[API /webtorrent/add] Torrent added successfully: ${result.name} (ID: ${result.torrentId})`);
    
    return NextResponse.json(result, { status: 200 }); // 200 OK as it might return existing if already added

  } catch (error: any) {
    console.error('[API /webtorrent/add] Error adding torrent:', error);
    // Specific error for invalid magnet if addTorrent rejects with a specific message pattern
    if (error.message && error.message.toLowerCase().includes('invalid magnet uri')) {
        return NextResponse.json({ error: `Invalid magnet URI: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: `Failed to add torrent: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
