"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Film, AlertCircle } from "lucide-react";
import { AnimationConfig, calculateAnimationState, calculateTotalDuration, AnimationState, initialAnimationState } from "@/lib/animations";
import { CodePreviewHandle } from "@/components/code-editor/code-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ExportFormat = "mp4" | "webm";

interface VideoExporterProps {
  previewRef: React.RefObject<CodePreviewHandle | null>;
  code: string;
  animationConfig: AnimationConfig;
  filename: string;
  onAnimationStateChange?: (state: Partial<AnimationState>) => void;
}

// FFmpeg types for dynamic import
interface FFmpegInstance {
  load: (config: { coreURL: string; wasmURL: string }) => Promise<void>;
  on: (event: string, callback: (data: { progress?: number; message?: string }) => void) => void;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  exec: (args: string[]) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array>;
  deleteFile: (name: string) => Promise<void>;
}

export function VideoExporter({
  previewRef,
  code,
  animationConfig,
  filename,
  onAnimationStateChange,
}: VideoExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const ffmpegRef = useRef<FFmpegInstance | null>(null);

  const loadFFmpeg = useCallback(async (): Promise<FFmpegInstance> => {
    if (ffmpegRef.current && ffmpegLoaded) return ffmpegRef.current;

    setStatus("Loading FFmpeg...");
    
    // Dynamic import to avoid SSR issues
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    
    const ffmpeg = new FFmpeg() as FFmpegInstance;
    
    ffmpeg.on("progress", ({ progress: p }) => {
      if (p !== undefined) {
        setProgress(0.5 + p * 0.5); // FFmpeg progress is 50-100%
      }
    });

    ffmpeg.on("log", ({ message }) => {
      if (message) {
        console.log("[v0] FFmpeg:", message);
      }
    });

    // Load FFmpeg with CORS-compatible URLs
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    
    ffmpegRef.current = ffmpeg;
    setFfmpegLoaded(true);
    console.log("[v0] FFmpeg loaded successfully");
    return ffmpeg;
  }, [ffmpegLoaded]);

  const captureFrames = useCallback(async (
    canvas: HTMLCanvasElement,
    preview: CodePreviewHandle,
    totalDuration: number,
    fps: number
  ): Promise<Blob[]> => {
    const frames: Blob[] = [];
    const frameInterval = 1000 / fps;
    const totalFrames = Math.ceil(totalDuration / frameInterval);

    console.log("[v0] Starting frame capture:", { totalDuration, fps, totalFrames });

    for (let i = 0; i <= totalFrames; i++) {
      const time = i * frameInterval;
      
      // Calculate animation state for this frame
      const state = calculateAnimationState(animationConfig, code, time);
      
      // Update preview with this state
      onAnimationStateChange?.({
        ...initialAnimationState,
        ...state,
        currentTime: time,
        isPlaying: true,
      });
      
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 16));
      preview.render();
      
      // Capture frame as PNG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error("Failed to capture frame")),
          "image/png"
        );
      });
      
      frames.push(blob);
      setProgress((i / totalFrames) * 0.5); // Frame capture is 0-50%
      
      if (i % 30 === 0) {
        setStatus(`Capturing frames... ${Math.round((i / totalFrames) * 100)}%`);
      }
    }

    // Reset animation state
    onAnimationStateChange?.(initialAnimationState);
    
    console.log("[v0] Captured frames:", frames.length);
    return frames;
  }, [animationConfig, code, onAnimationStateChange]);

  const exportVideo = useCallback(async () => {
    const preview = previewRef.current;
    if (!preview) {
      setError("Preview not available");
      return;
    }

    const canvas = preview.getCanvas();
    if (!canvas) {
      setError("Canvas not available");
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);
    setStatus("Preparing...");

    try {
      const totalDuration = calculateTotalDuration(animationConfig, code);
      const fps = 30; // Use 30fps for better performance

      if (format === "mp4") {
        // MP4 export with FFmpeg
        const ffmpeg = await loadFFmpeg();

        // Dynamic import fetchFile
        const { fetchFile } = await import("@ffmpeg/util");

        // Capture all frames
        setStatus("Capturing frames...");
        const frames = await captureFrames(canvas, preview, totalDuration, fps);

        // Write frames to FFmpeg virtual filesystem
        setStatus("Processing frames...");
        for (let i = 0; i < frames.length; i++) {
          const frameData = await fetchFile(frames[i]);
          await ffmpeg.writeFile(`frame${i.toString().padStart(5, "0")}.png`, frameData);
        }

        // Encode video
        setStatus("Encoding video...");
        await ffmpeg.exec([
          "-framerate", fps.toString(),
          "-i", "frame%05d.png",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-preset", "medium",
          "-crf", "23",
          "-y",
          "output.mp4"
        ]);

        // Read output file
        const data = await ffmpeg.readFile("output.mp4");
        const blob = new Blob([data], { type: "video/mp4" });

        // Cleanup
        for (let i = 0; i < frames.length; i++) {
          try {
            await ffmpeg.deleteFile(`frame${i.toString().padStart(5, "0")}.png`);
          } catch {
            // Ignore cleanup errors
          }
        }
        try {
          await ffmpeg.deleteFile("output.mp4");
        } catch {
          // Ignore cleanup errors
        }

        // Download
        downloadBlob(blob, "mp4");
      } else {
        // WebM export with MediaRecorder
        setStatus("Recording video...");
        const stream = canvas.captureStream(fps);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8_000_000,
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        const recordingPromise = new Promise<Blob>((resolve) => {
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            resolve(blob);
          };
        });

        mediaRecorder.start(100);

        // Run animation in real-time for WebM recording
        const startTime = performance.now();

        const animate = () => {
          const elapsed = performance.now() - startTime;
          
          if (elapsed >= totalDuration) {
            onAnimationStateChange?.(initialAnimationState);
            mediaRecorder.stop();
            return;
          }

          const state = calculateAnimationState(animationConfig, code, elapsed);
          onAnimationStateChange?.({
            ...initialAnimationState,
            ...state,
            currentTime: elapsed,
            isPlaying: true,
          });
          preview.render();

          setProgress(elapsed / totalDuration);
          setStatus(`Recording... ${Math.round((elapsed / totalDuration) * 100)}%`);
          requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
        const blob = await recordingPromise;
        downloadBlob(blob, "webm");
      }

      setProgress(1);
      setStatus("Done!");
    } catch (err) {
      console.error("[v0] Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(""), 2000);
    }
  }, [previewRef, code, animationConfig, format, loadFFmpeg, captureFrames, onAnimationStateChange]);

  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.replace(/\.[^/.]+$/, "") || "code-video"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={exportVideo}
          disabled={isExporting}
          className="flex-1"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {Math.round(progress * 100)}%
            </>
          ) : (
            <>
              <Film className="h-4 w-4" />
              Export Video
            </>
          )}
        </Button>
      </div>

      {status && !error && (
        <p className="text-sm text-muted-foreground text-center">{status}</p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {format === "mp4" 
          ? "MP4 format - Compatible with all platforms" 
          : "WebM format - Best for web sharing"}
      </p>
    </div>
  );
}
