"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Film } from "lucide-react";
import { AnimationConfig, calculateAnimationState, calculateTotalDuration } from "@/lib/animations";
import { CodePreviewHandle } from "@/components/code-editor/code-preview";

interface VideoExporterProps {
  previewRef: React.RefObject<CodePreviewHandle | null>;
  code: string;
  animationConfig: AnimationConfig;
  filename: string;
}

export function VideoExporter({
  previewRef,
  code,
  animationConfig,
  filename,
}: VideoExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);

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

    try {
      const totalDuration = calculateTotalDuration(animationConfig, code);
      const fps = 60;
      const frameInterval = 1000 / fps;

      // Setup MediaRecorder
      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Start recording
      mediaRecorder.start(100);

      // Animate and render frames
      const startTime = performance.now();
      let currentTime = 0;

      const renderFrame = () => {
        if (currentTime >= totalDuration) {
          // Stop recording
          mediaRecorder.stop();
          return;
        }

        // Calculate and apply animation state
        const state = calculateAnimationState(animationConfig, code, currentTime);
        
        // Force a re-render of the preview with the new state
        // This is done by the parent component via the render callback
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // The preview component handles rendering
          // We just need to trigger it
          preview.render();
        }

        // Update progress
        setProgress(currentTime / totalDuration);
        currentTime += frameInterval;

        // Schedule next frame
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      // Wait for recording to complete
      await new Promise<void>((resolve, reject) => {
        mediaRecorder.onstop = () => resolve();
        mediaRecorder.onerror = () => reject(new Error("Recording failed"));

        // Start animation loop
        renderFrame();
      });

      // Create and download blob
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code-video"}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(1);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [previewRef, code, animationConfig, filename]);

  // Simple export using MediaRecorder directly with animation playback
  const exportVideoSimple = useCallback(async () => {
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

    try {
      const totalDuration = calculateTotalDuration(animationConfig, code);
      const fps = 60;

      // Setup MediaRecorder
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

      // Start recording
      mediaRecorder.start(100);

      // Run animation
      let startTime: number | null = null;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        if (elapsed >= totalDuration) {
          mediaRecorder.stop();
          return;
        }

        // Update progress
        setProgress(elapsed / totalDuration);
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);

      // Wait for recording to complete
      const blob = await recordingPromise;

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code-video"}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(1);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [previewRef, code, animationConfig, filename]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={exportVideoSimple}
        disabled={isExporting}
        className="w-full"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting... {Math.round(progress * 100)}%
          </>
        ) : (
          <>
            <Film className="h-4 w-4" />
            Export Video
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Exports as WebM video (9:16 vertical format)
      </p>
    </div>
  );
}
