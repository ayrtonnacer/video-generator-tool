"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  backgroundGradients,
  syntaxThemes,
  languages,
  defaultCodeSnippets,
  type BackgroundGradient,
  type SyntaxTheme,
  type Language,
} from "@/lib/themes";
import { AnimationConfig, defaultAnimationConfig } from "@/lib/animations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  background: BackgroundGradient;
  onBackgroundChange: (background: BackgroundGradient) => void;
  syntaxTheme: SyntaxTheme;
  onSyntaxThemeChange: (theme: SyntaxTheme) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  padding: number;
  onPaddingChange: (padding: number) => void;
  showWindowChrome: boolean;
  onShowWindowChromeChange: (show: boolean) => void;
  filename: string;
  onFilenameChange: (filename: string) => void;
  animationConfig: AnimationConfig;
  onAnimationConfigChange: (config: AnimationConfig) => void;
}

export function CodeEditor({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  background,
  onBackgroundChange,
  syntaxTheme,
  onSyntaxThemeChange,
  fontSize,
  onFontSizeChange,
  padding,
  onPaddingChange,
  showWindowChrome,
  onShowWindowChromeChange,
  filename,
  onFilenameChange,
  animationConfig,
  onAnimationConfigChange,
}: CodeEditorProps) {
  const handleLanguageChange = (newLang: Language) => {
    onLanguageChange(newLang);
    // Load default code snippet if current code is empty or default
    if (!code || Object.values(defaultCodeSnippets).includes(code)) {
      const defaultCode = defaultCodeSnippets[newLang] || "";
      if (defaultCode) {
        onCodeChange(defaultCode);
      }
    }
  };

  const updateTypingConfig = (key: keyof AnimationConfig["typing"], value: number | boolean) => {
    onAnimationConfigChange({
      ...animationConfig,
      typing: { ...animationConfig.typing, [key]: value },
    });
  };

  const updateZoomConfig = (key: keyof AnimationConfig["zoom"], value: number | boolean) => {
    onAnimationConfigChange({
      ...animationConfig,
      zoom: { ...animationConfig.zoom, [key]: value },
    });
  };

  const updateHighlightConfig = (key: keyof AnimationConfig["highlight"], value: number[] | string | number | boolean) => {
    onAnimationConfigChange({
      ...animationConfig,
      highlight: { ...animationConfig.highlight, [key]: value },
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto p-1">
      {/* Code Input */}
      <div className="space-y-2">
        <Label htmlFor="code" className="text-sm font-medium">
          Code
        </Label>
        <Textarea
          id="code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Paste your code here..."
          className="font-mono text-sm min-h-[200px] resize-none bg-secondary/50"
          spellCheck={false}
        />
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
          <TabsTrigger value="animation" className="flex-1">Animation</TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-4 mt-4">
          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename" className="text-sm font-medium">
              Filename
            </Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              placeholder="main.js"
              className="bg-secondary/50"
            />
          </div>

          {/* Background */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Background</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(backgroundGradients).map(([key, { name, gradient }]) => (
                <button
                  key={key}
                  onClick={() => onBackgroundChange(key as BackgroundGradient)}
                  className={`h-10 rounded-md border-2 transition-all ${
                    background === key ? "border-primary ring-2 ring-primary/50" : "border-transparent"
                  }`}
                  style={{ background: gradient }}
                  title={name}
                />
              ))}
            </div>
          </div>

          {/* Syntax Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Syntax Theme</Label>
            <Select value={syntaxTheme} onValueChange={(v) => onSyntaxThemeChange(v as SyntaxTheme)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(syntaxThemes).map(([key, { name }]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Font Size</Label>
              <span className="text-sm text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => onFontSizeChange(v)}
              min={12}
              max={32}
              step={1}
            />
          </div>

          {/* Padding */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Padding</Label>
              <span className="text-sm text-muted-foreground">{padding}px</span>
            </div>
            <Slider
              value={[padding]}
              onValueChange={([v]) => onPaddingChange(v)}
              min={32}
              max={128}
              step={8}
            />
          </div>

          {/* Window Chrome */}
          <div className="flex items-center justify-between">
            <Label htmlFor="window-chrome" className="text-sm font-medium">
              Window Chrome
            </Label>
            <Switch
              id="window-chrome"
              checked={showWindowChrome}
              onCheckedChange={onShowWindowChromeChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="animation" className="space-y-4 mt-4">
          {/* Typing Animation */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Typing Effect</Label>
              <Switch
                checked={animationConfig.typing.enabled}
                onCheckedChange={(v) => updateTypingConfig("enabled", v)}
              />
            </div>
            {animationConfig.typing.enabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Speed</Label>
                    <span className="text-xs text-muted-foreground">{animationConfig.typing.speed} chars/s</span>
                  </div>
                  <Slider
                    value={[animationConfig.typing.speed]}
                    onValueChange={([v]) => updateTypingConfig("speed", v)}
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Start Delay</Label>
                    <span className="text-xs text-muted-foreground">{animationConfig.typing.startDelay}ms</span>
                  </div>
                  <Slider
                    value={[animationConfig.typing.startDelay]}
                    onValueChange={([v]) => updateTypingConfig("startDelay", v)}
                    min={0}
                    max={2000}
                    step={100}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zoom Animation */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Zoom Effect</Label>
              <Switch
                checked={animationConfig.zoom.enabled}
                onCheckedChange={(v) => updateZoomConfig("enabled", v)}
              />
            </div>
            {animationConfig.zoom.enabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Zoom Level</Label>
                    <span className="text-xs text-muted-foreground">{animationConfig.zoom.level.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[animationConfig.zoom.level * 10]}
                    onValueChange={([v]) => updateZoomConfig("level", v / 10)}
                    min={10}
                    max={20}
                    step={1}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Highlight Animation */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Line Highlight</Label>
              <Switch
                checked={animationConfig.highlight.enabled}
                onCheckedChange={(v) => updateHighlightConfig("enabled", v)}
              />
            </div>
            {animationConfig.highlight.enabled && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Lines to highlight (comma separated)</Label>
                  <Input
                    value={animationConfig.highlight.lines.join(", ")}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split(",")
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n));
                      updateHighlightConfig("lines", lines);
                    }}
                    placeholder="1, 3, 5"
                    className="bg-secondary/50 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Total Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Min Duration</Label>
              <span className="text-sm text-muted-foreground">{(animationConfig.duration / 1000).toFixed(1)}s</span>
            </div>
            <Slider
              value={[animationConfig.duration]}
              onValueChange={([v]) => onAnimationConfigChange({ ...animationConfig, duration: v })}
              min={2000}
              max={15000}
              step={500}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
