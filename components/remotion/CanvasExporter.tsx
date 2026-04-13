"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("python", python);

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
  "monokai": {
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
  "scale-dark": { bg: "#09090b", gradientTop: "#18181b" },
  "scale-purple": { bg: "#0c0a1d", gradientTop: "#2e1065" },
  "scale-blue": { bg: "#020617", gradientTop: "#0c4a6e" },
  "midnight": { bg: "#000000", gradientTop: "#111827" },
  "aurora": { bg: "#0f0f23", gradientTop: "#1a1a3e" },
  "custom": { bg: "#000000", gradientTop: "#000000" },
} as const;

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

function tokenizePython(code: string): Array<{ text: string; type: string }> {
  const tokens: Array<{ text: string; type: string }> = [];
  const keywords = new Set(["def", "class", "if", "elif", "else", "for", "while", "return", "import", "from", "as", "try", "except", "finally", "with", "lambda", "yield", "raise", "pass", "break", "continue", "in", "not", "and", "or", "is", "True", "False", "None", "async", "await", "global", "nonlocal", "assert", "del"]);
  const builtins = new Set(["print", "len", "range", "str", "int", "float", "list", "dict", "set", "tuple", "open", "input", "type", "isinstance", "hasattr", "getattr", "setattr", "sum", "min", "max", "abs", "round", "sorted", "reversed", "enumerate", "zip", "map", "filter"]);
  
  let i = 0;
  while (i < code.length) {
    if (code[i] === "#") {
      let end = i;
      while (end < code.length && code[end] !== "
") end++;
      tokens.push({ text: code.slice(i, end), type: "comment" });
      i = end; continue;
    }
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      const triple = code.slice(i, i + 3) === quote.repeat(3);
      const endQuote = triple ? quote.repeat(3) : quote;
      let end = i + (triple ? 3 : 1);
      while (end < code.length) {
        if (code.slice(end, end + endQuote.length) === endQuote) {
          end += endQuote.length; break;
        }
        if (code[end] === "\\" && end + 1 < code.length) end++;
        end++;
      }
      tokens.push({ text: code.slice(i, end), type: "string" });
      i = end; continue;
    }
    if (/[0-9]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[0-9.eExXoObBa-fA-F_]/.test(code[end])) end++;
      tokens.push({ text: code.slice(i, end), type: "number" });
      i = end; continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[a-zA-Z0-9_]/.test(code[end])) end++;
      const word = code.slice(i, end);
      let type = "default";
      if (keywords.has(word)) type = "keyword";
      else if (builtins.has(word)) type = "builtin";
      else if (end < code.length && code[end] === "(") type = "function";
      tokens.push({ text: word, type });
      i = end; continue;
    }
    if (code[i] === "@") {
      let end = i + 1;
      while (end < code.length && /[a-zA-Z0-9_.]/.test(code[end])) end++;
      tokens.push({ text: code.slice(i, end), type: "function" });
      i = end; continue;
    }
    if (/\s/.test(code[i])) {
      if (code[i] === "
") { tokens.push({ text: "
", type: "newline" }); i++; }
      else {
        let end = i;
        while (end < code.length && /\s/.test(code[end]) && code[end] !== "
") end++;
        tokens.push({ text: code.slice(i, end), type: "whitespace" });
        i = end;
      }
      continue;
    }
    tokens.push({ text: code[i], type: "default" });
    i++;
  }
  return tokens;
}

