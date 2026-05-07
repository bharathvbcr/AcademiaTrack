import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = process.cwd();
const ownershipPath = path.join(repoRoot, "OWNERSHIP_INVENTORY.md");
const mapFiles = [
  "CALL_CHAIN_PERSISTENCE.md",
  "COMMUNITY_MAP_SUBSYSTEM.md",
  "OWNERSHIP_INVENTORY.md",
  "AGENTS.md",
];
const allowedUntrackedArtifacts = [
  ...mapFiles,
];

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8", cwd: repoRoot });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function getOwnedFiles() {
  const content = fs.readFileSync(ownershipPath, "utf8");
  const owned = new Set();
  const regex = /`([^`]+)`/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const filePath = match[1];
    if (filePath.includes("*")) {
      continue;
    }
    owned.add(filePath);
  }

  return Array.from(owned).sort();
}

function main() {
  if (!fs.existsSync(ownershipPath)) {
    fail(`Missing required ownership map file: ${ownershipPath}`);
  }

  const tracked = getTrackedFiles();
  const owned = getOwnedFiles();
  const ownedSet = new Set(owned);

  const missing = tracked.filter((f) => !ownedSet.has(f));
  const extra = owned.filter(
    (f) => !tracked.includes(f) && !allowedUntrackedArtifacts.includes(f)
  );

  if (missing.length > 0) {
    console.error("Ownership map is missing these tracked files:");
    for (const file of missing) console.error(`- ${file}`);
  }

  if (extra.length > 0) {
    console.error("Ownership map includes files not tracked by git:");
    for (const file of extra) console.error(`- ${file}`);
  }

  for (const mapFile of mapFiles) {
    const mapPath = path.join(repoRoot, mapFile);
    if (!fs.existsSync(mapPath)) {
      console.error(`Missing required map file: ${mapFile}`);
      fail("Map coverage check failed", 1);
    }
  }

  if (missing.length || extra.length) {
    fail("Map coverage check failed.");
  }

  console.log(
    `Map coverage check passed: ${tracked.length}/${tracked.length} files covered`
  );
  process.exit(0);
}

main();
