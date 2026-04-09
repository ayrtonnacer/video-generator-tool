"use client";

// Remotion Player wrapper for Next.js
import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, RotateCcw } from "lucide-react";

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
  onDurationChange,
}: RemotionPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Calculate duration based on code length and typing speed
  const fps = 30;
  const safeTypingSpeed = typingSpeed || 25;
  const safeHoldTime = holdTime ?? 2;
  const safeCodeLength = code?.length || 1;
  
  const typingDuration = Math.ceil((safeCodeLength / safeTypingSpeed) * fps);
  const holdDuration = Math.ceil(fps * safeHoldTime);
  const durationInFrames = Math.max(1, typingDuration + holdDuration) || 60;
  
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
  
  // Export to MP4 using MediaRecorder (WebM) + canvas
  const handleExport = useCallback(async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // Get the player container
      const playerContainer = document.querySelector('[data-remotion-player]') as HTMLElement;
      if (!playerContainer) throw new Error("Player not found");
      
      // Create a canvas to capture frames
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");
      
      // Use MediaRecorder with canvas stream
      const stream = canvas.captureStream(fps);
      
      // Add audio if music is enabled
      if (musicEnabled) {
        try {
          const audioElement = document.querySelector("audio") as HTMLAudioElement;
          if (audioElement) {
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaElementSource(audioElement);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioCtx.destination);
            
            destination.stream.getAudioTracks().forEach(track => {
              stream.addTrack(track);
            });
          }
        } catch {
          // Audio capture not available
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000,
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });
      
      mediaRecorder.start();
      
      // Reset to start
      playerRef.current?.seekTo(0);
      
      // Capture frames
      const totalFrames = durationInFrames;
      for (let i = 0; i < totalFrames; i++) {
        playerRef.current?.seekTo(i);
        
        // Wait for frame to render
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        
        // Capture the player content
        const playerElement = playerRef.current?.getContainerNode();
        if (playerElement) {
          // Use html2canvas alternative - draw scaled content
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw frame indicator for demo (actual implementation would capture DOM)
          ctx.fillStyle = "#fff";
          ctx.font = "48px monospace";
          ctx.fillText(`Frame ${i + 1}/${totalFrames}`, 100, 100);
        }
        
        setExportProgress((i + 1) / totalFrames);
      }
      
      mediaRecorder.stop();
      const webmBlob = await recordingPromise;
      
      // Download the video
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "")}_video.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Reset player
      playerRef.current?.seekTo(0);
      
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting, fps, durationInFrames, filename, musicEnabled]);
  
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
    customBackgroundColor,
    fontSize,
    padding,
    showWindowChrome,
    filename,
    typingSpeed,
    musicEnabled,
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Player container with 9:16 aspect ratio */}
      <div 
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "9/16", maxHeight: "60vh" }}
        data-remotion-player
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
          acknowledgeRemotionLicense
        />
      </div>
      
      {/* Custom controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handleSeekToStart}
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          size="lg"
          onClick={isPlaying ? handlePause : handlePlay}
          title={isPlaying ? "Pause" : "Play"}
          className="px-8"
        >
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
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleExport}
          disabled={isExporting}
          title="Download Video"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Export progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${exportProgress * 100}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Exporting... {Math.round(exportProgress * 100)}%
          </p>
        </div>
      )}
      
      {/* Duration info */}
      <p className="text-center text-sm text-muted-foreground">
        Duration: {(durationInFrames / fps).toFixed(1)}s | {fps}fps | 1080x1920
      </p>
    </div>
  );
}