export function CanvasExporter({
  code, language, theme, background, customBackgroundColor, fontSize, padding, showWindowChrome, filename, typingSpeed, holdTime, musicEnabled, musicFadeOut, fps = 30,
}: CanvasExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  
  const themeColors = canvasThemes[theme] || canvasThemes["terminal-dark"];
  const bgColors = canvasBackgrounds[background] || canvasBackgrounds["scale-dark"];

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, visibleChars: number, width: number, height: number) => {
    const actualBg = background === "custom" && customBackgroundColor ? customBackgroundColor : bgColors.bg;
    const gradientTop = background === "custom" && customBackgroundColor ? customBackgroundColor : bgColors.gradientTop;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, gradientTop);
    gradient.addColorStop(1, actualBg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let y = 0; y < height; y += 24) for (let x = 0; x < width; x += 24) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }
    const windowWidth = width - 80;
    const windowX = 40;
    const windowY = 200;
    const chromeHeight = showWindowChrome ? 44 : 0;
    ctx.fillStyle = themeColors.background;
    ctx.beginPath(); ctx.roundRect(windowX, windowY, windowWidth, height - windowY - 80, 16); ctx.fill();
    if (showWindowChrome) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath(); ctx.roundRect(windowX, windowY, windowWidth, chromeHeight, [16, 16, 0, 0]); ctx.fill();
      const dotY = windowY + chromeHeight / 2;
      ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((color, i) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(windowX + 24 + i * 20, dotY, 6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = themeColors.foreground; ctx.globalAlpha = 0.6; ctx.font = "14px monospace"; ctx.textAlign = "center";
      ctx.fillText(filename, windowX + windowWidth / 2, dotY + 4); ctx.globalAlpha = 1; ctx.textAlign = "left";
    }
    const codeX = windowX + padding;
    let codeY = windowY + chromeHeight + padding + fontSize;
    const lineHeight = fontSize * 1.6;
    ctx.font = `${fontSize}px "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace`;
    const visibleCode = code.slice(0, visibleChars);
    const tokens = language === "plaintext" ? [{ text: visibleCode, type: "default" }] : tokenizePython(visibleCode);
    let currentX = codeX;
    for (const token of tokens) {
      if (token.type === "newline") { codeY += lineHeight; currentX = codeX; continue; }
      switch (token.type) {
        case "keyword": ctx.fillStyle = themeColors.keyword; break;
        case "string": ctx.fillStyle = themeColors.string; break;
        case "number": ctx.fillStyle = themeColors.number; break;
        case "comment": ctx.fillStyle = themeColors.comment; break;
        case "function": ctx.fillStyle = themeColors.function; break;
        case "builtin": ctx.fillStyle = themeColors.builtin; break;
        default: ctx.fillStyle = themeColors.foreground;
      }
      ctx.fillText(token.text, currentX, codeY);
      currentX += ctx.measureText(token.text).width;
    }
    if (visibleChars < code.length) {
      ctx.fillStyle = themeColors.foreground; ctx.fillRect(currentX + 2, codeY - fontSize + 4, 3, fontSize * 1.2);
    }
  }, [code, language, theme, background, customBackgroundColor, fontSize, padding, showWindowChrome, filename, themeColors, bgColors]);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true); setExportProgress(0); setExportStatus("Preparing FFmpeg...");
    try {
      const width = 1080; const height = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const typingFrames = Math.ceil((code.length / typingSpeed) * fps);
      const holdFrames = Math.ceil(holdTime * fps);
      const totalFrames = typingFrames + holdFrames;
      const totalDuration = totalFrames / fps;

      setExportStatus("Rendering frames...");
      for (let frame = 0; frame < totalFrames; frame++) {
        const visibleChars = Math.min(code.length, Math.floor((frame / typingFrames) * code.length));
        renderFrame(ctx, visibleChars, width, height);
        const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
        await ffmpeg.writeFile(`f${frame.toString().padStart(5, "0")}.png`, await fetchFile(blob));
        setExportProgress((frame + 1) / totalFrames * 0.4);
        if (frame % 30 === 0) setExportStatus(`Rendering... ${Math.round(((frame + 1) / totalFrames) * 100)}%`);
      }

      const args = ["-framerate", fps.toString(), "-i", "f%05d.png"];
      if (musicEnabled) {
        setExportStatus("Adding music...");
        try {
          const musicRes = await fetch("/audio/black-eyed-peas-rock-that-body-sped-up.mp3");
          if (musicRes.ok) {
            const musicBlob = await musicRes.blob();
            await ffmpeg.writeFile("audio.mp3", await fetchFile(musicBlob));
            args.push("-i", "audio.mp3", "-t", totalDuration.toString());
            if (musicFadeOut > 0) {
              args.push("-filter_complex", `[1:a]afade=t=out:st=${Math.max(0, totalDuration - musicFadeOut)}:d=${musicFadeOut}[a]`, "-map", "0:v", "-map", "[a]");
            } else {
              args.push("-map", "0:v", "-map", "1:a");
            }
          }
        } catch (e) { console.error("Music fetch failed", e); }
      }

      args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "23", "output.mp4");
      setExportStatus("Encoding MP4...");
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile("output.mp4");
      const finalBlob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url; a.download = `${filename.replace(/\.[^/.]+$/, "") || "code_video"}.mp4`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setExportStatus("Done!");
    } catch (error) {
      setExportStatus(`Error: ${error instanceof Error ? error.message : "Unknown"}`);
    } finally {
      setTimeout(() => { setIsExporting(false); setExportStatus(""); }, 2000);
    }
  }, [code, typingSpeed, holdTime, fps, filename, renderFrame, musicEnabled, musicFadeOut, isExporting]);

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2" size="lg">
        {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> {Math.round(exportProgress * 100)}%</> : <><Download className="h-4 w-4" /> Download MP4 with Music</>}
      </Button>
      {exportStatus && <p className="text-center text-xs text-muted-foreground">{exportStatus}</p>}
    </div>
  );
}
