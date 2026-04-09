"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";
import { Button } from "@/components/ui/button";
import { Download, Play, Pause, RotateCcw, Loader2 } from "lucide-react";

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
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  
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
  
  // Export using html2canvas + MediaRecorder
  const handleExport = useCallback(async () => {
    if (isExporting || !playerContainerRef.current) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing export...");
    
    try {
      // Dynamic import html2canvas
      const html2canvas = (await import("html2canvas")).default;
      
      // Create offscreen canvas for recording
      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = 1080;
      recordCanvas.height = 1920;
      const recordCtx = recordCanvas.getContext("2d");
      if (!recordCtx) throw new Error("Canvas context not available");
      
      // Setup MediaRecorder
      const stream = recordCanvas.captureStream(fps);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 10000000, // 10 Mbps for high quality
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
      
      mediaRecorder.start(100); // Collect data every 100ms
      
      // Reset to start
      playerRef.current?.seekTo(0);
      await new Promise(r => setTimeout(r, 100));
      
      setExportStatus("Capturing frames...");
      
      // Capture frames
      const totalFrames = durationInFrames;
      const frameDelay = 1000 / fps;
      
      for (let i = 0; i < totalFrames; i++) {
        // Seek to frame
        playerRef.current?.seekTo(i);
        
        // Wait for render
        await new Promise(r => setTimeout(r, frameDelay));
        
        // Capture the player content
        const playerElement = playerContainerRef.current?.querySelector('[data-remotion-player-content]') as HTMLElement 
          || playerContainerRef.current?.firstChild as HTMLElement;
        
        if (playerElement) {
          try {
            const capturedCanvas = await html2canvas(playerElement, {
              backgroundColor: null,
              scale: 2, // Higher quality
              logging: false,
              useCORS: true,
              allowTaint: true,
              width: playerElement.offsetWidth,
              height: playerElement.offsetHeight,
            });
            
            // Draw to record canvas, scaling to 1080x1920
            recordCtx.fillStyle = "#000";
            recordCtx.fillRect(0, 0, 1080, 1920);
            
            // Calculate scaling to fit 9:16 aspect ratio
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
            // If capture fails, draw black frame
            recordCtx.fillStyle = "#000";
            recordCtx.fillRect(0, 0, 1080, 1920);
          }
        }
        
        setExportProgress((i + 1) / totalFrames);
        
        // Update status every 10%
        if ((i + 1) % Math.ceil(totalFrames / 10) === 0) {
          setExportStatus(`Capturing frame ${i + 1}/${totalFrames}...`);
        }
      }
      
      setExportStatus("Finalizing video...");
      
      // Stop recording
      mediaRecorder.stop();
      const webmBlob = await recordingPromise;
      
      // Download the video
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus("Done!");
      
      // Reset player
      playerRef.current?.seekTo(0);
      playerRef.current?.pause();
      setIsPlaying(false);
      
    } catch (error) {
      console.error("Export failed:", error);
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
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Player container with 9:16 aspect ratio */}
      <div 
        ref={playerContainerRef}
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "9/16", maxHeight: "60vh" }}
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
