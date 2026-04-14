"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Audio } from "remotion";
import React, { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";

// Register only Python
hljs.registerLanguage("python", python);

// Python-optimized dark terminal theme (VSCode-like colors)
const codeThemes = {
  "terminal-dark": {
    name: "Terminal Dark",
    background: "#0d1117",
    foreground: "#e6edf3",
    comment: "#8b949e",
    keyword: "#ff7b72",      // Python keywords: def, if, for, return, etc.
    string: "#a5d6ff",       // Strings
    number: "#79c0ff",       // Numbers
    function: "#d2a8ff",     // Function names
    builtin: "#ffa657",      // Built-in functions: print, len, range
    operator: "#ff7b72",     // Operators
    variable: "#e6edf3",     // Variables
    decorator: "#79c0ff",    // @decorators
    class: "#7ee787",        // Class names
  },
  "python-dark": {
    name: "Python Dark",
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    comment: "#6a9955",
    keyword: "#569cd6",
    string: "#ce9178",
    number: "#b5cea8",
    function: "#dcdcaa",
    builtin: "#4ec9b0",
    operator: "#d4d4d4",
    variable: "#9cdcfe",
    decorator: "#dcdcaa",
    class: "#4ec9b0",
  },
  "monokai": {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    comment: "#75715e",
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    function: "#a6e22e",
    builtin: "#66d9ef",
    operator: "#f92672",
    variable: "#f8f8f2",
    decorator: "#a6e22e",
    class: "#66d9ef",
  },
} as const;

// Scale.com inspired backgrounds with gradients and patterns
const backgroundStyles = {
  "scale-dark": {
    name: "Scale Dark",
    background: "#09090b",
    gradient: "radial-gradient(ellipse at top, #18181b 0%, #09090b 50%)",
    pattern: "dots",
  },
  "scale-purple": {
    name: "Scale Purple",
    background: "#0c0a1d",
    gradient: "radial-gradient(ellipse at top right, #2e1065 0%, #0c0a1d 60%)",
    pattern: "grid",
  },
  "scale-blue": {
    name: "Scale Blue", 
    background: "#020617",
    gradient: "radial-gradient(ellipse at bottom left, #0c4a6e 0%, #020617 60%)",
    pattern: "dots",
  },
  "midnight": {
    name: "Midnight",
    background: "#000000",
    gradient: "linear-gradient(180deg, #111827 0%, #000000 100%)",
    pattern: "none",
  },
  "aurora": {
    name: "Aurora",
    background: "#0f0f23",
    gradient: "linear-gradient(135deg, #1a1a3e 0%, #0f0f23 50%, #1e3a5f 100%)",
    pattern: "grid",
  },
  "custom": {
    name: "Custom Color",
    background: "#000000",
    gradient: "none",
    pattern: "none",
  },
} as const;

export type CodeThemeName = keyof typeof codeThemes;
export type BackgroundName = keyof typeof backgroundStyles;

export const themeOptions = Object.keys(codeThemes) as CodeThemeName[];
export const backgroundOptions = Object.keys(backgroundStyles) as BackgroundName[];
export const themeNames = codeThemes;
export const backgroundNames = backgroundStyles;
interface CodeVideoProps {
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
  musicEnabled: boolean;
  musicFadeOut: number; // seconds for fade out
  durationInFrames: number;
}

export const CodeVideo: React.FC<CodeVideoProps> = ({
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
  musicEnabled,
  musicFadeOut,
  durationInFrames: totalDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const compositionWidth = 1080;
  
  const themeColors = codeThemes[theme];
  const bgStyle = backgroundStyles[background];
  
  // Calculate visible characters based on frame
  const charsPerFrame = typingSpeed / fps;
  const visibleChars = Math.floor(frame * charsPerFrame);
  const visibleCode = code.slice(0, visibleChars);
  const lineHeight = fontSize * 1.6;
  
  // Highlight the visible code (Python-specific)
  const highlightedCode = useMemo(() => {
    if (!visibleCode) return "";
    try {
      if (language === "plaintext") {
        return visibleCode;
      }
      const result = hljs.highlight(visibleCode, { language: "python" });
      return result.value;
    } catch {
      return visibleCode;
    }
  }, [visibleCode, language]);
  
  // Cursor blink animation
  const cursorOpacity = interpolate(
    frame % (fps / 2),
    [0, fps / 4, fps / 2],
    [1, 1, 0],
    { extrapolateRight: "clamp" }
  );
  
  // Show cursor only while typing
  const isTyping = visibleChars < code.length;
  const showCursor = isTyping || cursorOpacity > 0.5;

  // Keep preview and export in sync: terminal starts compact and grows with typed content.
  const outerPadding = 40;
  const maxWindowWidth = 950;
  const windowWidth = Math.min(compositionWidth - outerPadding * 2, maxWindowWidth);
  const visibleLines = Math.max(1, visibleCode.split("\n").length);
  const baseCodeAreaHeight = Math.ceil(fontSize * 2.2);
  const codeAreaHeight = Math.ceil(
    baseCodeAreaHeight + Math.max(0, visibleLines - 1) * lineHeight
  );
  
  // Background color (custom or from style)
  const actualBgColor = background === "custom" && customBackgroundColor 
    ? customBackgroundColor 
    : bgStyle.background;
  const actualGradient = background === "custom" && customBackgroundColor
    ? `linear-gradient(180deg, ${customBackgroundColor} 0%, ${customBackgroundColor} 100%)`
    : bgStyle.gradient;
  
  // Pattern overlay styles
  const patternStyle = bgStyle.pattern === "dots" ? {
    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
    backgroundSize: "24px 24px",
  } : bgStyle.pattern === "grid" ? {
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  } : {};
  
  return (
    <AbsoluteFill style={{ backgroundColor: actualBgColor }}>
      {/* Background gradient */}
      <AbsoluteFill style={{ background: actualGradient }} />
      
      {/* Pattern overlay */}
      {bgStyle.pattern !== "none" && (
        <AbsoluteFill style={patternStyle} />
      )}
      
      {/* Background music with fade out */}
      {musicEnabled && (
        <Audio 
          src="/background-music.mp3"
          volume={(f) => {
            const fadeOutFrames = musicFadeOut * fps;
            const fadeStartFrame = totalDuration - fadeOutFrames;
            
            if (fadeOutFrames <= 0 || f < fadeStartFrame) {
              return 0.3; // Normal volume
            }
            
            // Fade out
            const fadeProgress = (f - fadeStartFrame) / fadeOutFrames;
            return Math.max(0, 0.3 * (1 - fadeProgress));
          }}
        />
      )}
      
      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 950,
            backgroundColor: themeColors.background,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Window chrome */}
          {showWindowChrome && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: "rgba(0,0,0,0.3)",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#ff5f56",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#ffbd2e",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#27c93f",
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: themeColors.foreground,
                  opacity: 0.6,
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                {filename}
              </div>
            </div>
          )}
          
          {/* Code area */}
          <div
            style={{
              padding: padding,
              height: codeAreaHeight,
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
                fontSize: fontSize,
                lineHeight: 1.6,
                color: themeColors.foreground,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <code
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                style={{
                  // Python syntax color overrides
                  ...({
                    "--hljs-keyword": themeColors.keyword,
                    "--hljs-string": themeColors.string,
                    "--hljs-number": themeColors.number,
                    "--hljs-comment": themeColors.comment,
                    "--hljs-function": themeColors.function,
                    "--hljs-builtin": themeColors.builtin,
                  } as React.CSSProperties),
                }}
              />
              {showCursor && (
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: fontSize * 1.2,
                    backgroundColor: themeColors.foreground,
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                    opacity: isTyping ? 1 : cursorOpacity,
                  }}
                />
              )}
            </pre>
          </div>
        </div>
      </AbsoluteFill>
      
      {/* Highlight.js Python styles */}
      <style>
        {`
          .hljs-keyword { color: ${themeColors.keyword}; }
          .hljs-built_in { color: ${themeColors.builtin}; }
          .hljs-string { color: ${themeColors.string}; }
          .hljs-number { color: ${themeColors.number}; }
          .hljs-comment { color: ${themeColors.comment}; font-style: italic; }
          .hljs-function { color: ${themeColors.function}; }
          .hljs-title { color: ${themeColors.function}; }
          .hljs-params { color: ${themeColors.variable}; }
          .hljs-meta { color: ${themeColors.decorator}; }
          .hljs-class .hljs-title { color: ${themeColors.class}; }
          .hljs-literal { color: ${themeColors.keyword}; }
        `}
      </style>
    </AbsoluteFill>
  );
};
