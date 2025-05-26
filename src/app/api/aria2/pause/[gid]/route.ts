// src/app/api/aria2/pause/[gid]/route.ts
import { NextResponse } from 'next/server';
import { aria2Client } from '@/lib/aria2Client'; // Assuming aria2Client is correctly set up

export async function POST(
  request: Request,
  { params }: { params: { gid: string } }
) {
  const gid = params.gid;
  if (!gid) {
    return NextResponse.json({ error: 'Missing GID' }, { status: 400 });
  }

  try {
    await aria2Client.call('aria2.pause', [gid]);
    return NextResponse.json({ message: `Download ${gid} paused successfully` });
  } catch (error: any) {
    console.error(`Error pausing download ${gid}:`, error);
    return NextResponse.json({ error: `Failed to pause download: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
