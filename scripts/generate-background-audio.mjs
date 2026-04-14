import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Writes a short stereo silence WAV (48 kHz) for looping under Remotion / export.
 * No external binaries required.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "public", "background-music.wav");

const sampleRate = 48000;
const numChannels = 2;
const bitsPerSample = 16;
const durationSec = 8;
const numSamples = sampleRate * durationSec;
const blockAlign = (numChannels * bitsPerSample) / 8;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

try {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buffer);
  console.log("[generate-background-audio] wrote", out);
} catch (e) {
  console.warn("[generate-background-audio] skipped:", e);
  process.exit(0);
}
