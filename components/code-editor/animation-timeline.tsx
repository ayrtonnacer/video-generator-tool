"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AnimationTimelineProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 10);
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${remainingSeconds}.${remainingMs.toString().padStart(2, "0")}`;
}

export function AnimationTimeline({
  isPlaying,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onReset,
  onSeek,
}: AnimationTimelineProps) {
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Timeline slider */}
      <div className="relative w-full">
        <Slider
          value={[progress]}
          onValueChange={([v]) => onSeek((v / 100) * totalDuration)}
          min={0}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            className="h-9 w-9"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={isPlaying ? onPause : onPlay}
            className="h-9 w-9"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Time display */}
        <div className="font-mono text-sm text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
