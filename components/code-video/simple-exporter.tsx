"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download, Play, FileVideo } from "lucide-react";

interface SimpleExporterProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  code: string;
  typingSpeed: number;
  filename: string;
  onPlayAnimation: () => void;
}

export function SimpleExporter({
  containerRef,
  code,
  typingSpeed,
  filename,
  onPlayAnimation,
}: SimpleExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Export video using MediaRecorder directly on a hidden player
  const exportVideo = useCallback(async () => {
    if (!containerRef.current) {
      setError("Preview container not found");
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setProgress(0);
    
    try {
      // Calculate duration
      const startDelay = 500;
      const typingDuration = (code.length / typingSpeed) * 1000;
      const endPause = 1000;
      const totalDuration = startDelay + typingDuration + endPause;
      
      // Create a canvas for recording
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;
      
      // Get stream from canvas
      const stream = canvas.captureStream(30);
      
      // Set up media recorder with best available codec
      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const recordingComplete = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          resolve(blob);
        };
      });
      
      // Start animation
      onPlayAnimation();
      
      // Wait a bit then start recording
      await new Promise((r) => setTimeout(r, 50));
      mediaRecorder.start();
      
      // Recording loop - capture frames in real time
      const fps = 30;
      const frameInterval = 1000 / fps;
      const totalFrames = Math.ceil((totalDuration / 1000) * fps);
      
      for (let frame = 0; frame < totalFrames; frame++) {
        await new Promise((r) => setTimeout(r, frameInterval));
        
        // Draw current state to canvas
        if (containerRef.current) {
          try {
            // Clear canvas
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Convert element to SVG and draw
            const element = containerRef.current;
            const svg = await elementToSVG(element);
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
            });
            
            // Calculate scaling to fit 9:16 aspect ratio
            const scale = Math.min(
              canvas.width / element.offsetWidth,
              canvas.height / element.offsetHeight
            );
            const x = (canvas.width - element.offsetWidth * scale) / 2;
            const y = (canvas.height - element.offsetHeight * scale) / 2;
            
            ctx.drawImage(
              img,
              x,
              y,
              element.offsetWidth * scale,
              element.offsetHeight * scale
            );
          } catch (e) {
            console.warn("Frame capture error:", e);
          }
        }
        
        setProgress((frame + 1) / totalFrames);
      }
      
      // Stop recording
      mediaRecorder.stop();
      const videoBlob = await recordingComplete;
      
      // Download
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^.]+$/, "")}_video.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setProgress(1);
    } catch (err) {
      console.error("Export error:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [containerRef, code, typingSpeed, filename, onPlayAnimation]);

  // Download as PNG screenshot
  const downloadScreenshot = useCallback(async () => {
    if (!containerRef.current) {
      setError("Preview container not found");
      return;
    }

    try {
      const element = containerRef.current;
      const svg = await elementToSVG(element);
      
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d")!;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
      });
      
      const scale = Math.min(
        canvas.width / element.offsetWidth,
        canvas.height / element.offsetHeight
      );
      const x = (canvas.width - element.offsetWidth * scale) / 2;
      const y = (canvas.height - element.offsetHeight * scale) / 2;
      
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, element.offsetWidth * scale, element.offsetHeight * scale);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filename.replace(/\.[^.]+$/, "")}_screenshot.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screenshot failed");
    }
  }, [containerRef, filename]);
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          onClick={exportVideo}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Recording... {Math.round(progress * 100)}%
            </>
          ) : (
            <>
              <FileVideo className="mr-2 h-5 w-5" />
              Export Video (WebM)
            </>
          )}
        </Button>
        
        <Button
          onClick={downloadScreenshot}
          variant="outline"
          className="w-full"
          size="lg"
          disabled={isExporting}
        >
          <Download className="mr-2 h-5 w-5" />
          Download Screenshot
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="text-center">Export at 1080x1920 (9:16) vertical format</p>
        <p className="text-center">Perfect for TikTok, Instagram Reels & YouTube Shorts</p>
      </div>
      
      <Button
        onClick={onPlayAnimation}
        variant="secondary"
        className="w-full"
        disabled={isExporting}
      >
        <Play className="mr-2 h-4 w-4" />
        Preview Animation
      </Button>
    </div>
  );
}

// Convert DOM element to SVG string
async function elementToSVG(element: HTMLElement): Promise<string> {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  // Clone and serialize
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Get computed styles
  const computedStyles = getComputedStyle(element);
  
  // Apply inline styles to clone
  applyComputedStyles(element, clone);
  
  const html = clone.outerHTML;
  
  // Create foreignObject SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif;">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;
  
  return svg;
}

function applyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const styles = getComputedStyle(source);
  const importantStyles = [
    "background", "background-color", "background-image",
    "color", "font-family", "font-size", "font-weight",
    "line-height", "padding", "margin", "border", "border-radius",
    "display", "flex-direction", "align-items", "justify-content",
    "gap", "width", "height", "min-width", "min-height",
    "box-shadow", "text-shadow", "opacity", "transform",
  ];
  
  let inlineStyle = "";
  for (const prop of importantStyles) {
    const value = styles.getPropertyValue(prop);
    if (value) {
      inlineStyle += `${prop}: ${value}; `;
    }
  }
  target.setAttribute("style", inlineStyle);
  
  // Recursively apply to children
  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (sourceChildren[i] instanceof HTMLElement && targetChildren[i] instanceof HTMLElement) {
      applyComputedStyles(sourceChildren[i] as HTMLElement, targetChildren[i] as HTMLElement);
    }
  }
}
