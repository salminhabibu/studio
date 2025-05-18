// src/components/features/streaming/VideoPlayer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { MaximizeIcon, MinimizeIcon, PauseIcon, PlayIcon, PictureInPictureIcon as PipIcon, Volume1Icon, Volume2Icon, VolumeXIcon, Loader2Icon, RotateCcwIcon, FastForwardIcon, RewindIcon } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface VideoPlayerProps {
  src: string;
  title?: string;
  onEnded?: () => void;
  initialPlaybackPosition?: number; // in seconds
  onTimeUpdate?: (currentTime: number) => void;
}

function formatTime(timeInSeconds: number): string {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function VideoPlayer({ src, title, onEnded, initialPlaybackPosition, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  const handlePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(error => console.error("Error playing video:", error));
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const handleVolumeChange = (newVolume: number[]) => {
    if (videoRef.current) {
      const v = newVolume[0] / 100;
      videoRef.current.volume = v;
      setVolume(v);
      setIsMuted(v === 0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      if (!videoRef.current.muted && videoRef.current.volume === 0) {
         videoRef.current.volume = 0.5; // Unmute to a default volume if was 0
         setVolume(0.5);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  };
  
  const handleSeek = (newTime: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const handleSkip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      if (initialPlaybackPosition && videoRef.current.currentTime < initialPlaybackPosition) {
        videoRef.current.currentTime = initialPlaybackPosition;
      }
       videoRef.current.play().catch(error => console.error("Error auto-playing video:", error));
    }
  };
  
  const toggleFullScreen = useCallback(() => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleFullScreenChange = useCallback(() => {
    setIsFullScreen(!!document.fullscreenElement);
  }, []);

  const togglePictureInPicture = async () => {
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture().catch(err => console.error("Error exiting PiP:", err));
      } else {
        if (document.pictureInPictureEnabled) {
          await videoRef.current.requestPictureInPicture().catch(err => console.error("Error entering PiP:", err));
        } else {
            console.warn("PiP not enabled in browser/document");
        }
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying && controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current); // Clear existing timeout
    }
     if (isPlaying) { // Only hide if playing
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 500);
     }
  };
  
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onWaiting = () => setIsLoading(true);
      const onPlaying = () => setIsLoading(false);
      const onCanPlay = () => setIsLoading(false);

      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('ended', onEnded || onPause);
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('canplay', onCanPlay);
      document.addEventListener('fullscreenchange', handleFullScreenChange);
      
      // Auto-play attempt
      video.play().catch(error => {
        console.warn("Autoplay was prevented:", error.message, "User interaction might be required.");
        setIsPlaying(false); // Ensure isPlaying is false if autoplay fails
      });

      return () => {
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('ended', onEnded || onPause);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('canplay', onCanPlay);
        document.removeEventListener('fullscreenchange', handleFullScreenChange);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [onEnded, handleFullScreenChange]);

  useEffect(() => { // Reset controls timeout when isPlaying changes
    if (isPlaying) {
       handleMouseMove(); // Start timer if playing
    } else {
       if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
       setShowControls(true); // Always show controls when paused
    }
  }, [isPlaying]);

  const VolumeIcon = isMuted ? VolumeXIcon : volume > 0.5 ? Volume2Icon : volume > 0 ? Volume1Icon : VolumeXIcon;

  return (
    <TooltipProvider delayDuration={200}>
    <div 
      ref={playerRef} 
      className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group/player"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handlePlayPause} // Play/pause on video click
    >
      <video
        ref={videoRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-contain"
        // controls // Optionally hide default controls if custom ones are comprehensive
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2Icon className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      <div 
        className={cn(
            "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-300 ease-in-out space-y-2 z-20",
            showControls || !isPlaying ? "opacity-100" : "opacity-0 group-hover/player:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()} // Prevent player click from toggling play/pause
      >
        {/* Progress Bar */}
        <Slider
          value={[currentTime]}
          max={duration || 100} // Use 100 as fallback for display if duration is 0
          step={1}
          onValueChange={handleSeek}
          className="w-full h-2 cursor-pointer group/slider"
          indicatorClassName="bg-primary group-hover/slider:bg-red-400"
          aria-label="Video progress"
        />
        
        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1.5">
            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handlePlayPause} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
              {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </Button></TooltipTrigger><TooltipContent><p>{isPlaying ? 'Pause' : 'Play'} (k)</p></TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleSkip(-10)} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
              <RewindIcon className="w-5 h-5" />
            </Button></TooltipTrigger><TooltipContent><p>Rewind 10s (j)</p></TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleSkip(10)} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
              <FastForwardIcon className="w-5 h-5" />
            </Button></TooltipTrigger><TooltipContent><p>Forward 10s (l)</p></TooltipContent></Tooltip>

            <div className="flex items-center gap-1 group/volumecontrol">
              <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleMuteToggle} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
                <VolumeIcon className="w-5 h-5" />
              </Button></TooltipTrigger><TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'} (m)</p></TooltipContent></Tooltip>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-20 h-1.5 opacity-0 group-hover/volumecontrol:opacity-100 transition-opacity duration-200"
                aria-label="Volume"
              />
            </div>
            <div className="text-xs font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
             {document.pictureInPictureEnabled && (
             <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={togglePictureInPicture} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
                    <PipIcon className="w-5 h-5" />
                </Button>
             </TooltipTrigger><TooltipContent><p>Picture-in-Picture (i)</p></TooltipContent></Tooltip>
             )}
            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="text-white hover:bg-white/10 hover:text-white w-9 h-9">
              {isFullScreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
            </Button></TooltipTrigger><TooltipContent><p>{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'} (f)</p></TooltipContent></Tooltip>
          </div>
        </div>
      </div>
      {title && showControls && (
         <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ease-in-out z-20 pointer-events-none">
            <h3 className="text-white text-sm sm:text-md font-semibold truncate">{title}</h3>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
