import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import webTorrentService, { Torrent, TorrentProgress, HistoryItem } from '@/lib/webtorrent-service';
import type { TorrentFile as WebTorrentFile } from 'webtorrent';


interface WebTorrentContextType {
  torrents: TorrentProgress[]; // Active torrents
  history: HistoryItem[];
  addTorrent: (magnetURI: string, itemName?: string, itemId?: string | number) => Promise<Torrent | null>;
  removeTorrent: (infoHashOrMagnetURI: string) => Promise<void>;
  pauseTorrent: (infoHashOrMagnetURI: string) => void;
  resumeTorrent: (infoHashOrMagnetURI: string) => void;
  getTorrentInstance: (infoHashOrMagnetURI: string) => Torrent | undefined;
  getLargestFileForStreaming: (infoHashOrMagnetURI: string) => Promise<{ file: WebTorrentFile, streamUrl: string } | null>;
  clearDownloadHistory: () => void;
  removeDownloadFromHistory: (infoHash: string) => void;
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
  const [torrents, setTorrents] = useState<TorrentProgress[]>(() => webTorrentService.getAllTorrentsProgress());
  const [history, setHistory] = useState<HistoryItem[]>(() => webTorrentService.getDownloadHistory());

  const updateTorrentProgressList = useCallback(() => {
    setTorrents([...webTorrentService.getAllTorrentsProgress()]);
  }, []);

  const updateHistoryList = useCallback(() => {
    setHistory([...webTorrentService.getDownloadHistory()]);
  }, []);

  useEffect(() => {
    // Ensure service client is initialized if needed, especially for any startup logic.
    // For now, getClient() in service methods handles lazy initialization.
    // webTorrentService.getClient(); // Could be called here to kick off init early

    const unsubscribeProgress = webTorrentService.onTorrentProgress(() => updateTorrentProgressList());
    const unsubscribeAdded = webTorrentService.onTorrentAdded(() => updateTorrentProgressList());
    const unsubscribeRemoved = webTorrentService.onTorrentRemoved(() => updateTorrentProgressList());
    const unsubscribeDone = webTorrentService.onTorrentDone(() => updateTorrentProgressList());
    const unsubscribeError = webTorrentService.onTorrentError(() => updateTorrentProgressList());
    const unsubscribeHistory = webTorrentService.onHistoryUpdated(() => updateHistoryList());

    // Initial sync
    updateTorrentProgressList();
    updateHistoryList();

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
    const torrent = await webTorrentService.addTorrent(magnetURI, itemName, itemId);
    // History and progress lists are updated by listeners.
    return torrent;
  }, []);

  const removeTorrent = useCallback(async (infoHashOrMagnetURI: string): Promise<void> => {
    await webTorrentService.removeTorrent(infoHashOrMagnetURI);
    // Active list and history are updated within the service via listeners
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
    const torrent = webTorrentService.getTorrent(infoHashOrMagnetURI); // This is sync
    if (!torrent) {
        console.warn("[WebTorrentContext] Torrent instance not found for streaming.");
        // Attempt to initialize client and then get torrent if it was just added.
        // This scenario is tricky; usually, torrent should be in activeTorrents map after addTorrent resolves.
        const client = await webTorrentService.getClient(); // Ensure client is ready
        if (!client) {
             console.warn("[WebTorrentContext] WebTorrent client not available.");
             return null;
        }
        const freshTorrent = webTorrentService.getTorrent(infoHashOrMagnetURI);
        if(!freshTorrent || !freshTorrent.ready){
            console.warn("[WebTorrentContext] Torrent not ready or not found for streaming even after client check.");
            return null;
        }
         if (!freshTorrent.files || freshTorrent.files.length === 0) {
            console.warn("[WebTorrentContext] No files in torrent yet (checked after client init).");
            return null;
        }
         const videoFile = freshTorrent.files.reduce((largest, file) => {
            return file.length > (largest ? largest.length : 0) ? file : largest;
        }, null as WebTorrentFile | null);

        if (!videoFile) {
            console.warn("[WebTorrentContext] No suitable video file found for streaming (checked after client init).");
            return null;
        }
         return new Promise((resolve) => {
            videoFile.getBlobURL((err, url) => {
                if (err || !url) {
                    console.error('[WebTorrentContext] Error getting blob URL for file (checked after client init):', err);
                    resolve(null);
                } else {
                    resolve({ file: videoFile, streamUrl: url });
                }
            });
        });
    }


    if (!torrent.ready) {
        console.warn("[WebTorrentContext] Torrent not ready for streaming (metadata pending).");
        // Optional: Wait for 'ready' event, but this complicates the immediate return promise.
        // For now, if not ready, assume it's still fetching metadata.
        return null; 
    }
    if (!torrent.files || torrent.files.length === 0) {
        console.warn("[WebTorrentContext] No files in torrent yet.");
        return null;
    }

    const videoFile = torrent.files.reduce((largest, file) => {
        return file.length > (largest ? largest.length : 0) ? file : largest;
    }, null as WebTorrentFile | null);

    if (!videoFile) {
        console.warn("[WebTorrentContext] No suitable video file found for streaming.");
        return null;
    }

    return new Promise((resolve) => {
        videoFile.getBlobURL((err, url) => {
            if (err || !url) {
                console.error('[WebTorrentContext] Error getting blob URL for file:', err);
                resolve(null);
            } else {
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
      removeDownloadFromHistory
    }}>
      {children}
    </WebTorrentContext.Provider>
  );
};
