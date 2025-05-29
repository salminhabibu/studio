// src/app/api/webtorrent/list/route.ts
import { NextResponse } from 'next/server';
import webTorrentManager from '@/server/webtorrentManager'; // Adjust path as necessary

export async function GET() {
  try {
    const activeTorrents = webTorrentManager.getActiveTorrentsInfo();
    return NextResponse.json(activeTorrents, { status: 200 });
  } catch (error: any) {
    console.error('[API /webtorrent/list] Error retrieving active torrents:', error);
    return NextResponse.json({ error: `Failed to retrieve active torrents: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
