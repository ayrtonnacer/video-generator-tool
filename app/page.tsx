"use client";

import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  TypingPreview,
  codeThemes,
  backgroundGradients,
  type CodeTheme,
  type BackgroundGradient,
} from "@/components/code-video/typing-preview";
import { SimpleExporter } from "@/components/code-video/simple-exporter";
import { Film, Code2, Play, Pause, RotateCcw } from "lucide-react";

// Supported languages
const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "yaml", label: "YAML" },
];

const defaultCode = `function greet(name) {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
}

// Call the function
greet("World");`;

export default function Home() {
  // Code state
  const [code, setCode] = useState(defaultCode);
  const [language, setLanguage] = useState("javascript");
  const [filename, setFilename] = useState("app.js");
  
  // Style state
  const [theme, setTheme] = useState<CodeTheme>("dracula");
  const [background, setBackground] = useState<BackgroundGradient>("purple");
  const [fontSize, setFontSize] = useState(24);
  const [padding, setPadding] = useState(40);
  const [showWindowChrome, setShowWindowChrome] = useState(true);
  
  // Animation state
  const [typingSpeed, setTypingSpeed] = useState(25);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  
  
  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);
  
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
          <p className="text-sm text-muted-foreground hidden sm:block">
            Create code videos for TikTok, Reels & Shorts
          </p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Left panel - Controls */}
          <div className="space-y-6">
            {/* Code input */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Code2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Your Code</h2>
                <span className="ml-auto text-xs text-muted-foreground">{code.length} chars</span>
              </div>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
                className="min-h-[200px] font-mono text-sm resize-y bg-background"
              />
            </div>
            
            {/* Settings tabs */}
            <div className="bg-card border border-border rounded-xl p-4">
              <Tabs defaultValue="style" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
                  <TabsTrigger value="animation" className="flex-1">Animation</TabsTrigger>
                  <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
                </TabsList>
                
                {/* Style tab */}
                <TabsContent value="style" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Language</FieldLabel>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
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
                    </Field>
                    
                    <Field>
                      <FieldLabel>Filename</FieldLabel>
                      <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="app.js"
                      />
                    </Field>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Theme</FieldLabel>
                      <Select value={theme} onValueChange={(v) => setTheme(v as CodeTheme)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(codeThemes).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, " $1")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    
                    <Field>
                      <FieldLabel>Background</FieldLabel>
                      <Select value={background} onValueChange={(v) => setBackground(v as BackgroundGradient)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(backgroundGradients).map((bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg.charAt(0).toUpperCase() + bg.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Font Size</FieldLabel>
                      <span className="text-sm text-muted-foreground">{fontSize}px</span>
                    </div>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={14}
                      max={36}
                      step={1}
                    />
                  </Field>
                  
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Padding</FieldLabel>
                      <span className="text-sm text-muted-foreground">{padding}px</span>
                    </div>
                    <Slider
                      value={[padding]}
                      onValueChange={([v]) => setPadding(v)}
                      min={20}
                      max={80}
                      step={4}
                    />
                  </Field>
                  
                  <div className="flex items-center justify-between py-2">
                    <label className="text-sm font-medium">Window Chrome (macOS dots)</label>
                    <Switch
                      checked={showWindowChrome}
                      onCheckedChange={setShowWindowChrome}
                    />
                  </div>
                </TabsContent>
                
                {/* Animation tab */}
                <TabsContent value="animation" className="space-y-4">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Typing Speed</FieldLabel>
                      <span className="text-sm text-muted-foreground">{typingSpeed} chars/sec</span>
                    </div>
                    <Slider
                      value={[typingSpeed]}
                      onValueChange={([v]) => setTypingSpeed(v)}
                      min={10}
                      max={60}
                      step={1}
                    />
                  </Field>
                  
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Estimated Duration</p>
                    <p className="text-2xl font-bold">{duration.toFixed(1)}s</p>
                    <p className="text-xs text-muted-foreground">
                      Based on {code.length} characters at {typingSpeed} chars/sec
                    </p>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg space-y-2">
                    <p className="text-sm font-medium">Animation Sequence</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>0.5s delay before typing starts</li>
                      <li>Code types character by character</li>
                      <li>Cursor blinks when typing completes</li>
                      <li>1s pause at the end</li>
                    </ol>
                  </div>
                </TabsContent>
                
                {/* Export tab */}
                <TabsContent value="export" className="space-y-4">
                  <SimpleExporter
                    code={code}
                    language={language}
                    theme={theme}
                    background={background}
                    fontSize={fontSize}
                    padding={padding}
                    showWindowChrome={showWindowChrome}
                    typingSpeed={typingSpeed}
                    filename={filename}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Right panel - Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="font-semibold">Preview</h2>
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">9:16</span>
              </div>
              
              {/* Video preview */}
              <div className="relative overflow-hidden rounded-lg" style={{ maxHeight: "60vh" }}>
                <TypingPreview
                  code={code}
                  language={language}
                  theme={theme}
                  background={background}
                  fontSize={fontSize}
                  padding={padding}
                  showWindowChrome={showWindowChrome}
                  typingSpeed={typingSpeed}
                  filename={filename}
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                  onProgress={setProgress}
                  onDurationChange={setDuration}
                />
              </div>
              
              {/* Playback controls */}
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                
                {/* Control buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReset}
                    className="h-10 w-10"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="h-12 w-12 rounded-full"
                    size="icon"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-sm text-muted-foreground">
                  {duration.toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
