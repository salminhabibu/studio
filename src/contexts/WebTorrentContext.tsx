// src/contexts/WebTorrentContext.tsx
// This context is stubbed out as active WebTorrent functionality is removed for the UI template.
// You can re-implement this context if you add client-side WebTorrent features later.
import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
// Types are imported from the stubbed service for consistency if UI components use them.
import type { Torrent, TorrentProgress, HistoryItem } from '@/lib/webtorrent-service'; 
// import type { TorrentFile as WebTorrentFile } from 'webtorrent'; // WebTorrent type not needed for stub

interface WebTorrentContextTypeStub {
  torrents: TorrentProgress[];
  history: HistoryItem[];
  addTorrent: (magnetURI: string, itemName?: string, itemId?: string | number) => Promise<Torrent | null>;
  removeTorrent: (infoHashOrMagnetURI: string) => Promise<void>;
  pauseTorrent: (infoHashOrMagnetURI: string) => void;
  resumeTorrent: (infoHashOrMagnetURI: string) => void;
  getTorrentInstance: (infoHashOrMagnetURI: string) => Torrent | undefined;
  getLargestFileForStreaming: (infoHashOrMagnetURI: string) => Promise<{ file: any, streamUrl: string } | null>; // 'any' for file as TorrentFile is from webtorrent
  clearDownloadHistory: () => void;
  removeDownloadFromHistory: (infoHash: string) => void;
  isClientReady: boolean;
}

const WebTorrentContext = createContext<WebTorrentContextTypeStub | undefined>(undefined);

export const useWebTorrent = (): WebTorrentContextTypeStub => {
  const context = useContext(WebTorrentContext);
  if (!context) {
    // This error can remain as it's a structural check, even if functionality is stubbed.
    throw new Error('useWebTorrent must be used within a WebTorrentProvider');
  }
  return context;
};

interface WebTorrentProviderProps {
  children: ReactNode;
}

export const WebTorrentProvider: React.FC<WebTorrentProviderProps> = ({ children }) => {
  const [isClientReady, setIsClientReady] = useState(false); // Still useful to indicate "ready" for UI purposes

  useEffect(() => {
    console.log("[WebTorrentProvider] Initializing stubbed provider.");
    // Simulate client readiness for UI template
    setTimeout(() => setIsClientReady(true), 500);
  }, []);

  const stubFunction = useCallback(async (actionName: string, ...args: any[]): Promise<void> => { // Explicitly Promise<void>
    console.log(`[WebTorrentProvider] Stubbed action "${actionName}" called with args:`, args);
    // toast({ title: "Action (Stubbed)", description: `${actionName} is a stub in this UI template.`});
    // No explicit return value for Promise<void>
  }, []);

  const value: WebTorrentContextTypeStub = {
    torrents: [], // Empty for template
    history: [],  // Empty for template
    addTorrent: async (...args) => { await stubFunction('addTorrent', ...args); return null; }, // Keep as Promise<Torrent | null>
    removeTorrent: (...args) => stubFunction('removeTorrent', ...args), // Now matches Promise<void>
    pauseTorrent: (...args) => { stubFunction('pauseTorrent', ...args); },
    resumeTorrent: (...args) => { stubFunction('resumeTorrent', ...args); },
    getTorrentInstance: (...args) => { stubFunction('getTorrentInstance', ...args); return undefined; },
    getLargestFileForStreaming: async (...args) => { await stubFunction('getLargestFileForStreaming', ...args); return null; }, // Keep as Promise<any> or specific type
    clearDownloadHistory: () => { stubFunction('clearDownloadHistory'); },
    removeDownloadFromHistory: (...args) => { stubFunction('removeDownloadFromHistory', ...args); },
    isClientReady: isClientReady,
  };

  return (
    <WebTorrentContext.Provider value={value}>
      {children}
    </WebTorrentContext.Provider>
  );
};
