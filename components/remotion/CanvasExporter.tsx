"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("python", python);

// ─── Theme & background palettes (must match CodeVideo.tsx) ──────────────────

const canvasThemes = {
  "terminal-dark": {
    background: "#0d1117",
    foreground: "#e6edf3",
    comment: "#8b949e",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    number: "#79c0ff",
    function: "#d2a8ff",
    builtin: "#ffa657",
  },
  "python-dark": {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    comment: "#6a9955",
    keyword: "#569cd6",
    string: "#ce9178",
    number: "#b5cea8",
    function: "#dcdcaa",
    builtin: "#4ec9b0",
  },
  monokai: {
    background: "#272822",
    foreground: "#f8f8f2",
    comment: "#75715e",
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    function: "#a6e22e",
    builtin: "#66d9ef",
  },
} as const;

const canvasBackgrounds = {
  // Must match `backgroundStyles` in CodeVideo.tsx as closely as possible.
  // We translate CSS gradients into Canvas gradients at render time.
  "scale-dark": {
    bg: "#09090b",
    gradientCss: "radial-gradient(ellipse at top, #18181b 0%, #09090b 50%)",
    pattern: "dots",
  },
  "scale-purple": {
    bg: "#0c0a1d",
    gradientCss:
      "radial-gradient(ellipse at top right, #2e1065 0%, #0c0a1d 60%)",
    pattern: "grid",
  },
  "scale-blue": {
    bg: "#020617",
    gradientCss:
      "radial-gradient(ellipse at bottom left, #0c4a6e 0%, #020617 60%)",
    pattern: "dots",
  },
  midnight: {
    bg: "#000000",
    gradientCss: "linear-gradient(180deg, #111827 0%, #000000 100%)",
    pattern: "none",
  },
  aurora: {
    bg: "#0f0f23",
    gradientCss:
      "linear-gradient(135deg, #1a1a3e 0%, #0f0f23 50%, #1e3a5f 100%)",
    pattern: "grid",
  },
  custom: {
    bg: "#000000",
    gradientCss: "none",
    pattern: "none",
  },
} as const;

// ─── Tokenizer ──────────────────────────────────────────────────────────────

