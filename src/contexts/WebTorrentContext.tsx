// src/contexts/WebTorrentContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import webTorrentService, { Torrent, TorrentProgress, HistoryItem } from '@/lib/webtorrent-service';
import type { TorrentFile as WebTorrentFile } from 'webtorrent';


interface WebTorrentContextType {
  torrents: TorrentProgress[];
  history: HistoryItem[];
  addTorrent: (magnetURI: string, itemName?: string, itemId?: string | number) => Promise<Torrent | null>;
  removeTorrent: (infoHashOrMagnetURI: string) => Promise<void>;
  pauseTorrent: (infoHashOrMagnetURI: string) => void;
  resumeTorrent: (infoHashOrMagnetURI: string) => void;
  getTorrentInstance: (infoHashOrMagnetURI: string) => Torrent | undefined;
  getLargestFileForStreaming: (infoHashOrMagnetURI: string) => Promise<{ file: WebTorrentFile, streamUrl: string } | null>;
  clearDownloadHistory: () => void;
  removeDownloadFromHistory: (infoHash: string) => void;
  isClientReady: boolean;
}

const WebTorrentContext = createContext<WebTorrentContextType | undefined>(undefined);

export const useWebTorrent = (): WebTorrentContextType => {
  const context = useContext(WebTorrentContext);
  if (!context) {
    throw new Error('useWebTorrent must be used within a WebTorrentProvider');
  }
  return context;
};

interface WebTorrentProviderProps {
  children: ReactNode;
}

