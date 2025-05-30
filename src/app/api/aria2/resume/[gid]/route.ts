// src/app/api/aria2/resume/[gid]/route.ts
import { NextResponse } from 'next/server';
import aria2Client from '@/lib/aria2Client'; // Changed to default import

export async function POST(
  request: Request,
  { params }: { params: { gid: string } }
) {
  const gid = params.gid;
  if (!gid) {
    return NextResponse.json({ error: 'Missing GID' }, { status: 400 });
  }

  try {
    await aria2Client.unpause(gid); // Changed to use specific method
    return NextResponse.json({ message: `Download ${gid} resumed successfully` });
  } catch (error: any) {
    console.error(`Error resuming download ${gid}:`, error);
    return NextResponse.json({ error: `Failed to resume download: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
