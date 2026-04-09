"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, RotateCcw, Loader2, Maximize2, Minimize2 } from "lucide-react";

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
  musicFadeOut: number; // seconds for fade out
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Calculate duration based on code length and typing speed
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
  
  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);
  
  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  
  // Export using real-time playback recording (much faster than frame-by-frame)
  const handleExport = useCallback(async () => {
    if (isExporting || !playerContainerRef.current) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing recording...");
    
    try {
      // Find the player element
      const playerElement = playerContainerRef.current.querySelector('[style*="width"]') as HTMLElement 
        || playerContainerRef.current;
      
      if (!playerElement) throw new Error("Player element not found");
      
      // Create a canvas to capture the video
      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = 1080;
      recordCanvas.height = 1920;
      const recordCtx = recordCanvas.getContext("2d");
      if (!recordCtx) throw new Error("Canvas context not available");
      
      // Setup MediaRecorder on the canvas stream
      const stream = recordCanvas.captureStream(30);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000, // 8 Mbps
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
      
      // Dynamic import html2canvas
      const html2canvas = (await import("html2canvas")).default;
      
      // Reset to start and prepare
      playerRef.current?.seekTo(0);
      playerRef.current?.pause();
      await new Promise(r => setTimeout(r, 200));
      
      setExportStatus("Recording video...");
      mediaRecorder.start(100);
      
      // Play the video and capture in real-time at a lower frame rate for speed
      const exportFps = 15; // Lower FPS for faster export, still smooth
      const frameDuration = 1000 / exportFps;
      const totalExportFrames = Math.ceil(durationInFrames / (fps / exportFps));
      
      // Start playback
      playerRef.current?.play();
      
      let currentFrame = 0;
      const captureInterval = setInterval(async () => {
        if (currentFrame >= totalExportFrames) {
          clearInterval(captureInterval);
          return;
        }
        
        try {
          // Capture current state
          const capturedCanvas = await html2canvas(playerElement, {
            backgroundColor: "#000",
            scale: 1.5,
            logging: false,
            useCORS: true,
            allowTaint: true,
          });
          
          // Draw to record canvas
          recordCtx.fillStyle = "#000";
          recordCtx.fillRect(0, 0, 1080, 1920);
          
          const scale = Math.min(
            1080 / capturedCanvas.width,
            1920 / capturedCanvas.height
          );
          const scaledWidth = capturedCanvas.width * scale;
          const scaledHeight = capturedCanvas.height * scale;
          const x = (1080 - scaledWidth) / 2;
          const y = (1920 - scaledHeight) / 2;
          
          recordCtx.drawImage(capturedCanvas, x, y, scaledWidth, scaledHeight);
        } catch {
          // Continue on error
        }
        
        currentFrame++;
        setExportProgress(currentFrame / totalExportFrames);
        
        if (currentFrame % 10 === 0) {
          setExportStatus(`Recording... ${Math.round((currentFrame / totalExportFrames) * 100)}%`);
        }
      }, frameDuration);
      
      // Wait for playback to complete
      const playbackDuration = (durationInFrames / fps) * 1000;
      await new Promise(r => setTimeout(r, playbackDuration + 500));
      
      clearInterval(captureInterval);
      
      // Stop recording
      playerRef.current?.pause();
      setExportStatus("Finalizing...");
      
      mediaRecorder.stop();
      const webmBlob = await recordingPromise;
      
      // Download
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus("Done!");
      
      // Reset
      playerRef.current?.seekTo(0);
      setIsPlaying(false);
      
    } catch (error) {
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 2000);
    }
  }, [isExporting, fps, durationInFrames, filename]);
  
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
    musicFadeOut,
    durationInFrames, // Pass for fade calculation
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Player container with 9:16 aspect ratio */}
      <div 
        ref={playerContainerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? "flex items-center justify-center" : ""}`}
        style={{ aspectRatio: isFullscreen ? undefined : "9/16", maxHeight: isFullscreen ? "100vh" : "60vh" }}
      >
        {/* Fullscreen button overlay */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
          disabled={isExporting}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          size="lg"
          onClick={isPlaying ? handlePause : handlePlay}
          title={isPlaying ? "Pause" : "Play"}
          className="px-8"
          disabled={isExporting}
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
          onClick={handleExport}
          disabled={isExporting}
          title="Download Video (WebM)"
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isExporting ? "Exporting..." : "Download"}
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
            {exportStatus} ({Math.round(exportProgress * 100)}%)
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