export const WebTorrentProvider: React.FC<WebTorrentProviderProps> = ({ children }) => {
  const [torrents, setTorrents] = useState<TorrentProgress[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isClientReady, setIsClientReady] = useState(false);


  const updateTorrentProgressList = useCallback(() => {
    setTorrents([...webTorrentService.getAllTorrentsProgress()]);
  }, []);

  const updateHistoryList = useCallback(() => {
    setHistory([...webTorrentService.getDownloadHistory()]);
  }, []);

  useEffect(() => {
    // Initialize client and set ready state
    const initClient = async () => {
        try {
            await webTorrentService.getClient(); // Ensures client is initialized
            setIsClientReady(true);
            console.log("[WebTorrentContext] WebTorrent client is ready.");
             // Initial sync after client is ready
            updateTorrentProgressList();
            updateHistoryList();
        } catch (error) {
            console.error("[WebTorrentContext] Failed to initialize WebTorrent client in provider:", error);
            setIsClientReady(false); // Explicitly set to false on error
        }
    };
    initClient();

    const unsubscribeProgress = webTorrentService.onTorrentProgress(updateTorrentProgressList);
    const unsubscribeAdded = webTorrentService.onTorrentAdded((torrent) => {
        console.log("[WebTorrentContext] Torrent added listener triggered:", torrent.customName);
        updateTorrentProgressList();
    });
    const unsubscribeRemoved = webTorrentService.onTorrentRemoved((infoHash) => {
        console.log("[WebTorrentContext] Torrent removed listener triggered:", infoHash);
        updateTorrentProgressList();
        updateHistoryList(); // History might also change (status to 'removed')
    });
    const unsubscribeDone = webTorrentService.onTorrentDone((torrent) => {
        console.log("[WebTorrentContext] Torrent done listener triggered:", torrent.customName);
        updateTorrentProgressList();
        updateHistoryList();
    });
    const unsubscribeError = webTorrentService.onTorrentError((torrent, error) => {
        const name = torrent && 'customName' in torrent ? torrent.customName : (torrent?.infoHash || 'Unknown');
        console.error(`[WebTorrentContext] Torrent error listener triggered for ${name}:`, error);
        updateTorrentProgressList();
        updateHistoryList(); // Update history for error status
    });
    const unsubscribeHistory = webTorrentService.onHistoryUpdated(updateHistoryList);


    return () => {
      unsubscribeProgress();
      unsubscribeAdded();
      unsubscribeRemoved();
      unsubscribeDone();
      unsubscribeError();
      unsubscribeHistory();
    };
  }, [updateTorrentProgressList, updateHistoryList]);

  const addTorrent = useCallback(async (magnetURI: string, itemName?: string, itemId?: string | number): Promise<Torrent | null> => {
    if (!isClientReady) {
        console.warn("[WebTorrentContext] addTorrent called before client is ready. Trying to initialize...");
        try {
            await webTorrentService.getClient(); // Attempt to ensure client is ready
            setIsClientReady(true); // Should be set by useEffect, but as a fallback
        } catch (e) {
            console.error("[WebTorrentContext] Failed to ensure client readiness on addTorrent:", e);
            return null;
        }
    }
    const torrent = await webTorrentService.addTorrent(magnetURI, itemName, itemId);
    // Lists are updated by listeners.
    return torrent;
  }, [isClientReady]);

  const removeTorrent = useCallback(async (infoHashOrMagnetURI: string): Promise<void> => {
    await webTorrentService.removeTorrent(infoHashOrMagnetURI);
  }, []);


  const pauseTorrent = useCallback((infoHashOrMagnetURI: string) => {
    webTorrentService.pauseTorrent(infoHashOrMagnetURI);
  }, []);

  const resumeTorrent = useCallback((infoHashOrMagnetURI: string) => {
    webTorrentService.resumeTorrent(infoHashOrMagnetURI);
  }, []);

  const getTorrentInstance = useCallback((infoHashOrMagnetURI: string): Torrent | undefined => {
    return webTorrentService.getTorrent(infoHashOrMagnetURI);
  }, []);
  
  const getLargestFileForStreaming = useCallback(async (infoHashOrMagnetURI: string): Promise<{ file: WebTorrentFile, streamUrl: string } | null> => {
    const torrent = webTorrentService.getTorrent(infoHashOrMagnetURI);
    if (!torrent) {
        console.warn("[WebTorrentContext] Torrent instance not found for streaming.");
        return null;
    }

    if (!torrent.ready) {
        console.warn("[WebTorrentContext] Torrent not ready for streaming (metadata pending). Waiting for ready state...");
        // Wait for the 'ready' event for this specific torrent
        await new Promise<void>(resolve => {
            if (torrent.ready) { // Check again in case it became ready
                resolve();
            } else {
                torrent.once('ready', () => {
                    console.log(`[WebTorrentContext] Torrent ${torrent.infoHash} is now ready for streaming.`);
                    resolve();
                });
                // Timeout for waiting for ready state
                setTimeout(() => {
                    console.warn(`[WebTorrentContext] Timeout waiting for torrent ${torrent.infoHash} to become ready.`);
                    resolve(); // Resolve anyway to avoid hanging, next checks will fail
                }, 30000); // 30 seconds timeout
            }
        });
        if (!torrent.ready) return null; // Still not ready after wait
    }

    if (!torrent.files || torrent.files.length === 0) {
        console.warn("[WebTorrentContext] No files in torrent yet.");
        return null;
    }

    const videoFile = torrent.files.reduce((largest, file) => {
        // Basic video file extension check
        const videoExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
        const isVideo = videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        if (!isVideo) return largest;
        return file.length > (largest ? largest.length : 0) ? file : largest;
    }, null as WebTorrentFile | null);

    if (!videoFile) {
        console.warn("[WebTorrentContext] No suitable video file found for streaming.");
        return null;
    }

    return new Promise((resolve, reject) => {
        videoFile.getBlobURL((err, url) => {
            if (err || !url) {
                console.error('[WebTorrentContext] Error getting blob URL for file:', err);
                reject(err || new Error("Failed to get Blob URL"));
            } else {
                console.log(`[WebTorrentContext] Blob URL for ${videoFile.name}: ${url.substring(0,100)}...`);
                resolve({ file: videoFile, streamUrl: url });
            }
        });
    });
  }, []);

  const clearDownloadHistory = useCallback(() => {
    webTorrentService.clearHistory();
  }, []);

  const removeDownloadFromHistory = useCallback((infoHash: string) => {
    webTorrentService.removeFromHistory(infoHash);
  }, []);

  return (
    <WebTorrentContext.Provider value={{
      torrents,
      history,
      addTorrent,
      removeTorrent,
      pauseTorrent,
      resumeTorrent,
      getTorrentInstance,
      getLargestFileForStreaming,
      clearDownloadHistory,
      removeDownloadFromHistory,
      isClientReady,
    }}>
      {children}
    </WebTorrentContext.Provider>
  );
};
