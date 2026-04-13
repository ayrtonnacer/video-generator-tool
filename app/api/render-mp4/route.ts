import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frames, fps, musicEnabled, musicFadeOut, filename } = body;

    if (!frames || frames.length === 0) {
      return NextResponse.json(
        { error: "No frames provided" },
        { status: 400 }
      );
    }

    console.log("[v0] API: Received", frames.length, "frames");

    // Create temp directory
    const tmpDir = path.join("/tmp", `video-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      // Save frames as PNG files
      console.log("[v0] API: Saving frames...");
      for (let i = 0; i < frames.length; i++) {
        const base64Data = frames[i].replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const framePath = path.join(tmpDir, `frame-%06d.png`.replace("%06d", String(i).padStart(6, "0")));
        await fs.writeFile(framePath, buffer);
      }

      // Build FFmpeg command
      let ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${tmpDir}/frame-%06d.png" -c:v libx264 -preset fast -crf 23`;

      // Add audio if enabled
      if (musicEnabled) {
        const musicPath = path.join(process.cwd(), "public", "background-music.mp3");
        
        try {
          await fs.access(musicPath);
          
          // Calculate total duration
          const totalDuration = frames.length / fps;
          
          if (musicFadeOut > 0) {
            // Use filter_complex to apply fade out
            const fadeStart = Math.max(0, totalDuration - musicFadeOut);
            ffmpegCmd += ` -i "${musicPath}" -c:a aac -b:a 128k -filter_complex "[1:a]afade=t=out:st=${fadeStart}:d=${musicFadeOut}[a]" -map 0:v:0 -map "[a]" -shortest`;
          } else {
            ffmpegCmd += ` -i "${musicPath}" -c:a aac -b:a 128k -shortest`;
          }
        } catch (e) {
          console.warn("[v0] API: Music file not found, rendering without audio");
        }
      }

      const outputPath = path.join(tmpDir, "output.mp4");
      ffmpegCmd += ` "${outputPath}"`;

      console.log("[v0] API: Running FFmpeg command...");
      await execPromise(ffmpegCmd);

      // Read the output file
      console.log("[v0] API: Reading output file...");
      const videoData = await fs.readFile(outputPath);

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });

      console.log("[v0] API: Sending MP4 response:", videoData.length, "bytes");

      return new NextResponse(videoData, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": videoData.length.toString(),
          "Content-Disposition": `attachment; filename="${filename}.mp4"`,
        },
      });
    } catch (error) {
      // Cleanup on error
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("[v0] API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
