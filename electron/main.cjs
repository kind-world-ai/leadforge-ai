const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync } = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const APP_HOST = "127.0.0.1";
const SMOKE_TEST = process.env.LEADFORGE_DESKTOP_SMOKE === "1";
const PROJECT_ROOT = path.resolve(__dirname, "..");

let mainWindow;
let nextProcess;
let appPort;
let appUrl;
let logFile;

app.setName("LeadForge AI");
if (SMOKE_TEST) {
  app.setPath("userData", path.join(os.tmpdir(), `leadforge-ai-smoke-${process.pid}`));
}

const gotLock = SMOKE_TEST || app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      const dataDir = prepareDataDirectory();
      logFile = path.join(app.getPath("userData"), "desktop.log");
      log(`Starting LeadForge AI. packaged=${app.isPackaged} dataDir=${dataDir}`);
      await startNext(dataDir);
      await createWindow();
    } catch (error) {
      log(`Startup failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      dialog.showErrorBox(
        "LeadForge AI could not start",
        error instanceof Error ? error.stack || error.message : String(error)
      );
      app.quit();
    }
  });
}

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }
});

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: "LeadForge AI",
    show: !SMOKE_TEST,
    backgroundColor: "#f4f6f1",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    log(`Window failed load: ${errorCode} ${errorDescription} ${validatedUrl}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log(`Renderer gone: ${JSON.stringify(details)}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log(`Renderer console level=${level} ${sourceId}:${line} ${message}`);
  });

  await mainWindow.loadURL(appUrl);

  if (SMOKE_TEST) {
    await smokeTestWindow(mainWindow);
  } else {
    mainWindow.show();
  }
}

function prepareDataDirectory() {
  const dataDir = app.isPackaged
    ? path.join(app.getPath("userData"), "data")
    : path.join(PROJECT_ROOT, "data");
  mkdirSync(dataDir, { recursive: true });

  if (app.isPackaged) {
    const dbFile = path.join(dataDir, "leadforge.sqlite");
    const seedDir = path.join(process.resourcesPath, "seed-data");
    if (!existsSync(dbFile) && existsSync(seedDir)) {
      for (const fileName of readdirSync(seedDir)) {
        copyFileSync(path.join(seedDir, fileName), path.join(dataDir, fileName));
      }
    }
  }

  return dataDir;
}

async function startNext(dataDir) {
  appPort = Number(process.env.LEADFORGE_PORT || 0) || (await getFreePort());
  appUrl = `http://${APP_HOST}:${appPort}`;
  process.env.PORT = String(appPort);
  process.env.HOSTNAME = APP_HOST;
  process.env.LEADFORGE_DATA_DIR = dataDir;

  if (app.isPackaged) {
    const serverFile = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      ".next",
      "standalone",
      "server.js"
    );
    if (!existsSync(serverFile)) {
      throw new Error(`Packaged Next server was not found at ${serverFile}`);
    }

    log(`Starting packaged Next server from ${serverFile} on ${appUrl}`);
    process.chdir(path.dirname(serverFile));
    createRequire(serverFile)(serverFile);
  } else {
    const serverFile = path.join(PROJECT_ROOT, ".next", "standalone", "server.js");
    if (!existsSync(serverFile)) {
      throw new Error("Missing .next/standalone/server.js. Run `npm run desktop:prepare` first.");
    }

    log(`Starting local standalone Next server process from ${serverFile} on ${appUrl}`);
    nextProcess = spawn(process.env.LEADFORGE_NODE_BINARY || "node", [serverFile], {
      cwd: path.dirname(serverFile),
      env: {
        ...process.env,
        PORT: String(appPort),
        HOSTNAME: APP_HOST,
        LEADFORGE_DATA_DIR: dataDir
      },
      stdio: "inherit",
      shell: false
    });
  }

  await waitForServer();
}

async function waitForServer() {
  const startedAt = Date.now();
  const timeoutMs = 45000;

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      log(`Next server ready at ${appUrl}`);
      return;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${appUrl}`);
}

async function isServerReady() {
  try {
    const response = await fetch(`${appUrl}/api/leads`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, APP_HOST, () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Could not allocate a free desktop port"));
        }
      });
    });
  });
}

async function smokeTestWindow(window) {
  await delay(1500);
  const result = await window.webContents.executeJavaScript(`
    (() => {
      const text = document.body.innerText || "";
      return {
        title: document.title,
        textLength: text.trim().length,
        hasLeadForge: text.includes("LeadForge"),
        bodyPreview: text.trim().slice(0, 300),
        url: location.href
      };
    })()
  `);

  log(`Smoke result: ${JSON.stringify(result)}`);
  if (!result.hasLeadForge || result.textLength < 50) {
    console.error(JSON.stringify(result, null, 2));
    app.exit(1);
    return;
  }

  console.log(JSON.stringify(result, null, 2));
  app.exit(0);
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    if (logFile) appendFileSync(logFile, line);
  } catch {
    // Logging should never block startup.
  }
  if (!app.isPackaged || SMOKE_TEST) {
    console.log(line.trim());
  }
}
