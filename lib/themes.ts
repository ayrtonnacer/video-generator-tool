// Background gradients for code preview
export const backgroundGradients = {
  ocean: {
    name: "Ocean",
    gradient: "linear-gradient(140deg, #0ea5e9 0%, #06b6d4 50%, #14b8a6 100%)",
  },
  night: {
    name: "Night",
    gradient: "linear-gradient(140deg, #1e293b 0%, #0f172a 50%, #020617 100%)",
  },
  sunset: {
    name: "Sunset",
    gradient: "linear-gradient(140deg, #f97316 0%, #ef4444 50%, #ec4899 100%)",
  },
  forest: {
    name: "Forest",
    gradient: "linear-gradient(140deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
  },
  aurora: {
    name: "Aurora",
    gradient: "linear-gradient(140deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)",
  },
  minimal: {
    name: "Minimal",
    gradient: "linear-gradient(140deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
  },
  candy: {
    name: "Candy",
    gradient: "linear-gradient(140deg, #f472b6 0%, #fb923c 50%, #facc15 100%)",
  },
  midnight: {
    name: "Midnight",
    gradient: "linear-gradient(140deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)",
  },
} as const;

export type BackgroundGradient = keyof typeof backgroundGradients;

// Syntax highlighting themes (highlight.js compatible)
export const syntaxThemes = {
  "atom-one-dark": {
    name: "Atom One Dark",
    background: "#282c34",
    foreground: "#abb2bf",
    keyword: "#c678dd",
    string: "#98c379",
    number: "#d19a66",
    comment: "#5c6370",
    function: "#61afef",
    variable: "#e06c75",
    type: "#e5c07b",
    operator: "#56b6c2",
  },
  "github-dark": {
    name: "GitHub Dark",
    background: "#0d1117",
    foreground: "#c9d1d9",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    number: "#79c0ff",
    comment: "#8b949e",
    function: "#d2a8ff",
    variable: "#ffa657",
    type: "#7ee787",
    operator: "#79c0ff",
  },
  "monokai": {
    name: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    keyword: "#f92672",
    string: "#e6db74",
    number: "#ae81ff",
    comment: "#75715e",
    function: "#a6e22e",
    variable: "#fd971f",
    type: "#66d9ef",
    operator: "#f8f8f2",
  },
  "dracula": {
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    keyword: "#ff79c6",
    string: "#f1fa8c",
    number: "#bd93f9",
    comment: "#6272a4",
    function: "#50fa7b",
    variable: "#ffb86c",
    type: "#8be9fd",
    operator: "#ff79c6",
  },
  "nord": {
    name: "Nord",
    background: "#2e3440",
    foreground: "#d8dee9",
    keyword: "#81a1c1",
    string: "#a3be8c",
    number: "#b48ead",
    comment: "#616e88",
    function: "#88c0d0",
    variable: "#d8dee9",
    type: "#8fbcbb",
    operator: "#81a1c1",
  },
} as const;

export type SyntaxTheme = keyof typeof syntaxThemes;

// Programming languages supported
export const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "yaml", label: "YAML" },
] as const;

export type Language = (typeof languages)[number]["value"];

// Default code snippets per language
export const defaultCodeSnippets: Record<string, string> = {
  javascript: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate first 10 numbers
for (let i = 0; i < 10; i++) {
  console.log(fibonacci(i));
}`,
  typescript: `interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`,
  python: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)`,
  rust: `fn main() {
    let numbers = vec![1, 2, 3, 4, 5];
    
    let sum: i32 = numbers
        .iter()
        .filter(|&x| x % 2 == 0)
        .map(|x| x * 2)
        .sum();
    
    println!("Sum: {}", sum);
}`,
  go: `package main

import "fmt"

func main() {
    ch := make(chan int, 5)
    
    go func() {
        for i := 0; i < 5; i++ {
            ch <- i * i
        }
        close(ch)
    }()
    
    for n := range ch {
        fmt.Println(n)
    }
}`,
};
