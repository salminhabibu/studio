// src/app/api/aria2/pause/[gid]/route.ts
import { NextResponse } from 'next/server';
import aria2Client from '@/lib/aria2Client'; // Corrected to default import

export async function POST(
  request: Request,
  { params }: { params: { gid: string } }
) {
  const gid = params.gid;
  if (!gid) {
    return NextResponse.json({ error: 'Missing GID' }, { status: 400 });
  }

  try {
    await aria2Client.pause(gid); // Corrected to use the specific method
    return NextResponse.json({ message: `Download ${gid} paused successfully` });
  } catch (error: any) {
    console.error(`Error pausing download ${gid}:`, error);
    return NextResponse.json({ error: `Failed to pause download: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
