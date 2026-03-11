/**
 * Electrobun preBuild lifecycle hook.
 *
 * On Windows builds, downloads the Microsoft WebView2 Evergreen Bootstrapper
 * into assets/ so it can be bundled with the app.  The bootstrapper is cached —
 * if the file already exists, the download is skipped.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WEBVIEW2_BOOTSTRAPPER_URL =
  "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
const DEST_DIR = "assets";
const DEST_FILENAME = "MicrosoftEdgeWebview2Setup.exe";
const MIN_SIZE_BYTES = 500_000; // Bootstrapper is ~1.8 MB; anything under 500 KB is suspect

const os = process.env.ELECTROBUN_OS ?? "";

if (os !== "win") {
  console.log(`[pre-build] Skipping WebView2 bootstrapper (OS=${os || "unknown"})`);
  process.exit(0);
}

const destPath = join(DEST_DIR, DEST_FILENAME);

// Use cached copy when present and big enough
if (existsSync(destPath)) {
  const size = statSync(destPath).size;
  if (size >= MIN_SIZE_BYTES) {
    console.log(`[pre-build] WebView2 bootstrapper already cached (${(size / 1024).toFixed(0)} KB)`);
    process.exit(0);
  }
  console.log(`[pre-build] Cached file too small (${size} bytes), re-downloading…`);
}

mkdirSync(DEST_DIR, { recursive: true });

console.log("[pre-build] Downloading WebView2 Evergreen Bootstrapper…");

try {
  const response = await fetch(WEBVIEW2_BOOTSTRAPPER_URL, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < MIN_SIZE_BYTES) {
    throw new Error(
      `Downloaded file is suspiciously small (${buffer.length} bytes). Expected ≥${MIN_SIZE_BYTES}.`
    );
  }

  await Bun.write(destPath, buffer);
  console.log(
    `[pre-build] Saved WebView2 bootstrapper → ${destPath} (${(buffer.length / 1024).toFixed(0)} KB)`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[pre-build] ❌ Failed to download WebView2 bootstrapper: ${message}`);
  console.error(
    "[pre-build] The build will continue, but the app may fail on Windows machines without WebView2."
  );
  // Don't fail the build — the bootstrapper is best-effort
}

console.log("[pre-build] Done");
