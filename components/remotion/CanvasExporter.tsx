"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Player, PlayerRef } from "@remotion/player";
import { CodeVideo } from "./CodeVideo";
import type { CodeThemeName, BackgroundName } from "./CodeVideo";

interface CanvasExporterProps {
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
  fps?: number;
}

export function CanvasExporter({
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
  fps = 30,
}: CanvasExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  const playerRef = useRef<PlayerRef>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Match the same duration calculation used by RemotionPlayer
  const safeTypingSpeed = Math.max(1, typingSpeed || 25);
  const safeHoldTime = Math.max(0, holdTime ?? 2);
  const typingDuration = Math.max(1, Math.ceil((code.length / safeTypingSpeed) * fps));
  const holdDuration = Math.max(0, Math.ceil(fps * safeHoldTime));
  const durationInFrames = Math.max(30, typingDuration + holdDuration);
  const totalDuration = durationInFrames / fps;

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    const player = playerRef.current;
    const container = playerContainerRef.current;
    if (!player || !container) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Loading FFmpeg…");

    try {
      // ── 1. Load FFmpeg ────────────────────────────────────────────────────
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress: p }) => {
        if (p !== undefined) setExportProgress(0.85 + p * 0.14);
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      // ── 2. Import html2canvas (dynamic so it doesn't break SSR) ──────────
      const html2canvas = (await import("html2canvas")).default;

      // ── 3. Capture every frame from the hidden Remotion Player ───────────
      player.pause();
      setExportStatus("Rendering frames…");

      for (let frame = 0; frame < durationInFrames; frame++) {
        player.seekTo(frame);

        // Give Remotion two rAF ticks to paint
        await new Promise<void>((res) =>
          requestAnimationFrame(() => requestAnimationFrame(() => res()))
        );

        const snap = await html2canvas(container, {
          useCORS: true,
          scale: 1,
          width: 1080,
          height: 1920,
          logging: false,
          backgroundColor: null,
        });

        const blob = await new Promise<Blob>((res, rej) => {
          try {
            snap.toBlob((b) => {
              if (b) res(b);
              else rej(new Error("html2canvas returned null, possibly tainted/blocked by CORS."));
            }, "image/png");
          } catch (err) {
            rej(err);
          }
        });
        
        // Free up html2canvas memory immediately to prevent mobile/Vercel crashes
        snap.width = 0;
        snap.height = 0;

        await ffmpeg.writeFile(
          `f${frame.toString().padStart(5, "0")}.png`,
          await fetchFile(blob)
        );

        const pct = (frame + 1) / durationInFrames;
        setExportProgress(pct * 0.82);
        if (frame % 15 === 0) {
          setExportStatus(`Rendering… ${Math.round(pct * 100)}%`);
        }
      }

      // ── 4. Build FFmpeg argument list ─────────────────────────────────────
      const args: string[] = [
        "-framerate", fps.toString(),
        "-i", "f%05d.png",
      ];

      if (musicEnabled) {
        setExportStatus("Adding music…");
        try {
          // Use the actual file that exists in /public
          const musicRes = await fetch("/background-music.mp3");
          if (musicRes.ok) {
            const musicBlob = await musicRes.blob();
            await ffmpeg.writeFile("audio.mp3", await fetchFile(musicBlob));

            args.push("-i", "audio.mp3", "-t", totalDuration.toString());

            if (musicFadeOut > 0) {
              const fadeStart = Math.max(0, totalDuration - musicFadeOut);
              args.push(
                "-filter_complex",
                `[1:a]afade=t=out:st=${fadeStart}:d=${musicFadeOut}[a]`,
                "-map", "0:v",
                "-map", "[a]"
              );
            } else {
              args.push("-map", "0:v", "-map", "1:a");
            }
          }
        } catch (err) {
          console.error("Music fetch failed – exporting without audio:", err);
        }
      }

      args.push(
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        "output.mp4"
      );

      // ── 5. Encode ─────────────────────────────────────────────────────────
      setExportStatus("Encoding MP4…");
      await ffmpeg.exec(args);

      // ── 6. Download ───────────────────────────────────────────────────────
      const data = await ffmpeg.readFile("output.mp4");
      const finalBlob = new Blob([data as Uint8Array], { type: "video/mp4" });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(1);
      setExportStatus("Done! 🎉");
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus("");
        setExportProgress(0);
      }, 3000);
    }
  }, [
    isExporting,
    code,
    typingSpeed,
    holdTime,
    fps,
    filename,
    musicEnabled,
    musicFadeOut,
    durationInFrames,
    totalDuration,
  ]);

  // Props for the hidden player – music disabled here; we add it via FFmpeg
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
    musicEnabled: false,
    musicFadeOut,
    durationInFrames,
  };

  return (
    <div className="flex flex-col gap-3">
      {/*
       * Hidden Remotion Player used only for frame capture.
       * Positioned off-screen so it renders but is invisible to the user.
       */}
      <div
        ref={playerContainerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 0.01,
          zIndex: -50,
        }}
      >
        <Player
          ref={playerRef}
          component={CodeVideo}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: 1080, height: 1920 }}
          controls={false}
          loop={false}
          autoPlay={false}
          acknowledgeRemotionLicense
        />
      </div>

      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full gap-2"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {Math.round(exportProgress * 100)}%
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download MP4 with Music
          </>
        )}
      </Button>

      {exportStatus && (
        <p className="text-center text-xs text-muted-foreground">
          {exportStatus}
        </p>
      )}
    </div>
  );
}
