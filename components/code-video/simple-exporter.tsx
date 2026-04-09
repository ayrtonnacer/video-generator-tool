"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download, FileVideo } from "lucide-react";
import hljs from "highlight.js";
import { codeThemes, backgroundGradients, type CodeTheme, type BackgroundGradient } from "./typing-preview";

interface SimpleExporterProps {
  code: string;
  language: string;
  theme: CodeTheme;
  background: BackgroundGradient;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  typingSpeed: number;
  filename: string;
}

export function SimpleExporter({
  code,
  language,
  theme,
  background,
  fontSize,
  padding,
  showWindowChrome,
  typingSpeed,
  filename,
}: SimpleExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const themeColors = codeThemes[theme];
  
  // Parse gradient
  const parseGradient = useCallback((gradientStr: string) => {
    const match = gradientStr.match(/linear-gradient\((\d+)deg,\s*([^,]+)\s+\d+%,\s*([^)]+)\s+\d+%\)/);
    if (match) {
      return {
        angle: parseInt(match[1]),
        color1: match[2].trim(),
        color2: match[3].trim(),
      };
    }
    return { angle: 135, color1: "#667eea", color2: "#764ba2" };
  }, []);
  
  // Render a frame to canvas
  const renderFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    visibleChars: number,
    showCursor: boolean
  ) => {
    const visibleCode = code.slice(0, visibleChars);
    const gradientInfo = parseGradient(backgroundGradients[background]);
    
    // Clear and draw background gradient
    const angleRad = (gradientInfo.angle - 90) * Math.PI / 180;
    const x1 = width / 2 - Math.cos(angleRad) * width;
    const y1 = height / 2 - Math.sin(angleRad) * height;
    const x2 = width / 2 + Math.cos(angleRad) * width;
    const y2 = height / 2 + Math.sin(angleRad) * height;
    
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, gradientInfo.color1);
    gradient.addColorStop(1, gradientInfo.color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate code window dimensions
    const windowPadding = 60;
    const windowWidth = width - windowPadding * 2;
    const chromeHeight = showWindowChrome ? 50 : 0;
    
    // Draw code window background with rounded corners
    const windowX = windowPadding;
    const windowY = height * 0.15;
    const cornerRadius = 20;
    
    ctx.fillStyle = themeColors.background;
    ctx.beginPath();
    ctx.roundRect(windowX, windowY, windowWidth, height * 0.7, cornerRadius);
    ctx.fill();
    
    // Draw shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;
    ctx.fill();
    ctx.shadowColor = "transparent";
    
    // Draw window chrome
    if (showWindowChrome) {
      const dotY = windowY + 25;
      const dotX = windowX + 25;
      const dotRadius = 7;
      const dotGap = 22;
      
      // Red dot
      ctx.fillStyle = "#ff5f57";
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Yellow dot
      ctx.fillStyle = "#febc2e";
      ctx.beginPath();
      ctx.arc(dotX + dotGap, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Green dot
      ctx.fillStyle = "#28c840";
      ctx.beginPath();
      ctx.arc(dotX + dotGap * 2, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Filename
      ctx.fillStyle = themeColors.comment;
      ctx.font = `14px "SF Mono", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(filename, windowX + windowWidth / 2, dotY + 5);
    }
    
    // Draw code
    const codeX = windowX + padding;
    const codeY = windowY + chromeHeight + padding;
    const lineHeight = fontSize * 1.6;
    const maxWidth = windowWidth - padding * 2;
    
    ctx.font = `${fontSize}px "JetBrains Mono", "SF Mono", Consolas, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    // Highlight and draw code
    let highlighted: string;
    try {
      highlighted = hljs.highlight(visibleCode, { language }).value;
    } catch {
      highlighted = visibleCode;
    }
    
    // Parse highlighted HTML and draw
    const lines = visibleCode.split("\n");
    let highlightedLines: string[];
    try {
      highlightedLines = hljs.highlight(visibleCode, { language }).value.split("\n");
    } catch {
      highlightedLines = lines;
    }
    
    let cursorX = codeX;
    let cursorY = codeY;
    
    lines.forEach((line, lineIndex) => {
      // Simple token-based coloring
      let x = codeX;
      const y = codeY + lineIndex * lineHeight;
      
      // Parse the line for basic syntax coloring
      const tokens = tokenizeLine(line, language, themeColors);
      
      tokens.forEach(token => {
        ctx.fillStyle = token.color;
        ctx.fillText(token.text, x, y);
        x += ctx.measureText(token.text).width;
      });
      
      // Track cursor position
      if (lineIndex === lines.length - 1) {
        cursorX = x;
        cursorY = y;
      }
    });
    
    // Draw cursor
    if (showCursor) {
      ctx.fillStyle = themeColors.foreground;
      ctx.fillRect(cursorX + 2, cursorY, 3, fontSize * 1.2);
    }
  }, [code, language, theme, background, fontSize, padding, showWindowChrome, filename, parseGradient, themeColors]);
  
  // Export video
  const exportVideo = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setProgress(0);
    
    try {
      const width = 1080;
      const height = 1920;
      const fps = 30;
      
      // Calculate timing
      const startDelay = 500;
      const typingDuration = (code.length / typingSpeed) * 1000;
      const endPause = 1000;
      const totalDuration = startDelay + typingDuration + endPause;
      const totalFrames = Math.ceil((totalDuration / 1000) * fps);
      
      // Create offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      
      // Set up MediaRecorder
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000,
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
      
      mediaRecorder.start();
      
      // Render frames
      for (let frame = 0; frame < totalFrames; frame++) {
        const elapsed = (frame / fps) * 1000;
        
        // Calculate visible characters
        let visibleChars = 0;
        if (elapsed < startDelay) {
          visibleChars = 0;
        } else if (elapsed < startDelay + typingDuration) {
          const typingElapsed = elapsed - startDelay;
          visibleChars = Math.floor((typingElapsed / typingDuration) * code.length);
        } else {
          visibleChars = code.length;
        }
        
        // Cursor blinks every 530ms when typing is done
        const showCursor = visibleChars < code.length || Math.floor(elapsed / 530) % 2 === 0;
        
        // Render frame
        renderFrame(ctx, width, height, visibleChars, showCursor);
        
        // Wait for next frame
        await new Promise(r => setTimeout(r, 1000 / fps));
        
        setProgress((frame + 1) / totalFrames);
      }
      
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
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [code, typingSpeed, filename, renderFrame]);
  
  // Download screenshot
  const downloadScreenshot = useCallback(async () => {
    try {
      const width = 1080;
      const height = 1920;
      
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      
      // Render with all code visible
      renderFrame(ctx, width, height, code.length, true);
      
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
  }, [code, filename, renderFrame]);
  
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
              Rendering... {Math.round(progress * 100)}%
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
      
      {isExporting && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="text-center">Export at 1080x1920 (9:16) vertical format</p>
        <p className="text-center">Perfect for TikTok, Instagram Reels & YouTube Shorts</p>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Simple tokenizer for syntax highlighting
function tokenizeLine(
  line: string,
  language: string,
  theme: typeof codeThemes[keyof typeof codeThemes]
): Array<{ text: string; color: string }> {
  const tokens: Array<{ text: string; color: string }> = [];
  
  // Keywords by language
  const keywords: Record<string, string[]> = {
    javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "true", "false", "null", "undefined"],
    typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "true", "false", "null", "undefined", "interface", "type", "enum"],
    python: ["def", "return", "if", "else", "elif", "for", "while", "class", "import", "from", "as", "True", "False", "None", "and", "or", "not", "in", "is", "lambda", "try", "except", "with"],
    java: ["public", "private", "protected", "class", "interface", "extends", "implements", "return", "if", "else", "for", "while", "new", "this", "static", "final", "void", "int", "String", "boolean", "true", "false", "null"],
    go: ["func", "return", "if", "else", "for", "range", "package", "import", "var", "const", "type", "struct", "interface", "nil", "true", "false", "make", "new"],
    rust: ["fn", "let", "mut", "return", "if", "else", "for", "while", "loop", "struct", "enum", "impl", "trait", "use", "pub", "mod", "self", "Self", "true", "false", "None", "Some"],
  };
  
  const langKeywords = keywords[language] || keywords.javascript;
  
  // Simple regex-based tokenizer
  let remaining = line;
  let pos = 0;
  
  while (remaining.length > 0) {
    // Check for string
    const stringMatch = remaining.match(/^(["'`])(?:[^\\]|\\.)*?\1/);
    if (stringMatch) {
      tokens.push({ text: stringMatch[0], color: theme.string });
      remaining = remaining.slice(stringMatch[0].length);
      continue;
    }
    
    // Check for comment
    const commentMatch = remaining.match(/^\/\/.*/);
    if (commentMatch) {
      tokens.push({ text: commentMatch[0], color: theme.comment });
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }
    
    // Check for number
    const numberMatch = remaining.match(/^\d+\.?\d*/);
    if (numberMatch) {
      tokens.push({ text: numberMatch[0], color: theme.number });
      remaining = remaining.slice(numberMatch[0].length);
      continue;
    }
    
    // Check for keyword or identifier
    const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const isKeyword = langKeywords.includes(word);
      tokens.push({ 
        text: word, 
        color: isKeyword ? theme.keyword : theme.foreground 
      });
      remaining = remaining.slice(word.length);
      continue;
    }
    
    // Check for operator/punctuation
    const opMatch = remaining.match(/^[+\-*/%=<>!&|^~?:;,.()\[\]{}]/);
    if (opMatch) {
      tokens.push({ text: opMatch[0], color: theme.operator });
      remaining = remaining.slice(opMatch[0].length);
      continue;
    }
    
    // Whitespace or unknown
    tokens.push({ text: remaining[0], color: theme.foreground });
    remaining = remaining.slice(1);
  }
  
  return tokens;
}
