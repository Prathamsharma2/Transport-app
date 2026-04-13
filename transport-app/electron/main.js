const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const tcpPortUsed = require('tcp-port-used');

let mainWindow;
let pyProc = null;

const createPyProc = () => {
  let script = path.join(__dirname, '..', 'backend', 'venv', 'bin', 'uvicorn');
  
  pyProc = spawn(script, ['main:app', '--port', '8000'], {
    cwd: path.join(__dirname, '..', 'backend')
  });

  if (pyProc != null) {
    console.log('FastAPI server spawned on port 8000');
  }
}

const exitPyProc = () => {
  if (pyProc) {
    pyProc.kill();
    pyProc = null;
  }
}

app.on('ready', async () => {
  createPyProc();

  // Wait for FastAPI to bind safely
  try {
    await tcpPortUsed.waitUntilUsed(8000, 500, 10000);
  } catch (err) {
    console.error('Error waiting for FastAPI:', err);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'DHILLON ROADLINES TMS',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', exitPyProc);
