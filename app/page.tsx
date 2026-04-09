"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CodeEditor } from "@/components/code-editor/code-editor";
import { CodePreview, CodePreviewHandle } from "@/components/code-editor/code-preview";
import { AnimationTimeline } from "@/components/code-editor/animation-timeline";
import { VideoExporter } from "@/components/video/video-exporter";
import { useAnimation } from "@/hooks/use-animation";
import {
  defaultCodeSnippets,
  type BackgroundGradient,
  type SyntaxTheme,
  type Language,
} from "@/lib/themes";
import { AnimationConfig, defaultAnimationConfig, AnimationState } from "@/lib/animations";
import { Film, Code2 } from "lucide-react";

export default function Home() {
  // Code state
  const [code, setCode] = useState(defaultCodeSnippets.typescript);
  const [language, setLanguage] = useState<Language>("typescript");
  const [filename, setFilename] = useState("main.ts");

  // Style state
  const [background, setBackground] = useState<BackgroundGradient>("ocean");
  const [syntaxTheme, setSyntaxTheme] = useState<SyntaxTheme>("atom-one-dark");
  const [fontSize, setFontSize] = useState(20);
  const [padding, setPadding] = useState(64);
  const [showWindowChrome, setShowWindowChrome] = useState(true);

  // Animation state
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(defaultAnimationConfig);
  const [currentAnimationState, setCurrentAnimationState] = useState<Partial<AnimationState>>({
    typingIndex: 0,
    showCursor: true,
    zoomLevel: 1,
    highlightedLines: new Set(),
  });

  // Refs
  const previewRef = useRef<CodePreviewHandle | null>(null);

  // Animation hook
  const {
    state: animState,
    isPlaying,
    totalDuration,
    play,
    pause,
    reset,
    seek,
  } = useAnimation({
    code,
    config: animationConfig,
    onFrame: useCallback((state: AnimationState) => {
      setCurrentAnimationState(state);
    }, []),
  });

  // Update animation state when animation hook state changes
  useEffect(() => {
    setCurrentAnimationState(animState);
  }, [animState]);

  // Update filename extension when language changes
  useEffect(() => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      rust: "rs",
      go: "go",
      java: "java",
      cpp: "cpp",
      csharp: "cs",
      ruby: "rb",
      php: "php",
      swift: "swift",
      kotlin: "kt",
      html: "html",
      css: "css",
      json: "json",
      sql: "sql",
      bash: "sh",
      yaml: "yaml",
    };
    const ext = extensions[language] || language;
    const baseName = filename.replace(/\.[^/.]+$/, "") || "main";
    setFilename(`${baseName}.${ext}`);
  }, [language]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">CodeSnap Video</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Create code videos for social media
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[400px_1fr] gap-6 h-[calc(100vh-8rem)]">
          {/* Left Panel - Controls */}
          <div className="bg-card border border-border rounded-xl p-4 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <Code2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Editor</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CodeEditor
                code={code}
                onCodeChange={setCode}
                language={language}
                onLanguageChange={setLanguage}
                background={background}
                onBackgroundChange={setBackground}
                syntaxTheme={syntaxTheme}
                onSyntaxThemeChange={setSyntaxTheme}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                padding={padding}
                onPaddingChange={setPadding}
                showWindowChrome={showWindowChrome}
                onShowWindowChromeChange={setShowWindowChrome}
                filename={filename}
                onFilenameChange={setFilename}
                animationConfig={animationConfig}
                onAnimationConfigChange={setAnimationConfig}
              />
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Preview */}
            <div className="flex-1 bg-card border border-border rounded-xl p-4 min-h-0 overflow-hidden">
              <CodePreview
                ref={previewRef}
                code={code}
                language={language}
                background={background}
                syntaxTheme={syntaxTheme}
                fontSize={fontSize}
                padding={padding}
                showWindowChrome={showWindowChrome}
                filename={filename}
                animationState={currentAnimationState}
              />
            </div>

            {/* Timeline & Export */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <AnimationTimeline
                isPlaying={isPlaying}
                currentTime={animState.currentTime}
                totalDuration={totalDuration}
                onPlay={play}
                onPause={pause}
                onReset={reset}
                onSeek={seek}
              />

              <div className="border-t border-border pt-4">
                <VideoExporter
                  previewRef={previewRef}
                  code={code}
                  animationConfig={animationConfig}
                  filename={filename}
                  onAnimationStateChange={setCurrentAnimationState}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