function tokenizePython(
  code: string
): Array<{ text: string; type: string }> {
  const tokens: Array<{ text: string; type: string }> = [];
  const keywords = new Set([
    "def","class","if","elif","else","for","while","return","import","from",
    "as","try","except","finally","with","lambda","yield","raise","pass",
    "break","continue","in","not","and","or","is","True","False","None",
    "async","await","global","nonlocal","assert","del",
  ]);
  const builtins = new Set([
    "print","len","range","str","int","float","list","dict","set","tuple",
    "open","input","type","isinstance","hasattr","getattr","setattr","sum",
    "min","max","abs","round","sorted","reversed","enumerate","zip","map",
    "filter",
  ]);

  let i = 0;
  while (i < code.length) {
    // Comments
    if (code[i] === "#") {
      let end = i;
      while (end < code.length && code[end] !== "\n") end++;
      tokens.push({ text: code.slice(i, end), type: "comment" });
      i = end;
      continue;
    }
    // Strings
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      const triple = code.slice(i, i + 3) === quote.repeat(3);
      const endQuote = triple ? quote.repeat(3) : quote;
      let end = i + (triple ? 3 : 1);
      while (end < code.length) {
        if (code.slice(end, end + endQuote.length) === endQuote) {
          end += endQuote.length;
          break;
        }
        if (code[end] === "\\" && end + 1 < code.length) end++;
        end++;
      }
      tokens.push({ text: code.slice(i, end), type: "string" });
      i = end;
      continue;
    }
    // Numbers
    if (/[0-9]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[0-9.eExXoObBa-fA-F_]/.test(code[end]))
        end++;
      tokens.push({ text: code.slice(i, end), type: "number" });
      i = end;
      continue;
    }
    // Identifiers / keywords / builtins
    if (/[a-zA-Z_]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[a-zA-Z0-9_]/.test(code[end])) end++;
      const word = code.slice(i, end);
      let type = "default";
      if (keywords.has(word)) type = "keyword";
      else if (builtins.has(word)) type = "builtin";
      else if (end < code.length && code[end] === "(") type = "function";
      tokens.push({ text: word, type });
      i = end;
      continue;
    }
    // Decorators
    if (code[i] === "@") {
      let end = i + 1;
      while (end < code.length && /[a-zA-Z0-9_.]/.test(code[end])) end++;
      tokens.push({ text: code.slice(i, end), type: "function" });
      i = end;
      continue;
    }
    // Whitespace
    if (/\s/.test(code[i])) {
      if (code[i] === "\n") {
        tokens.push({ text: "\n", type: "newline" });
        i++;
      } else {
        let end = i;
        while (end < code.length && /\s/.test(code[end]) && code[end] !== "\n")
          end++;
        tokens.push({ text: code.slice(i, end), type: "whitespace" });
        i = end;
      }
      continue;
    }
    // Default (operators, punctuation, etc.)
    tokens.push({ text: code[i], type: "default" });
    i++;
  }
  return tokens;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface CanvasExporterProps {
  code: string;
  language: string;
  theme: keyof typeof canvasThemes;
  background: keyof typeof canvasBackgrounds;
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
  const [exportError, setExportError] = useState<string>("");
  const [usedCodec, setUsedCodec] = useState<string>("");
  const [lastWebmBlob, setLastWebmBlob] = useState<Blob | null>(null);

  const themeColors = canvasThemes[theme] || canvasThemes["terminal-dark"];
  const bgColors =
    canvasBackgrounds[background] || canvasBackgrounds["scale-dark"];

  const fontFamily =
    '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace';

  const computeCursorOpacity = useCallback(
    (frame: number) => {
      const halfPeriodFrames = Math.max(1, Math.round(fps / 2));
      const quarter = Math.max(1, Math.round(halfPeriodFrames / 2));
      const m = frame % halfPeriodFrames;
      // Match Remotion interpolate([0, fps/4, fps/2],[1,1,0]) behavior.
      if (m <= quarter) return 1;
      const t = (m - quarter) / Math.max(1, halfPeriodFrames - quarter);
      return Math.max(0, 1 - t);
    },
    [fps]
  );

  const fillBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const actualBg =
        background === "custom" && customBackgroundColor
          ? customBackgroundColor
          : bgColors.bg;

      // Solid base
      ctx.fillStyle = actualBg;
      ctx.fillRect(0, 0, width, height);

      // Gradient overlay (approximate CSS gradients from CodeVideo.tsx)
      const gradientCss =
        background === "custom" && customBackgroundColor
          ? `linear-gradient(180deg, ${customBackgroundColor} 0%, ${customBackgroundColor} 100%)`
          : bgColors.gradientCss;

      if (gradientCss.startsWith("linear-gradient(180deg")) {
        // top -> bottom
        const g = ctx.createLinearGradient(0, 0, 0, height);
        if (background === "custom" && customBackgroundColor) {
          g.addColorStop(0, customBackgroundColor);
          g.addColorStop(1, customBackgroundColor);
        } else if (background === "midnight") {
          g.addColorStop(0, "#111827");
          g.addColorStop(1, "#000000");
        } else {
          g.addColorStop(0, actualBg);
          g.addColorStop(1, actualBg);
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      } else if (gradientCss.startsWith("linear-gradient(135deg")) {
        // diagonal: approximate with linear gradient top-left -> bottom-right
        const g = ctx.createLinearGradient(0, 0, width, height);
        // Aurora: #1a1a3e 0%, #0f0f23 50%, #1e3a5f 100%
        g.addColorStop(0, "#1a1a3e");
        g.addColorStop(0.5, "#0f0f23");
        g.addColorStop(1, "#1e3a5f");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      } else if (gradientCss.startsWith("radial-gradient")) {
        // Use a radial gradient anchored based on variant.
        let cx = width / 2;
        let cy = 0;
        let inner = Math.min(width, height) * 0.1;
        let outer = Math.max(width, height) * 0.9;

        if (background === "scale-purple") {
          cx = width;
          cy = 0;
          outer = Math.max(width, height) * 1.1;
        }
        if (background === "scale-blue") {
          cx = 0;
          cy = height;
          outer = Math.max(width, height) * 1.1;
        }

        const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
        if (background === "scale-dark") {
          g.addColorStop(0, "#18181b");
          g.addColorStop(0.5, "#09090b");
        } else if (background === "scale-purple") {
          g.addColorStop(0, "#2e1065");
          g.addColorStop(0.6, "#0c0a1d");
        } else if (background === "scale-blue") {
          g.addColorStop(0, "#0c4a6e");
          g.addColorStop(0.6, "#020617");
        } else {
          g.addColorStop(0, actualBg);
          g.addColorStop(1, actualBg);
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      // Pattern overlay
      const pattern = bgColors.pattern;
      if (pattern === "dots") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        for (let y = 0; y < height; y += 24) {
          for (let x = 0; x < width; x += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (pattern === "grid") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        const step = 40;
        for (let y = 0; y <= height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(width, y + 0.5);
          ctx.stroke();
        }
        for (let x = 0; x <= width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, height);
          ctx.stroke();
        }
      }
    },
    [background, customBackgroundColor, bgColors.bg, bgColors.gradientCss, bgColors.pattern]
  );

  // ── renderFrame: draws one frame onto a provided CanvasRenderingContext2D ──

  const renderFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      visibleChars: number,
      width: number,
      height: number
    ) => {
      // Background (match CodeVideo.tsx)
      fillBackground(ctx, width, height);

      // Code window
      const outerPadding = 40; // matches CodeVideo AbsoluteFill padding
      const maxWindowWidth = 950; // matches CodeVideo maxWidth
      const windowWidth = Math.min(width - outerPadding * 2, maxWindowWidth);
      const windowX = Math.round((width - windowWidth) / 2);
      const chromeHeight = showWindowChrome ? 44 : 0;

      // Estimate a stable window height based on full code (so it doesn't "grow")
      const codeAreaMinHeight = 400;
      const lineHeight = fontSize * 1.6;
      ctx.font = `${fontSize}px ${fontFamily}`;
      const maxTextWidth = windowWidth - padding * 2;

      const wrapMeasureLines = (text: string) => {
        let lines = 1;
        let current = 0;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === "\n") {
            lines++;
            current = 0;
            continue;
          }
          const w = ctx.measureText(ch).width;
          if (current + w > maxTextWidth && current > 0) {
            lines++;
            current = 0;
          }
          current += w;
        }
        return lines;
      };

      const fullLines = wrapMeasureLines(code || "");
      const estimatedTextHeight = Math.ceil(fullLines * lineHeight + fontSize);
      const codeAreaHeight = Math.max(codeAreaMinHeight, estimatedTextHeight);
      const windowHeight = chromeHeight + padding * 2 + codeAreaHeight;

      const windowY = Math.round((height - windowHeight) / 2);

      // Shadow to match CodeVideo boxShadow feel
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 25;
      ctx.fillStyle = themeColors.background;
      ctx.beginPath();
      ctx.roundRect(windowX, windowY, windowWidth, windowHeight, 16);
      ctx.fill();
      ctx.restore();

      // subtle border stroke (like 1px rgba(255,255,255,0.05))
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(windowX, windowY, windowWidth, windowHeight, 16);
      ctx.stroke();

      // Window chrome
      if (showWindowChrome) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.roundRect(windowX, windowY, windowWidth, chromeHeight, [
          16, 16, 0, 0,
        ]);
        ctx.fill();

        const dotY = windowY + chromeHeight / 2;
        ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(windowX + 24 + i * 20, dotY, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = themeColors.foreground;
        ctx.globalAlpha = 0.6;
        ctx.font = `14px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.fillText(filename, windowX + windowWidth / 2, dotY + 4);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      // Code text
      const codeX = windowX + padding;
      let codeY = windowY + chromeHeight + padding + fontSize;

      ctx.font = `${fontSize}px ${fontFamily}`;

      const visibleCode = code.slice(0, visibleChars);
      const tokens =
        language === "plaintext"
          ? [{ text: visibleCode, type: "default" }]
          : tokenizePython(visibleCode);

      let currentX = codeX;
      const maxX = windowX + windowWidth - padding;
      for (const token of tokens) {
        if (token.type === "newline") {
          codeY += lineHeight;
          currentX = codeX;
          continue;
        }
        if (token.type === "whitespace") {
          // Preserve whitespace but wrap if needed.
          for (const ch of token.text) {
            if (ch === "\n") {
              codeY += lineHeight;
              currentX = codeX;
              continue;
            }
            const w = ctx.measureText(ch).width;
            if (currentX + w > maxX && currentX > codeX) {
              codeY += lineHeight;
              currentX = codeX;
            }
            ctx.fillStyle = themeColors.foreground;
            ctx.fillText(ch, currentX, codeY);
            currentX += w;
          }
          continue;
        }
        switch (token.type) {
          case "keyword":
            ctx.fillStyle = themeColors.keyword;
            break;
          case "string":
            ctx.fillStyle = themeColors.string;
            break;
          case "number":
            ctx.fillStyle = themeColors.number;
            break;
          case "comment":
            ctx.fillStyle = themeColors.comment;
            break;
          case "function":
            ctx.fillStyle = themeColors.function;
            break;
          case "builtin":
            ctx.fillStyle = themeColors.builtin;
            break;
          default:
            ctx.fillStyle = themeColors.foreground;
        }
        // Draw with wrapping at window bounds (approx CodeVideo pre-wrap/word-break)
        for (const ch of token.text) {
          if (ch === "\n") {
            codeY += lineHeight;
            currentX = codeX;
            continue;
          }
          const w = ctx.measureText(ch).width;
          if (currentX + w > maxX && currentX > codeX) {
            codeY += lineHeight;
            currentX = codeX;
          }
          ctx.fillText(ch, currentX, codeY);
          currentX += w;
        }
      }

      // Cursor
      if (visibleChars < code.length) {
        ctx.fillStyle = themeColors.foreground;
        ctx.fillRect(
          currentX + 2,
          codeY - fontSize + 4,
          3,
          fontSize * 1.2
        );
      }
    },
    [
      code,
      language,
      theme,
      background,
      customBackgroundColor,
      fontSize,
      padding,
      showWindowChrome,
      filename,
      themeColors,
      bgColors,
      fillBackground,
      fontFamily,
    ]
  );

  // ── handleExport: renders all frames → FFmpeg → MP4 download ──────────────

  const getTiming = useCallback(() => {
    const safeTypingSpeed = Math.max(1, typingSpeed || 25);
    const safeHoldTime = Math.max(0, holdTime ?? 2);
    const safeCodeLength = Math.max(1, code?.length || 1);
    const charsPerFrame = safeTypingSpeed / fps;
    const typingFrames = Math.max(
      1,
      Math.ceil(safeCodeLength / Math.max(0.0001, charsPerFrame))
    );
    const holdFrames = Math.max(0, Math.ceil(fps * safeHoldTime));
    const totalFrames = Math.max(30, typingFrames + holdFrames);
    const totalDuration = totalFrames / fps;
    return { charsPerFrame, totalFrames, totalDuration };
  }, [code?.length, fps, holdTime, typingSpeed]);

  const describeError = useCallback((error: unknown) => {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing FFmpeg…");
    setExportError("");
    setUsedCodec("");

    try {
      const width = 1080;
      const height = 1920;

      // Off-screen canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      // Load FFmpeg
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress: p }) => {
        if (p !== undefined) setExportProgress(0.7 + p * 0.25);
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      // Calculate frame counts
      const { charsPerFrame, totalFrames, totalDuration } = getTiming();

      // Render frames
      setExportStatus("Rendering frames…");
      for (let frame = 0; frame < totalFrames; frame++) {
        const visibleChars = Math.min(
          code.length,
          Math.floor(frame * charsPerFrame)
        );

        renderFrame(ctx, visibleChars, width, height);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b
                ? resolve(b)
                : reject(new Error("Failed to capture frame")),
            "image/png"
          );
        });

        await ffmpeg.writeFile(
          `f${frame.toString().padStart(5, "0")}.png`,
          await fetchFile(blob)
        );

        const pct = (frame + 1) / totalFrames;
        setExportProgress(pct * 0.65);
        if (frame % 30 === 0) {
          setExportStatus(
            `Rendering… ${Math.round(pct * 100)}%`
          );
        }
      }

      // Build FFmpeg args
      const args: string[] = [
        "-framerate",
        fps.toString(),
        "-i",
        "f%05d.png",
      ];

      // Music
      if (musicEnabled) {
        setExportStatus("Adding music…");
        try {
          const musicRes = await fetch("/background-music.mp3");
          if (musicRes.ok) {
            const musicBlob = await musicRes.blob();
            await ffmpeg.writeFile(
              "audio.mp3",
              await fetchFile(musicBlob)
            );

            args.push("-i", "audio.mp3", "-t", totalDuration.toString());

            if (musicFadeOut > 0) {
              const fadeStart = Math.max(0, totalDuration - musicFadeOut);
              args.push(
                "-filter_complex",
                `[1:a]afade=t=out:st=${fadeStart}:d=${musicFadeOut}[a]`,
                "-map",
                "0:v",
                "-map",
                "[a]"
              );
            } else {
              args.push("-map", "0:v", "-map", "1:a");
            }
          }
        } catch (e) {
          console.error("Music fetch failed:", e);
        }
      }

      const buildVideoArgs = (codec: "libx264" | "mpeg4") => {
        const outputArgs = [...args];
        if (codec === "libx264") {
          outputArgs.push(
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-movflags",
            "+faststart",
            "output.mp4"
          );
          return outputArgs;
        }
        outputArgs.push(
          "-c:v",
          "mpeg4",
          "-q:v",
          "2",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "output.mp4"
        );
        return outputArgs;
      };

      // Encode with codec fallback for browsers where libx264 is unavailable
      setExportStatus("Encoding MP4…");
      try {
        await ffmpeg.exec(buildVideoArgs("libx264"));
        setUsedCodec("libx264");
      } catch (primaryEncodeError) {
        console.warn("libx264 encoding failed, retrying with mpeg4", primaryEncodeError);
        setExportStatus("Encoding MP4 (fallback codec)…");
        await ffmpeg.exec(buildVideoArgs("mpeg4"));
        setUsedCodec("mpeg4 (fallback)");
      }

      // Download
      const data = await ffmpeg.readFile("output.mp4");
      const finalBlob = new Blob([data as Uint8Array], {
        type: "video/mp4",
      });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${
        filename.replace(/\.[^/.]+$/, "") || "code_video"
      }.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(1);
      setExportStatus("Done! MP4 downloaded 🎉");
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(describeError(error));
      setExportStatus(
        `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
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
    fps,
    filename,
    renderFrame,
    musicEnabled,
    musicFadeOut,
    getTiming,
    describeError,
  ]);

  const handleWebmFallback = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError("");
    setUsedCodec("");
    setExportStatus("Preparing WebM fallback…");

    let audioEl: HTMLAudioElement | null = null;
    let audioCtx: AudioContext | null = null;
    let audioGain: GainNode | null = null;
    try {
      const width = 1080;
      const height = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      const mimeCandidates = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mimeType = mimeCandidates.find((m) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
      );
      if (!mimeType) {
        throw new Error("This browser does not support MediaRecorder WebM");
      }

      const stream = canvas.captureStream(fps);
      let audioDestination: MediaStreamAudioDestinationNode | null = null;

      const mixedStream = new MediaStream();
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("No video track available from canvas stream");
      }
      mixedStream.addTrack(videoTrack);

      // Optional audio mix for WebM fallback
      if (musicEnabled) {
        try {
          audioEl = new Audio("/background-music.mp3");
          audioEl.crossOrigin = "anonymous";
          audioEl.preload = "auto";
          audioEl.loop = false;

          await new Promise<void>((resolve, reject) => {
            const onReady = () => {
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error("Could not load background-music.mp3"));
            };
            const cleanup = () => {
              audioEl?.removeEventListener("canplaythrough", onReady);
              audioEl?.removeEventListener("error", onError);
            };
            audioEl?.addEventListener("canplaythrough", onReady, { once: true });
            audioEl?.addEventListener("error", onError, { once: true });
          });

          audioCtx = new AudioContext();
          await audioCtx.resume();
          const source = audioCtx.createMediaElementSource(audioEl);
          audioGain = audioCtx.createGain();
          audioGain.gain.value = 0.3;
          audioDestination = audioCtx.createMediaStreamDestination();
          source.connect(audioGain);
          audioGain.connect(audioDestination);
          const audioTrack = audioDestination.stream.getAudioTracks()[0];
          if (audioTrack) {
            mixedStream.addTrack(audioTrack);
          }
        } catch (audioErr) {
          console.warn("WebM fallback audio unavailable, exporting without music", audioErr);
          setExportStatus("Recording WebM fallback (without music)…");
        }
      }

      const recorder = new MediaRecorder(mixedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const { charsPerFrame, totalFrames, totalDuration } = getTiming();
      let frame = 0;

      const done = new Promise<void>((resolve, reject) => {
        recorder.onerror = (ev) => {
          const msg = (ev as unknown as { error?: Error }).error?.message;
          reject(new Error(msg || "WebM recording failed"));
        };
        recorder.onstop = () => resolve();
      });

      recorder.start(250);
      setExportStatus("Recording WebM fallback…");
      if (audioEl) {
        try {
          audioEl.currentTime = 0;
          await audioEl.play();
        } catch (playError) {
          console.warn("Background music play failed during WebM fallback", playError);
        }
      }

      await new Promise<void>((resolve) => {
        const interval = Math.max(1, Math.round(1000 / fps));
        const timer = window.setInterval(() => {
          if (frame >= totalFrames) {
            window.clearInterval(timer);
            recorder.stop();
            resolve();
            return;
          }
          if (audioGain && musicFadeOut > 0) {
            const elapsedSeconds = frame / fps;
            const fadeStart = Math.max(0, totalDuration - musicFadeOut);
            if (elapsedSeconds >= fadeStart) {
              const fadeProgress = Math.min(
                1,
                (elapsedSeconds - fadeStart) / Math.max(0.001, musicFadeOut)
              );
              audioGain.gain.value = Math.max(0, 0.3 * (1 - fadeProgress));
            }
          }
          const visibleChars = Math.min(code.length, Math.floor(frame * charsPerFrame));
          renderFrame(ctx, visibleChars, width, height);
          frame += 1;
          setExportProgress(frame / totalFrames);
        }, interval);
      });

      await done;
      const blob = new Blob(chunks, { type: mimeType });
      setLastWebmBlob(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setUsedCodec("webm mediarecorder fallback");
      setExportProgress(1);
      setExportStatus("WebM fallback downloaded");
    } catch (error) {
      setExportError(describeError(error));
      setExportStatus(
        `Fallback failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.src = "";
        } catch {
          // no-op
        }
      }
      if (audioCtx) {
        void audioCtx.close().catch(() => {});
      }
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus("");
        setExportProgress(0);
      }, 3000);
    }
  }, [
    code.length,
    describeError,
    filename,
    fps,
    getTiming,
    isExporting,
    musicEnabled,
    musicFadeOut,
    renderFrame,
  ]);

  const handleConvertLastWebmToMp4 = useCallback(async () => {
    if (isExporting || !lastWebmBlob) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError("");
    setUsedCodec("");
    setExportStatus("Preparing WebM -> MP4 conversion…");
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress: p }) => {
        if (p !== undefined) setExportProgress(p);
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });

      await ffmpeg.writeFile("input.webm", await fetchFile(lastWebmBlob));
      setExportStatus("Converting to MP4…");
      try {
        await ffmpeg.exec([
          "-i",
          "input.webm",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          "fast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          "converted.mp4",
        ]);
        setUsedCodec("webm->mp4 libx264+aac");
      } catch (primaryError) {
        console.warn(
          "WebM->MP4 conversion with libx264 failed, retrying with mpeg4",
          primaryError
        );
        await ffmpeg.exec([
          "-i",
          "input.webm",
          "-c:v",
          "mpeg4",
          "-q:v",
          "2",
          "-c:a",
          "aac",
          "-b:a",
          "160k",
          "-movflags",
          "+faststart",
          "converted.mp4",
        ]);
        setUsedCodec("webm->mp4 mpeg4+aac fallback");
      }

      const data = await ffmpeg.readFile("converted.mp4");
      const finalBlob = new Blob([data as Uint8Array], { type: "video/mp4" });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${
        filename.replace(/\.[^/.]+$/, "") || "code_video"
      }-from-webm.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(1);
      setExportStatus("Converted MP4 downloaded 🎉");
    } catch (error) {
      setExportError(describeError(error));
      setExportStatus(
        `Conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus("");
        setExportProgress(0);
      }, 3000);
    }
  }, [describeError, filename, isExporting, lastWebmBlob]);

  return (
    <div className="flex flex-col gap-3">
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
      <Button
        onClick={handleWebmFallback}
        disabled={isExporting}
        variant="outline"
        className="w-full gap-2"
      >
        Download WebM Fallback
      </Button>
      <Button
        onClick={handleConvertLastWebmToMp4}
        disabled={isExporting || !lastWebmBlob}
        variant="outline"
        className="w-full gap-2"
      >
        Convert last WebM to MP4
      </Button>
      {exportStatus && (
        <p className="text-center text-xs text-muted-foreground">
          {exportStatus}
        </p>
      )}
      {usedCodec && (
        <p className="text-center text-xs text-muted-foreground">
          Encoder used: {usedCodec}
        </p>
      )}
      {exportError && (
        <details className="rounded-md border border-border p-2 text-xs">
          <summary className="cursor-pointer font-medium">
            Export error details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-destructive">
            {exportError}
          </pre>
        </details>
      )}
    </div>
  );
}
