"use client";

import { useState, useRef, useCallback } from "react";

interface UseVideoRecorderOptions {
  canvas: HTMLCanvasElement | null;
  fps?: number;
  videoBitsPerSecond?: number;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export function useVideoRecorder({
  canvas,
  fps = 60,
  videoBitsPerSecond = 8_000_000, // 8 Mbps for good quality
}: UseVideoRecorderOptions) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    progress: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!canvas) {
      setState((prev) => ({ ...prev, error: "Canvas not available" }));
      return null;
    }

    try {
      // Get canvas stream at specified fps
      const stream = canvas.captureStream(fps);

      // Find supported mime type
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setState((prev) => ({
          ...prev,
          isRecording: false,
          error: "Recording failed",
        }));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setState({
        isRecording: true,
        isProcessing: false,
        progress: 0,
        error: null,
      });

      return mediaRecorder;
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to start recording",
      }));
      return null;
    }
  }, [canvas, fps, videoBitsPerSecond]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        reject(new Error("No active recording"));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        setState({
          isRecording: false,
          isProcessing: false,
          progress: 1,
          error: null,
        });
        resolve(blob);
      };

      mediaRecorder.stop();
      setState((prev) => ({ ...prev, isRecording: false, isProcessing: true }));
    });
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    downloadBlob,
    updateProgress,
  };
}
