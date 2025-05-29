// src/app/api/aria2/remove/[gid]/route.ts
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
    // For active downloads, aria2.forceRemove or aria2.remove can be used.
    // aria2.remove might wait for active pieces to finish.
    // aria2.forceRemove removes it immediately. Let's use forceRemove for a "cancel" behavior.
    await aria2Client.remove(gid); // Changed to use specific method
    // If you want to remove completed/error downloads from history, use 'aria2.removeDownloadResult'.
    // However, for cancelling an active download, 'forceRemove' or 'remove' is appropriate.
    return NextResponse.json({ message: `Download ${gid} removed successfully` });
  } catch (error: any) {
    console.error(`Error removing download ${gid}:`, error);
    // It's possible the GID doesn't exist (e.g., already completed and removed from active list)
    // Aria2 might throw an error like "No such download" with code 1.
    if (error && error.message && error.message.includes("No such download")) {
        return NextResponse.json({ message: `Download ${gid} was not found or already removed.` }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to remove download: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
