const electronModule = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Some shells/toolchains set ELECTRON_RUN_AS_NODE globally, which breaks app startup.
if(typeof electronModule === "string") {
  const fixedEnv = { ...process.env };
  delete fixedEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronModule, process.argv.slice(1), {
    stdio: "inherit",
    env: fixedEnv
  });
  child.on("exit", code => process.exit(code ?? 0));
  child.on("error", err => {
    console.error("Failed to launch Electron app process:", err.message);
    process.exit(1);
  });
  return;
}

const { app, BrowserWindow } = electronModule;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if(ext === ".html") return "text/html; charset=utf-8";
  if(ext === ".js") return "application/javascript; charset=utf-8";
  if(ext === ".css") return "text/css; charset=utf-8";
  if(ext === ".json") return "application/json; charset=utf-8";
  if(ext === ".png") return "image/png";
  if(ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if(ext === ".webp") return "image/webp";
  if(ext === ".svg") return "image/svg+xml";
  if(ext === ".ogg") return "audio/ogg";
  if(ext === ".mp3") return "audio/mpeg";
  if(ext === ".wav") return "audio/wav";
  return "application/octet-stream";
}

function startLocalServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url, "http://127.0.0.1");
        const rawPath = decodeURIComponent(reqUrl.pathname || "/");
        const relPath = rawPath === "/" ? "/index.html" : rawPath;
        const absPath = path.normalize(path.join(rootDir, relPath));
        if(!absPath.startsWith(path.normalize(rootDir + path.sep))) {
          res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Forbidden");
          return;
        }
        if(!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": getMimeType(absPath),
          "Cache-Control": "public, max-age=3600"
        });
        fs.createReadStream(absPath).pipe(res);
      } catch(_) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal error");
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const { server, port } = await startLocalServer(__dirname);
  win.on("closed", () => {
    try { server.close(); } catch(_) {}
  });
  await win.loadURL(`http://127.0.0.1:${port}/index.html`);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
