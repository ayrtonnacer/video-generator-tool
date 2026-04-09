"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo, CodeThemeName, BackgroundName } from "./CodeVideo";

interface RemotionPlayerProps {
  code: string;
  language: string;
  theme: CodeThemeName;
  background: BackgroundName;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  filename: string;
  typingSpeed: number;
  onDurationChange?: (duration: number) => void;
}

export function RemotionPlayer({
  code,
  language,
  theme,
  background,
  fontSize,
  padding,
  showWindowChrome,
  filename,
  typingSpeed,
  onDurationChange,
}: RemotionPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Calculate duration based on code length and typing speed
  const fps = 30;
  const typingDuration = Math.ceil((code.length / typingSpeed) * fps);
  const holdDuration = fps * 2; // 2 seconds hold at the end
  const durationInFrames = typingDuration + holdDuration;
  
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
  
  // Listen to player events
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
    fontSize,
    padding,
    showWindowChrome,
    filename,
    typingSpeed,
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Player container with 9:16 aspect ratio */}
      <div 
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "9/16", maxHeight: "70vh" }}
      >
        <Player
          ref={playerRef}
          component={CodeVideo}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{
            width: "100%",
            height: "100%",
          }}
          controls={false}
          loop={false}
          autoPlay={false}
        />
      </div>
      
      {/* Custom controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleSeekToStart}
          className="p-3 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          title="Reset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Duration info */}
      <p className="text-center text-sm text-muted-foreground">
        Duration: {(durationInFrames / fps).toFixed(1)}s ({durationInFrames} frames @ {fps}fps)
      </p>
    </div>
  );
}
