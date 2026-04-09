"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { backgroundGradients, syntaxThemes, type BackgroundGradient, type SyntaxTheme } from "@/lib/themes";
import { AnimationState } from "@/lib/animations";
import hljs from "highlight.js";

// Canvas dimensions (9:16 vertical)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

interface CodePreviewProps {
  code: string;
  language: string;
  background: BackgroundGradient;
  syntaxTheme: SyntaxTheme;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  filename: string;
  animationState?: Partial<AnimationState>;
}

export interface CodePreviewHandle {
  getCanvas: () => HTMLCanvasElement | null;
  render: () => void;
}

interface ParsedToken {
  text: string;
  color: string;
}

function parseHighlightedCode(code: string, language: string, theme: SyntaxTheme): ParsedToken[] {
  const themeColors = syntaxThemes[theme];
  const tokens: ParsedToken[] = [];

  try {
    const result = hljs.highlight(code, { language, ignoreIllegals: true });
    const html = result.value;

    // Parse HTML and extract tokens with colors
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    function processNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text) {
          tokens.push({ text, color: themeColors.foreground });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const className = element.className;

        // Map highlight.js classes to theme colors
        let color = themeColors.foreground;
        if (className.includes("keyword")) color = themeColors.keyword;
        else if (className.includes("string")) color = themeColors.string;
        else if (className.includes("number")) color = themeColors.number;
        else if (className.includes("comment")) color = themeColors.comment;
        else if (className.includes("function")) color = themeColors.function;
        else if (className.includes("title")) color = themeColors.function;
        else if (className.includes("variable")) color = themeColors.variable;
        else if (className.includes("type")) color = themeColors.type;
        else if (className.includes("built_in")) color = themeColors.type;
        else if (className.includes("operator")) color = themeColors.operator;
        else if (className.includes("punctuation")) color = themeColors.operator;
        else if (className.includes("attr")) color = themeColors.variable;
        else if (className.includes("params")) color = themeColors.variable;

        // Process children
        element.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent || "";
            if (text) {
              tokens.push({ text, color });
            }
          } else {
            processNode(child);
          }
        });
      }
    }

    tempDiv.childNodes.forEach(processNode);
  } catch {
    // Fallback: plain text
    tokens.push({ text: code, color: themeColors.foreground });
  }

  return tokens;
}

export const CodePreview = forwardRef<CodePreviewHandle, CodePreviewProps>(
  function CodePreview(
    {
      code,
      language,
      background,
      syntaxTheme,
      fontSize,
      padding,
      showWindowChrome,
      filename,
      animationState,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const theme = syntaxThemes[syntaxTheme];
      const bgGradient = backgroundGradients[background];
      const typingIndex = animationState?.typingIndex ?? code.length;
      const showCursor = animationState?.showCursor ?? false;
      const zoomLevel = animationState?.zoomLevel ?? 1;
      const highlightedLines = animationState?.highlightedLines ?? new Set<number>();

      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const gradientMatch = bgGradient.gradient.match(/rgb[a]?\([^)]+\)|#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/g);
      if (gradientMatch) {
        gradientMatch.forEach((color, i) => {
          gradient.addColorStop(i / (gradientMatch.length - 1), color);
        });
      } else {
        gradient.addColorStop(0, "#1e293b");
        gradient.addColorStop(1, "#0f172a");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Calculate code box dimensions
      const boxPadding = padding;
      const boxWidth = CANVAS_WIDTH - boxPadding * 2;
      const chromeHeight = showWindowChrome ? 60 : 0;
      const codePadding = 40;
      const lineHeight = fontSize * 1.6;

      // Calculate box height based on code lines
      const lines = code.split("\n");
      const codeHeight = lines.length * lineHeight + codePadding * 2;
      const boxHeight = Math.min(chromeHeight + codeHeight, CANVAS_HEIGHT - boxPadding * 2);

      // Center the box vertically
      const boxX = boxPadding;
      const boxY = (CANVAS_HEIGHT - boxHeight) / 2;

      // Apply zoom transform
      if (zoomLevel !== 1) {
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-centerX, -centerY);
      }

      // Draw code box background
      ctx.fillStyle = theme.background;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
      ctx.fill();

      // Draw window chrome
      if (showWindowChrome) {
        const dotY = boxY + 30;
        const dotStartX = boxX + 30;
        const dotRadius = 8;
        const dotGap = 24;

        // Red dot
        ctx.fillStyle = "#ff5f57";
        ctx.beginPath();
        ctx.arc(dotStartX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Yellow dot
        ctx.fillStyle = "#ffbd2e";
        ctx.beginPath();
        ctx.arc(dotStartX + dotGap, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Green dot
        ctx.fillStyle = "#28c840";
        ctx.beginPath();
        ctx.arc(dotStartX + dotGap * 2, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Filename
        if (filename) {
          ctx.font = `${fontSize * 0.8}px "Geist Mono", monospace`;
          ctx.fillStyle = theme.comment;
          ctx.textAlign = "center";
          ctx.fillText(filename, boxX + boxWidth / 2, dotY + 5);
          ctx.textAlign = "left";
        }
      }

      // Draw highlighted lines
      if (highlightedLines.size > 0) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
        highlightedLines.forEach((lineNum) => {
          const lineY = boxY + chromeHeight + codePadding + (lineNum - 1) * lineHeight - lineHeight * 0.2;
          ctx.fillRect(boxX, lineY, boxWidth, lineHeight);
        });
      }

      // Draw code with syntax highlighting
      ctx.font = `${fontSize}px "Geist Mono", monospace`;
      ctx.textBaseline = "top";

      const tokens = parseHighlightedCode(code, language, syntaxTheme);
      let charIndex = 0;
      let x = boxX + codePadding;
      let y = boxY + chromeHeight + codePadding;
      let cursorX = x;
      let cursorY = y;

      for (const token of tokens) {
        for (const char of token.text) {
          if (charIndex >= typingIndex) break;

          if (char === "\n") {
            x = boxX + codePadding;
            y += lineHeight;
          } else {
            ctx.fillStyle = token.color;
            ctx.fillText(char, x, y);
            x += ctx.measureText(char).width;
          }

          cursorX = x;
          cursorY = y;
          charIndex++;
        }
        if (charIndex >= typingIndex) break;
      }

      // Draw cursor
      if (showCursor && typingIndex < code.length) {
        ctx.fillStyle = theme.foreground;
        ctx.fillRect(cursorX, cursorY, 3, fontSize);
      }

      // Reset transform
      if (zoomLevel !== 1) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }, [code, language, background, syntaxTheme, fontSize, padding, showWindowChrome, filename, animationState]);

    // Expose canvas and render function to parent
    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      render,
    }));

    // Render on changes
    useEffect(() => {
      render();
    }, [render]);

    // Render on animation state changes
    useEffect(() => {
      render();
    }, [animationState, render]);

    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full object-contain"
          style={{ aspectRatio: "9/16" }}
        />
      </div>
    );
  }
);
