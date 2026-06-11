const { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const seedDataDir = path.join(root, "desktop-seed-data");

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Run `npm run build` before desktop packaging.");
}

copyDir(path.join(root, ".next", "static"), path.join(standaloneNextDir, "static"));
copyDir(path.join(root, "public"), path.join(standaloneDir, "public"), true);
copyDir(
  path.join(root, "node_modules", "better-sqlite3"),
  path.join(standaloneDir, "node_modules", "better-sqlite3")
);

rmSync(seedDataDir, { recursive: true, force: true });
mkdirSync(seedDataDir, { recursive: true });

const sqliteFile = path.join(root, "data", "leadforge.sqlite");
if (existsSync(sqliteFile)) {
  checkpointSqlite(sqliteFile);
  copyFileSync(sqliteFile, path.join(seedDataDir, "leadforge.sqlite"));
  copyOptionalFile(path.join(root, "data", "leadforge.sqlite-wal"), path.join(seedDataDir, "leadforge.sqlite-wal"));
  copyOptionalFile(path.join(root, "data", "leadforge.sqlite-shm"), path.join(seedDataDir, "leadforge.sqlite-shm"));
}

console.log("Prepared desktop standalone assets.");

function copyDir(source, destination, optional = false) {
  if (!existsSync(source)) {
    if (optional) return;
    throw new Error(`Missing required directory: ${source}`);
  }

  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function checkpointSqlite(sqliteFile) {
  const result = spawnSync("sqlite3", [sqliteFile, "PRAGMA wal_checkpoint(TRUNCATE);"], {
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    console.warn("SQLite CLI checkpoint skipped; copying WAL files as fallback.");
  }
}

function copyOptionalFile(source, destination) {
  if (existsSync(source)) {
    copyFileSync(source, destination);
  }
}
