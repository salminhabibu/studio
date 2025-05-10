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
