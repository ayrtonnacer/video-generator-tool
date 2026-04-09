// Animation configuration types
export interface AnimationConfig {
  typing: {
    enabled: boolean;
    speed: number; // characters per second
    startDelay: number; // ms before typing starts
  };
  zoom: {
    enabled: boolean;
    level: number; // 1.0 = normal, 1.5 = 150%
    targetLine: number; // line to zoom into
    duration: number; // ms for zoom animation
  };
  highlight: {
    enabled: boolean;
    lines: number[]; // lines to highlight
    color: string;
    opacity: number;
  };
  duration: number; // total duration in ms
}

export const defaultAnimationConfig: AnimationConfig = {
  typing: {
    enabled: true,
    speed: 25, // 25 chars per second (better for readability)
    startDelay: 300,
  },
  zoom: {
    enabled: false,
    level: 1.2,
    targetLine: 1,
    duration: 500,
  },
  highlight: {
    enabled: false,
    lines: [],
    color: "#fbbf24",
    opacity: 0.2,
  },
  duration: 5000, // 5 seconds default
};

// Animation state for playback
export interface AnimationState {
  isPlaying: boolean;
  currentTime: number; // ms from start
  typingIndex: number; // current character index
  zoomLevel: number;
  zoomX: number;
  zoomY: number;
  highlightedLines: Set<number>;
  showCursor: boolean;
}

export const initialAnimationState: AnimationState = {
  isPlaying: false,
  currentTime: 0,
  typingIndex: 0,
  zoomLevel: 1,
  zoomX: 0,
  zoomY: 0,
  highlightedLines: new Set(),
  showCursor: true,
};

// Calculate animation state at a given time
export function calculateAnimationState(
  config: AnimationConfig,
  code: string,
  time: number
): Partial<AnimationState> {
  const state: Partial<AnimationState> = {};

  // Typing animation
  if (config.typing.enabled) {
    const typingStartTime = config.typing.startDelay;
    const charsPerMs = config.typing.speed / 1000;
    
    if (time < typingStartTime) {
      state.typingIndex = 0;
    } else {
      const typingTime = time - typingStartTime;
      state.typingIndex = Math.min(
        Math.floor(typingTime * charsPerMs),
        code.length
      );
    }
    
    // Cursor blinks every 530ms, but always visible while actively typing
    const isActivelyTyping = state.typingIndex !== undefined && state.typingIndex < code.length;
    state.showCursor = isActivelyTyping ? Math.floor(time / 530) % 2 === 0 || true : Math.floor(time / 530) % 2 === 0;
  } else {
    state.typingIndex = code.length;
    state.showCursor = false;
  }

  // Zoom animation
  if (config.zoom.enabled) {
    const typingEndTime = config.typing.enabled
      ? config.typing.startDelay + (code.length / config.typing.speed) * 1000
      : 0;
    
    const zoomStartTime = typingEndTime + 500; // Start zoom after typing + 500ms pause
    const zoomEndTime = zoomStartTime + config.zoom.duration;
    
    if (time < zoomStartTime) {
      state.zoomLevel = 1;
    } else if (time < zoomEndTime) {
      const progress = (time - zoomStartTime) / config.zoom.duration;
      const eased = easeInOutCubic(progress);
      state.zoomLevel = 1 + (config.zoom.level - 1) * eased;
    } else {
      state.zoomLevel = config.zoom.level;
    }
  } else {
    state.zoomLevel = 1;
  }

  // Highlight animation
  if (config.highlight.enabled && config.highlight.lines.length > 0) {
    const typingEndTime = config.typing.enabled
      ? config.typing.startDelay + (code.length / config.typing.speed) * 1000
      : 0;
    
    if (time > typingEndTime + 200) {
      state.highlightedLines = new Set(config.highlight.lines);
    } else {
      state.highlightedLines = new Set();
    }
  } else {
    state.highlightedLines = new Set();
  }

  return state;
}

// Easing function for smooth animations
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Calculate total animation duration based on config and code
export function calculateTotalDuration(
  config: AnimationConfig,
  code: string
): number {
  let duration = 0;

  if (config.typing.enabled) {
    duration = config.typing.startDelay + (code.length / config.typing.speed) * 1000;
  }

  if (config.zoom.enabled) {
    duration += 500 + config.zoom.duration; // pause + zoom
  }

  // Add 1 second of hold at the end
  duration += 1000;

  return Math.max(duration, config.duration);
}
