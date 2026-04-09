"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import hljs from "highlight.js";

// Themes
export const codeThemes = {
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    function: "#50fa7b",
    comment: "#6272a4",
    number: "#bd93f9",
    operator: "#ff79c6",
  },
  monokai: {
    background: "#272822",
    foreground: "#f8f8f2",
    keyword: "#f92672",
    string: "#e6db74",
    function: "#a6e22e",
    comment: "#75715e",
    number: "#ae81ff",
    operator: "#f92672",
  },
  github: {
    background: "#0d1117",
    foreground: "#c9d1d9",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    function: "#d2a8ff",
    comment: "#8b949e",
    number: "#79c0ff",
    operator: "#ff7b72",
  },
  nord: {
    background: "#2e3440",
    foreground: "#d8dee9",
    keyword: "#81a1c1",
    string: "#a3be8c",
    function: "#88c0d0",
    comment: "#616e88",
    number: "#b48ead",
    operator: "#81a1c1",
  },
  tokyoNight: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    keyword: "#bb9af7",
    string: "#9ece6a",
    function: "#7aa2f7",
    comment: "#565f89",
    number: "#ff9e64",
    operator: "#bb9af7",
  },
} as const;

export const backgroundGradients = {
  purple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  sunset: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  ocean: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  forest: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  midnight: "linear-gradient(135deg, #232526 0%, #414345 100%)",
  fire: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  northern: "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
  candy: "linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)",
} as const;

export type CodeTheme = keyof typeof codeThemes;
export type BackgroundGradient = keyof typeof backgroundGradients;

interface TypingPreviewProps {
  code: string;
  language: string;
  theme: CodeTheme;
  background: BackgroundGradient;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  typingSpeed: number;
  filename: string;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  onProgress: (progress: number) => void;
  onDurationChange: (duration: number) => void;
}

export function TypingPreview({
  code,
  language,
  theme,
  background,
  fontSize,
  padding,
  showWindowChrome,
  typingSpeed,
  filename,
  isPlaying,
  onPlayingChange,
  onProgress,
  onDurationChange,
}: TypingPreviewProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const themeColors = codeThemes[theme];
  const backgroundGradient = backgroundGradients[background];
  
  // Calculate duration
  const startDelay = 500; // ms
  const typingDuration = (code.length / typingSpeed) * 1000;
  const endPause = 1000; // ms
  const totalDuration = startDelay + typingDuration + endPause;
  
  useEffect(() => {
    onDurationChange(totalDuration / 1000);
  }, [totalDuration, onDurationChange]);
  
  // Cursor blink effect
  useEffect(() => {
    if (!isPlaying && visibleChars >= code.length) {
      const interval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 530);
      return () => clearInterval(interval);
    } else if (isPlaying) {
      setShowCursor(true);
    }
  }, [isPlaying, visibleChars, code.length]);
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }
    
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / totalDuration, 1);
      onProgress(progress);
      
      // Calculate visible characters
      if (elapsed < startDelay) {
        setVisibleChars(0);
      } else if (elapsed < startDelay + typingDuration) {
        const typingElapsed = elapsed - startDelay;
        const chars = Math.floor((typingElapsed / typingDuration) * code.length);
        setVisibleChars(Math.min(chars, code.length));
      } else {
        setVisibleChars(code.length);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onPlayingChange(false);
        startTimeRef.current = null;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, code.length, typingSpeed, totalDuration, startDelay, typingDuration, onProgress, onPlayingChange]);
  
  // Reset when code changes
  useEffect(() => {
    setVisibleChars(0);
    onPlayingChange(false);
    startTimeRef.current = null;
  }, [code, onPlayingChange]);
  
  // Highlight visible code
  const highlightedCode = useMemo(() => {
    const visibleCode = code.slice(0, visibleChars);
    try {
      const result = hljs.highlight(visibleCode, { language });
      return result.value;
    } catch {
      return visibleCode;
    }
  }, [visibleChars, code, language]);
  
  // Apply theme colors to highlighted spans
  const applyThemeColors = (html: string) => {
    return html
      .replace(/class="hljs-keyword"/g, `style="color: ${themeColors.keyword}"`)
      .replace(/class="hljs-built_in"/g, `style="color: ${themeColors.keyword}"`)
      .replace(/class="hljs-string"/g, `style="color: ${themeColors.string}"`)
      .replace(/class="hljs-regexp"/g, `style="color: ${themeColors.string}"`)
      .replace(/class="hljs-function"/g, `style="color: ${themeColors.function}"`)
      .replace(/class="hljs-title"/g, `style="color: ${themeColors.function}"`)
      .replace(/class="hljs-comment"/g, `style="color: ${themeColors.comment}"`)
      .replace(/class="hljs-number"/g, `style="color: ${themeColors.number}"`)
      .replace(/class="hljs-literal"/g, `style="color: ${themeColors.number}"`)
      .replace(/class="hljs-operator"/g, `style="color: ${themeColors.operator}"`)
      .replace(/class="hljs-punctuation"/g, `style="color: ${themeColors.operator}"`)
      .replace(/class="hljs-params"/g, `style="color: ${themeColors.foreground}"`)
      .replace(/class="hljs-attr"/g, `style="color: ${themeColors.foreground}"`)
      .replace(/class="hljs-[^"]*"/g, `style="color: ${themeColors.foreground}"`);
  };
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      style={{
        background: backgroundGradient,
        aspectRatio: "9/16",
      }}
    >
      <div
        className="w-[90%] max-w-[900px] rounded-2xl overflow-hidden"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Window chrome */}
        {showWindowChrome && (
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              background: themeColors.background,
              borderBottom: `1px solid ${themeColors.comment}33`,
            }}
          >
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div
              className="flex-1 text-center text-xs font-mono"
              style={{ color: themeColors.comment }}
            >
              {filename}
            </div>
          </div>
        )}
        
        {/* Code area */}
        <div
          style={{
            background: themeColors.background,
            padding,
            minHeight: 300,
          }}
        >
          <pre
            className="m-0 whitespace-pre-wrap break-words"
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
              fontSize,
              lineHeight: 1.6,
              color: themeColors.foreground,
            }}
          >
            <code
              dangerouslySetInnerHTML={{
                __html: applyThemeColors(highlightedCode),
              }}
            />
            {/* Cursor */}
            <span
              className="inline-block ml-0.5 align-text-bottom"
              style={{
                width: 3,
                height: fontSize * 1.2,
                backgroundColor: showCursor ? themeColors.foreground : "transparent",
                transition: "background-color 0.1s",
              }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}

export default TypingPreview;
