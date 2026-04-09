"use client";

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { useMemo } from "react";
import hljs from "highlight.js";

// Code themes with colors
const codeThemes = {
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    comment: "#6272a4",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    function: "#50fa7b",
    operator: "#ff79c6",
    variable: "#f8f8f2",
    punctuation: "#f8f8f2",
  },
  monokai: {
    background: "#272822",
    foreground: "#f8f8f2",
    comment: "#75715e",
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    function: "#a6e22e",
    operator: "#f92672",
    variable: "#f8f8f2",
    punctuation: "#f8f8f2",
  },
  github: {
    background: "#ffffff",
    foreground: "#24292e",
    comment: "#6a737d",
    keyword: "#d73a49",
    string: "#032f62",
    number: "#005cc5",
    function: "#6f42c1",
    operator: "#d73a49",
    variable: "#24292e",
    punctuation: "#24292e",
  },
  nord: {
    background: "#2e3440",
    foreground: "#d8dee9",
    comment: "#616e88",
    keyword: "#81a1c1",
    string: "#a3be8c",
    number: "#b48ead",
    function: "#88c0d0",
    operator: "#81a1c1",
    variable: "#d8dee9",
    punctuation: "#eceff4",
  },
  vitesse: {
    background: "#121212",
    foreground: "#dbd7ca",
    comment: "#758575",
    keyword: "#4d9375",
    string: "#c98a7d",
    number: "#4c9a91",
    function: "#80a665",
    operator: "#cb7676",
    variable: "#dbd7ca",
    punctuation: "#dbd7ca",
  },
} as const;

// Background gradients
const backgroundGradients = {
  sunset: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  ocean: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)",
  forest: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
  candy: "linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)",
  midnight: "linear-gradient(135deg, #232526 0%, #414345 100%)",
  fire: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  aurora: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
  lavender: "linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)",
} as const;

export type CodeThemeName = keyof typeof codeThemes;
export type BackgroundName = keyof typeof backgroundGradients;

interface CodeVideoProps {
  code: string;
  language: string;
  theme: CodeThemeName;
  background: BackgroundName;
  fontSize: number;
  padding: number;
  showWindowChrome: boolean;
  filename: string;
  typingSpeed: number; // characters per second
}

export const CodeVideo: React.FC<CodeVideoProps> = ({
  code,
  language,
  theme,
  background,
  fontSize,
  padding,
  showWindowChrome,
  filename,
  typingSpeed,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const themeColors = codeThemes[theme];
  const bgGradient = backgroundGradients[background];
  
  // Calculate visible characters based on frame
  const charsPerFrame = typingSpeed / fps;
  const visibleChars = Math.floor(frame * charsPerFrame);
  const visibleCode = code.slice(0, visibleChars);
  
  // Highlight the visible code
  const highlightedCode = useMemo(() => {
    if (!visibleCode) return "";
    try {
      const result = hljs.highlight(visibleCode, { language });
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
  
  return (
    <AbsoluteFill
      style={{
        background: bgGradient,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          backgroundColor: themeColors.background,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Window chrome */}
        {showWindowChrome && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: "rgba(0,0,0,0.2)",
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
            minHeight: 400,
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
              className={`hljs language-${language}`}
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
  );
};

// Export theme and background options for the UI
export const themeOptions = Object.keys(codeThemes) as CodeThemeName[];
export const backgroundOptions = Object.keys(backgroundGradients) as BackgroundName[];
