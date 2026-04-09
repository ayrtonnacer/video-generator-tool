"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  AnimationConfig,
  AnimationState,
  defaultAnimationConfig,
  initialAnimationState,
  calculateAnimationState,
  calculateTotalDuration,
} from "@/lib/animations";

interface UseAnimationOptions {
  code: string;
  config?: AnimationConfig;
  onFrame?: (state: AnimationState) => void;
}

export function useAnimation({ code, config = defaultAnimationConfig, onFrame }: UseAnimationOptions) {
  const [state, setState] = useState<AnimationState>(initialAnimationState);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const totalDuration = calculateTotalDuration(config, code);

  const updateState = useCallback(
    (time: number) => {
      const animState = calculateAnimationState(config, code, time);
      const newState: AnimationState = {
        ...initialAnimationState,
        ...animState,
        isPlaying: true,
        currentTime: time,
      };
      setState(newState);
      onFrame?.(newState);
    },
    [config, code, onFrame]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - pausedTimeRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;

      if (elapsed >= totalDuration) {
        // Animation complete
        updateState(totalDuration);
        setIsPlaying(false);
        startTimeRef.current = 0;
        pausedTimeRef.current = 0;
        return;
      }

      updateState(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    },
    [totalDuration, updateState]
  );

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, animate]);

  const pause = useCallback(() => {
    if (!isPlaying) return;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    pausedTimeRef.current = state.currentTime;
    setIsPlaying(false);
  }, [isPlaying, state.currentTime]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setIsPlaying(false);
    setState(initialAnimationState);
    onFrame?.(initialAnimationState);
  }, [onFrame]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, totalDuration));
      pausedTimeRef.current = clampedTime;
      startTimeRef.current = 0;
      updateState(clampedTime);
    },
    [totalDuration, updateState]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Reset when code changes
  useEffect(() => {
    reset();
  }, [code, reset]);

  return {
    state,
    isPlaying,
    totalDuration,
    progress: state.currentTime / totalDuration,
    play,
    pause,
    reset,
    seek,
    toggle: isPlaying ? pause : play,
  };
}
