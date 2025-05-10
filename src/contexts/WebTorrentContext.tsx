import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import webTorrentService, { Torrent, TorrentProgress, HistoryItem } from '@/lib/webtorrent-service';

interface WebTorrentContextType {
  torrents: TorrentProgress[]; // Active torrents
  history: HistoryItem[];
  addTorrent: (magnetURI: string, itemName?: string, itemId?: string | number) => Torrent | null;
  removeTorrent: (infoHashOrMagnetURI: string) => void;
  pauseTorrent: (infoHashOrMagnetURI: string) => void;
  resumeTorrent: (infoHashOrMagnetURI: string) => void;
  getTorrentInstance: (infoHashOrMagnetURI: string) => Torrent | undefined;
  getLargestFileForStreaming: (infoHashOrMagnetURI: string) => Promise<{ file: WebTorrent.TorrentFile, streamUrl: string } | null>;
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

  const addTorrent = (magnetURI: string, itemName?: string, itemId?: string | number) => {
    const torrent = webTorrentService.addTorrent(magnetURI, itemName, itemId);
    // History is updated within the service, context will pick it up via onHistoryUpdated
    return torrent;
  };

  const removeTorrent = (infoHashOrMagnetURI: string) => {
    webTorrentService.removeTorrent(infoHashOrMagnetURI);
    // Active list and history are updated within the service
  };

  const pauseTorrent = (infoHashOrMagnetURI: string) => {
    webTorrentService.pauseTorrent(infoHashOrMagnetURI);
  };

  const resumeTorrent = (infoHashOrMagnetURI: string) => {
    webTorrentService.resumeTorrent(infoHashOrMagnetURI);
  };

  const getTorrentInstance = (infoHashOrMagnetURI: string): Torrent | undefined => {
    return webTorrentService.getTorrent(infoHashOrMagnetURI);
  };
  
  const getLargestFileForStreaming = async (infoHashOrMagnetURI: string): Promise<{ file: WebTorrent.TorrentFile, streamUrl: string } | null> => {
    const torrent = webTorrentService.getTorrent(infoHashOrMagnetURI);
    if (!torrent || !torrent.ready) {
        console.warn("[WebTorrentContext] Torrent not ready or not found for streaming.");
        return null;
    }
    if (!torrent.files || torrent.files.length === 0) {
        console.warn("[WebTorrentContext] No files in torrent yet.");
        return null;
    }

    const videoFile = torrent.files.reduce((largest, file) => {
        return file.length > (largest ? largest.length : 0) ? file : largest;
    }, null as WebTorrent.TorrentFile | null);

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
  };

  const clearDownloadHistory = () => {
    webTorrentService.clearHistory();
  };

  const removeDownloadFromHistory = (infoHash: string) => {
    webTorrentService.removeFromHistory(infoHash);
  };

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
