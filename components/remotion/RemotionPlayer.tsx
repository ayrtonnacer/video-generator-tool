"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useCallback, useState, useEffect } from "react";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"webm" | "mp4">("webm");
  
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
  
  // Silent frame-by-frame export (no audio playback during export)
  const handleExport = useCallback(async () => {
    if (isExporting || !playerContainerRef.current) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Initializing...");
    
    try {
      const html2canvas = (await import("html2canvas")).default;
      
      // Create recording canvas
      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = 1080;
      recordCanvas.height = 1920;
      const recordCtx = recordCanvas.getContext("2d");
      if (!recordCtx) throw new Error("Canvas not available");
      
      // Setup MediaRecorder
      const stream = recordCanvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 10000000,
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
      
      // Ensure player is paused and at start
      playerRef.current?.pause();
      playerRef.current?.seekTo(0);
      await new Promise(r => setTimeout(r, 100));
      
      // Mute volume on the player during export
      playerRef.current?.setVolume(0);
      
      mediaRecorder.start(100);
      setExportStatus("Capturing frames...");
      
      // Frame by frame capture (silent - no playback)
      const exportFps = 20; // Capture at 20fps for faster export
      const totalFrames = Math.ceil(durationInFrames * (exportFps / fps));
      const frameStep = fps / exportFps;
      
      for (let i = 0; i < totalFrames; i++) {
        const targetFrame = Math.floor(i * frameStep);
        
        // Seek to frame (without playing)
        playerRef.current?.seekTo(targetFrame);
        await new Promise(r => setTimeout(r, 50)); // Wait for render
        
        // Find the player content
        const playerContent = playerContainerRef.current?.querySelector('[style*="position"]') as HTMLElement
          || playerContainerRef.current;
        
        if (playerContent) {
          try {
            const canvas = await html2canvas(playerContent, {
              backgroundColor: "#000",
              scale: 2,
              logging: false,
              useCORS: true,
            });
            
            // Draw to recording canvas
            recordCtx.fillStyle = "#000";
            recordCtx.fillRect(0, 0, 1080, 1920);
            
            const scale = Math.min(1080 / canvas.width, 1920 / canvas.height);
            const w = canvas.width * scale;
            const h = canvas.height * scale;
            const x = (1080 - w) / 2;
            const y = (1920 - h) / 2;
            
            recordCtx.drawImage(canvas, x, y, w, h);
          } catch {
            recordCtx.fillStyle = "#000";
            recordCtx.fillRect(0, 0, 1080, 1920);
          }
        }
        
        setExportProgress((i + 1) / totalFrames);
        if ((i + 1) % 10 === 0) {
          setExportStatus(`Capturing ${i + 1}/${totalFrames} frames...`);
        }
      }
      
      // Stop recording
      mediaRecorder.stop();
      setExportStatus("Processing video...");
      const webmBlob = await recordingPromise;
      
      // Restore volume
      playerRef.current?.setVolume(1);
      
      // Handle MP4 conversion if needed
      let finalBlob = webmBlob;
      let finalExt = "webm";
      
      if (exportFormat === "mp4") {
        setExportStatus("Converting to MP4...");
        try {
          const { FFmpeg } = await import("@ffmpeg/ffmpeg");
          const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
          
          const ffmpeg = new FFmpeg();
          
          const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          });
          
          const inputData = await fetchFile(webmBlob);
          await ffmpeg.writeFile("input.webm", inputData);
          
          await ffmpeg.exec([
            "-i", "input.webm",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "output.mp4"
          ]);
          
          const outputData = await ffmpeg.readFile("output.mp4");
          finalBlob = new Blob([outputData], { type: "video/mp4" });
          finalExt = "mp4";
        } catch (ffmpegError) {
          console.warn("MP4 conversion failed, using WebM:", ffmpegError);
          setExportStatus("MP4 failed, downloading as WebM...");
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // Download
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.${finalExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus("Done!");
      playerRef.current?.seekTo(0);
      setIsPlaying(false);
      
    } catch (error) {
      setExportStatus(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      playerRef.current?.setVolume(1);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 2000);
    }
  }, [isExporting, fps, durationInFrames, filename, exportFormat]);
  
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
      {/* Player */}
      <div 
        ref={playerContainerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? "flex items-center justify-center" : ""}`}
        style={{ aspectRatio: isFullscreen ? undefined : "9/16", maxHeight: isFullscreen ? "100vh" : "60vh" }}
      >
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
          loop={false}
          autoPlay={false}
          acknowledgeRemotionLicense
        />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" onClick={handleSeekToStart} disabled={isExporting}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button size="lg" onClick={isPlaying ? handlePause : handlePlay} className="px-8" disabled={isExporting}>
          {isPlaying ? <><Pause className="h-5 w-5 mr-2" />Pause</> : <><Play className="h-5 w-5 mr-2" />Play</>}
        </Button>
        
        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "webm" | "mp4")} disabled={isExporting}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="mp4">MP4</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? "Exporting..." : "Download"}
        </Button>
      </div>
      
      {/* Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${exportProgress * 100}%` }} />
          </div>
          <p className="text-center text-sm text-muted-foreground">{exportStatus} ({Math.round(exportProgress * 100)}%)</p>
        </div>
      )}
      
      <p className="text-center text-sm text-muted-foreground">
        Duration: {(durationInFrames / fps).toFixed(1)}s | {fps}fps | 1080x1920
      </p>
    </div>
  );
}
