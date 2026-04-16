"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

interface RemotionPlayerProps {
  code: string;
  language: string;
  theme: CodeThemeName;
  background: BackgroundName;
  customBackgroundColor?: string;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  filename: string;
  typingSpeed: number;
  holdTime: number;
  musicEnabled: boolean;
  musicFadeOut: number;
  onDurationChange?: (duration: number) => void;
}

export function RemotionPlayer({
  code,
  language,
  theme,
  background,
  customBackgroundColor,
  fontSize,
  padding,
  showWindowChrome,
  filename,
  typingSpeed,
  holdTime,
  musicEnabled,
  musicFadeOut,
  onDurationChange,
}: RemotionPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Calculate duration
  const fps = 30;
  const safeTypingSpeed = Math.max(1, typingSpeed || 25);
  const safeHoldTime = Math.max(0, holdTime ?? 2);
  const safeCodeLength = Math.max(1, code?.length || 1);
  
  const typingDuration = Math.max(1, Math.ceil((safeCodeLength / safeTypingSpeed) * fps));
  const holdDuration = Math.max(0, Math.ceil(fps * safeHoldTime));
  const durationInFrames = Math.max(30, typingDuration + holdDuration);
  
  useEffect(() => {
    if (onDurationChange) {
      onDurationChange(durationInFrames / fps);
    }
  }, [durationInFrames, fps, onDurationChange]);
  
  const handlePlay = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
  }, []);
  
  const handlePause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);
  
  const handleSeekToStart = useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);
  
  const handleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    
    const handlePlayEvent = () => setIsPlaying(true);
    const handlePauseEvent = () => setIsPlaying(false);
    const handleEndedEvent = () => setIsPlaying(false);
    
    player.addEventListener("play", handlePlayEvent);
    player.addEventListener("pause", handlePauseEvent);
    player.addEventListener("ended", handleEndedEvent);
    
    return () => {
      player.removeEventListener("play", handlePlayEvent);
      player.removeEventListener("pause", handlePauseEvent);
      player.removeEventListener("ended", handleEndedEvent);
    };
  }, []);
  
  const inputProps = {
    code,
    language,
    theme,
    background,
    customBackgroundColor,
    fontSize,
    padding,
    showWindowChrome,
    filename,
    typingSpeed,
    musicEnabled,
    musicFadeOut,
    durationInFrames,
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Player container */}
      <div
        ref={playerContainerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? "flex items-center justify-center" : ""}`}
        style={{
          aspectRatio: isFullscreen ? undefined : "9/16",
          maxHeight: isFullscreen ? "100vh" : "65vh",
          maxWidth: isFullscreen ? undefined : "calc(65vh * 9 / 16)",
          margin: "0 auto",
        }}
      >
        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        
        <Player
          ref={playerRef}
          component={CodeVideo}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: "100%", height: "100%" }}
          controls={false}
          loop={true}
          autoPlay={false}
          acknowledgeRemotionLicense
          errorFallback={({ error }) => (
            <div style={{ color: "red", padding: 16, fontSize: 12, background: "#1a0000", height: "100%", overflow: "auto" }}>
              <strong>Composition error:</strong>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{error.message}</pre>
            </div>
          )}
        />
      </div>
      
      {/* Playback controls */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={handleSeekToStart}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button size="lg" onClick={isPlaying ? handlePause : handlePlay} className="px-8">
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Play
            </>
          )}
        </Button>
      </div>
      
      <p className="text-center text-sm text-muted-foreground">
        Duration: {(durationInFrames / fps).toFixed(1)}s | 1080x1920 (9:16)
      </p>
    </div>
  );
}
