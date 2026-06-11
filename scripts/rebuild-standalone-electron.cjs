const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const electronRebuild = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron-rebuild.cmd" : "electron-rebuild");
const electronVersion = require("electron/package.json").version;
const arch = readOption("--arch") || process.env.ELECTRON_REBUILD_ARCH || process.arch;

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Run `npm run desktop:prepare` first.");
}

if (!existsSync(electronRebuild)) {
  throw new Error("Missing electron-rebuild. Run `npm install` before desktop packaging.");
}

const args = [
  "--version",
  electronVersion,
  "--module-dir",
  standaloneDir,
  "--only",
  "better-sqlite3",
  "--force",
  "--arch",
  arch
];

console.log(`Rebuilding .next/standalone better-sqlite3 for Electron ${electronVersion} (${arch})...`);
const result = spawnSync(electronRebuild, args, {
  cwd: standaloneDir,
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log("Rebuilt standalone native modules for Electron.");

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}
