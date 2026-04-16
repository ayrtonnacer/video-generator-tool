import { mkdir, writeFile, access, copyFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const destDir = join(root, "public", "ffmpeg-core-mt");
const CDN = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
const FILES = ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(destDir, { recursive: true });

  for (const file of FILES) {
    const dest = join(destDir, file);

    if (await exists(dest)) {
      console.log(`[ffmpeg-wasm] ${file} already present, skipping`);
      continue;
    }

    // Try node_modules first (if @ffmpeg/core-mt is installed)
    const nmPath = join(root, "node_modules", "@ffmpeg", "core-mt", "dist", "esm", file);
    if (await exists(nmPath)) {
      await copyFile(nmPath, dest);
      console.log(`[ffmpeg-wasm] Copied ${file} from node_modules`);
      continue;
    }

    // Download from unpkg CDN
    const url = `${CDN}/${file}`;
    console.log(`[ffmpeg-wasm] Downloading ${file} from CDN…`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${file}: HTTP ${res.status} from ${url}`);
    }
    const buf = await res.arrayBuffer();
    await writeFile(dest, Buffer.from(buf));
    console.log(`[ffmpeg-wasm] Downloaded ${file} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log("[ffmpeg-wasm] All files ready in public/ffmpeg-core-mt/");
}

main().catch((e) => {
  console.error("[ffmpeg-wasm] ERROR:", e.message);
  process.exit(1);
});
