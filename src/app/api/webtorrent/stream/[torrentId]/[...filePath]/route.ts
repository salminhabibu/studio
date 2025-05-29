// src/app/api/webtorrent/stream/[torrentId]/[...filePath]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webTorrentManager from '@/server/webtorrentManager';
import mime from 'mime-types'; // For determining content type

// Helper to parse range headers
function parseRange(rangeHeader: string | null, totalLength: number): { start: number; end: number } | null {
  if (!rangeHeader) return null;
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  let end = match[2] ? parseInt(match[2], 10) : totalLength - 1;

  if (isNaN(start) || isNaN(end) || start >= totalLength || end >= totalLength || start > end) {
    return null; // Invalid range
  }
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { torrentId: string; filePath: string[] } }
) {
  const { torrentId, filePath: filePathSegments } = params;

  if (!torrentId || !filePathSegments || filePathSegments.length === 0) {
    return NextResponse.json({ error: 'Missing torrentId or filePath' }, { status: 400 });
  }

  // Reconstruct the file path from segments
  const decodedFilePath = filePathSegments.map(segment => decodeURIComponent(segment)).join('/');
  console.log(`[API Stream] Request for torrentId: ${torrentId}, filePath: ${decodedFilePath}`);

  const torrent = webTorrentManager.getTorrent(torrentId);
  if (!torrent) {
    console.warn(`[API Stream] Torrent with ID ${torrentId} not found.`);
    return NextResponse.json({ error: 'Torrent not found or not ready.' }, { status: 404 });
  }

  const file = torrent.files.find(f => f.path === decodedFilePath);
  if (!file) {
    console.warn(`[API Stream] File with path "${decodedFilePath}" not found in torrent ${torrentId}.`);
    return NextResponse.json({ error: 'File not found in torrent.' }, { status: 404 });
  }

  const totalLength = file.length;
  const contentType = mime.lookup(file.name) || 'application/octet-stream';
  
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(totalLength));
  // For streaming, it's often good to indicate that the connection should be kept alive
  // and that the content can be cached by proxies if appropriate (though dynamic streams might not be)
  // headers.set('Connection', 'keep-alive');
  // headers.set('Cache-Control', 'public, max-age=604800'); // Example: cache for a week

  const rangeHeader = request.headers.get('range');
  const range = parseRange(rangeHeader, totalLength);

  if (range) {
    const { start, end } = range;
    const chunksize = (end - start) + 1;

    if (start >= totalLength || end >= totalLength || start > end || chunksize <= 0) {
      headers.set('Content-Range', `bytes */${totalLength}`);
      return new NextResponse(null, { status: 416, headers }); // Range Not Satisfiable
    }
    
    console.log(`[API Stream] Serving range: ${start}-${end} for ${file.name}`);
    headers.set('Content-Range', `bytes ${start}-${end}/${totalLength}`);
    headers.set('Content-Length', String(chunksize));
    
    const stream = file.createReadStream({ start, end });
    
    // For Next.js Edge/Node.js environments, directly returning a ReadableStream
    // might require specific handling or conversion to a format Next.js understands for streaming responses.
    // NextResponse doesn't directly take a Node.js stream. We need to adapt.
    // One common way is to use a Response object with a ReadableStream.
    
    // Create a new ReadableStream from the Node.js stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      }
    });

    return new NextResponse(webStream, { status: 206, headers }); // Partial Content
  } else {
    console.log(`[API Stream] Serving full file: ${file.name}`);
    const stream = file.createReadStream();
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      }
    });
    return new NextResponse(webStream, { status: 200, headers }); // OK
  }
}
