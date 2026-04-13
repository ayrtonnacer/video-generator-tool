"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Film, Code2, Music, Monitor } from "lucide-react";
import { themeOptions, backgroundOptions, themeNames, backgroundNames, type CodeThemeName, type BackgroundName } from "@/components/remotion/CodeVideo";

const RemotionPlayer = dynamic(() => import("@/components/remotion/RemotionPlayer").then((mod) => mod.RemotionPlayer), { ssr: false });
const CanvasExporter = dynamic(() => import("@/components/remotion/CanvasExporter").then((mod) => mod.CanvasExporter), { ssr: false });

const languages = [{ value: "python", label: "Python" }, { value: "plaintext", label: "Plain Text" }];
const defaultCode = `def quicksort(arr):
  if len(arr) <= 1: return arr
  pivot = arr[len(arr) // 2]
  left = [x for x in arr if x < pivot]
  middle = [x for x in arr if x == pivot]
  right = [x for x in arr if x > pivot]
  return quicksort(left) + middle + right`;

export default function Home() {
  const [code, setCode] = useState(defaultCode);
  const [language, setLanguage] = useState("python");
  const [filename, setFilename] = useState("main.py");
  const [theme, setTheme] = useState<CodeThemeName>("terminal-dark");
  const [background, setBackground] = useState<BackgroundName>("scale-dark");
  const [customBackgroundColor, setCustomBackgroundColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(22);
  const [padding, setPadding] = useState(40);
  const [showWindowChrome, setShowWindowChrome] = useState(true);
  const [typingSpeed, setTypingSpeed] = useState(25);
  const [holdTime, setHoldTime] = useState(2);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicFadeOut, setMusicFadeOut] = useState(2);
  const handleDurationChange = useCallback((_newDuration: number) => {
    // Duration is tracked by RemotionPlayer internally
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">CodeSnap Video</span>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Create Python code videos for TikTok, Reels & Shorts
          </p>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Code2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Your Code</h2>
              </div>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your Python code here..."
                className="min-h-[200px] font-mono text-sm resize-y bg-background"
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <Tabs defaultValue="style" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
                  <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
                  <TabsTrigger value="animation" className="flex-1">Animation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="style" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel>Language</FieldLabel>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Filename</FieldLabel>
                      <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Code Theme</FieldLabel>
                    <Select value={theme} onValueChange={(v) => setTheme(v as CodeThemeName)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {themeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{themeNames[t].name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Font Size</FieldLabel>
                      <span className="text-sm text-muted-foreground">{fontSize}px</span>
                    </div>
                    <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={14} max={32} />
                  </Field>
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
                  <Field>
                    <FieldLabel>Background Style</FieldLabel>
                    <Select value={background} onValueChange={(v) => setBackground(v as BackgroundName)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {backgroundOptions.map((bg) => (
                          <SelectItem key={bg} value={bg}>{backgroundNames[bg].name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {background === "custom" && (
                    <Field>
                      <FieldLabel>Custom Color</FieldLabel>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customBackgroundColor}
                          onChange={(e) => setCustomBackgroundColor(e.target.value)}
                          className="w-10 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={customBackgroundColor}
                          onChange={(e) => setCustomBackgroundColor(e.target.value)}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </Field>
                  )}
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Padding</FieldLabel>
                      <span className="text-sm text-muted-foreground">{padding}px</span>
                    </div>
                    <Slider value={[padding]} onValueChange={([v]) => setPadding(v)} min={16} max={80} />
                  </Field>
                  <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                      <label className="text-sm font-medium">Window Chrome</label>
                    </div>
                    <Switch checked={showWindowChrome} onCheckedChange={setShowWindowChrome} />
                  </div>
                </TabsContent>

                <TabsContent value="animation" className="space-y-4">
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Typing Speed</FieldLabel>
                      <span className="text-sm text-muted-foreground">{typingSpeed} chars/s</span>
                    </div>
                    <Slider value={[typingSpeed]} onValueChange={([v]) => setTypingSpeed(v)} min={10} max={60} />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Hold Time</FieldLabel>
                      <span className="text-sm text-muted-foreground">{holdTime}s</span>
                    </div>
                    <Slider value={[holdTime]} onValueChange={([v]) => setHoldTime(v)} min={0} max={10} step={0.5} />
                  </Field>
                  <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Music className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <label className="text-sm font-medium">Background Music</label>
                        <p className="text-xs text-muted-foreground">Rock That Body</p>
                      </div>
                    </div>
                    <Switch checked={musicEnabled} onCheckedChange={setMusicEnabled} />
                  </div>
                  {musicEnabled && (
                    <Field>
                      <div className="flex items-center justify-between">
                        <FieldLabel>Fade Out</FieldLabel>
                        <span className="text-sm text-muted-foreground">{musicFadeOut}s</span>
                      </div>
                      <Slider value={[musicFadeOut]} onValueChange={([v]) => setMusicFadeOut(v)} min={0} max={5} step={0.5} />
                    </Field>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="lg:sticky lg:top-20">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <RemotionPlayer
                code={code}
                language={language}
                theme={theme}
                background={background}
                customBackgroundColor={customBackgroundColor}
                fontSize={fontSize}
                padding={padding}
                showWindowChrome={showWindowChrome}
                filename={filename}
                typingSpeed={typingSpeed}
                holdTime={holdTime}
                musicEnabled={musicEnabled}
                musicFadeOut={musicFadeOut}
                onDurationChange={handleDurationChange}
              />
              <div className="pt-4 border-t space-y-3">
                <CanvasExporter
                  code={code}
                  language={language}
                  theme={theme}
                  background={background}
                  customBackgroundColor={customBackgroundColor}
                  fontSize={fontSize}
                  padding={padding}
                  showWindowChrome={showWindowChrome}
                  filename={filename}
                  typingSpeed={typingSpeed}
                  holdTime={holdTime}
                  musicEnabled={musicEnabled}
                  musicFadeOut={musicFadeOut}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
