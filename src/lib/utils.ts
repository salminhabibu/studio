import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 Bytes'; // Handle edge cases like Math.log(0)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// The old handleDownload function that triggered external torrent clients has been removed 
// as the primary download mechanism is now through the WebTorrent service for in-app handling.
// If an "Open with external client" feature is desired, it can be added separately.

/**
 * Selects the best video file from a list of torrent files.
 * Prioritizes files with common video extensions and then selects the largest among them.
 *
 * @param files Array of files from the torrent, each with a 'path' (string) and 'length' (number).
 * @returns The selected file object { path: string; length: number } or null if no suitable video file is found.
 */
export function selectVideoFileFromTorrent(
  files: Array<{ path: string; length: number }>
): { path: string; length: number } | null {
  if (!files || files.length === 0) {
    return null;
  }

  const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.wmv', '.flv'];
  
  const videoFiles = files.filter(file => {
    const extension = file.path.slice(file.path.lastIndexOf('.')).toLowerCase();
    return videoExtensions.includes(extension);
  });

  if (videoFiles.length === 0) {
    return null; // No files with recognized video extensions found
  }

  // If multiple video files, select the largest one
  if (videoFiles.length > 1) {
    return videoFiles.sort((a, b) => b.length - a.length)[0];
  }

  return videoFiles[0]; // Only one video file found
}
