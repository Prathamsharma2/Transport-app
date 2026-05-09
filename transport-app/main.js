require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
// Auto-updater
let autoUpdater;
try {
  // electron-updater is an optional dependency; ensure you install it with:
  // npm install --save electron-updater
  autoUpdater = require('electron-updater').autoUpdater;
} catch (err) {
  console.warn('electron-updater not installed. Auto-updates disabled.');
}

// Ensure single instance
console.log('[Main] Checking single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { 
  console.log('[Main] Did not get lock. Quitting...');
  app.quit(); 
} else {
  console.log('[Main] Got lock. Proceeding...');
}

let adminWindow = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  console.log('[Main] Loading login.html...');
  mainWindow.loadFile(path.join(__dirname, 'renderer/login.html'));

  console.log('[Main] Opening DevTools...');
  // Auto-open DevTools in dev for debugging
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('[Renderer] Load failed:', code, desc);
  });

  mainWindow.webContents.on('console-message', (e, level, msg) => {
    console.log('[Renderer]', msg);
  });


  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ── Update Downloader IPC ──
const downloadFile = (url, filename, event) => {
  const tempPath = path.join(app.getPath('temp'), filename);
  const file = fs.createWriteStream(tempPath);

  const options = {
    headers: {
      'User-Agent': 'TransportSystem/1.0'
    }
  };

  https.get(url, options, (response) => {
    // Handle Redirection
    if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 303 || response.statusCode === 307) {
      file.close();
      fs.unlink(tempPath, () => {});
      const redirectUrl = new URL(response.headers.location, url).href;
      downloadFile(redirectUrl, filename, event);
      return;
    }

    if (response.statusCode !== 200) {
      event.reply('download-error', `Server returned status ${response.statusCode}`);
      return;
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;

    response.on('data', (chunk) => {
      downloaded += chunk.length;
      file.write(chunk);
      
      if (!isNaN(totalSize) && totalSize > 0) {
        const percent = Math.round((downloaded / totalSize) * 100);
        event.reply('download-progress', percent);
      }
    });

    response.on('end', () => {
      file.end();
      event.reply('download-complete', tempPath);
    });

    response.on('error', (err) => {
      file.close();
      fs.unlink(tempPath, () => {});
      event.reply('download-error', err.message);
    });
  }).on('error', (err) => {
    file.close();
    fs.unlink(tempPath, () => {});
    event.reply('download-error', err.message);
  });
};

ipcMain.on('download-update', (event, { url, filename }) => {
  downloadFile(url, filename, event);
});

ipcMain.on('install-update', (event, filePath) => {
  // Open installer (DMG on Mac, EXE on Windows)
  shell.openPath(filePath);
  setTimeout(() => { app.exit(0); }, 1000);
});

// ── Restart & Install (called by our custom UI button) ──
ipcMain.on('restart-and-install', () => {
  console.log('[Main] restart-and-install requested');
  app.isUpdating = true;

  // Remove window-all-closed so app doesn't quit before installer runs
  app.removeAllListeners('window-all-closed');

  // Force-destroy every window to release file locks
  BrowserWindow.getAllWindows().forEach(w => {
    try {
      w.removeAllListeners('close');
      w.setClosable(true);
      w.destroy();
    } catch (e) { /* ignore */ }
  });

  // Give Windows 1.5s to release file handles, then launch installer
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (e) {
      console.error('quitAndInstall failed, force exiting:', e);
    }
    // Last-resort: force exit after another second
    setTimeout(() => app.exit(0), 1000);
  }, 1500);
});

function openAdminPanel() {
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 800,
    minHeight: 560,
    title: 'DHILLON ROADLINES — Admin Panel',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  adminWindow.loadFile(path.join(__dirname, 'admin-app/admin-index.html'));
  adminWindow.on('closed', () => { adminWindow = null; });
}

// ── App Menu ──
function buildMenu() {
  const template = [
    {
      label: 'App',
      submenu: [
        { label: '🔐 Admin Panel', accelerator: 'CmdOrCtrl+Shift+A', click: openAdminPanel },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: (_, win) => win && win.reload() },
        { label: 'Toggle DevTools', accelerator: 'F12', click: (_, win) => win && win.webContents.toggleDevTools() },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

console.log('[Main] Registering app ready handler...');
app.whenReady().then(() => {
  console.log('[Main] App is ready! Creating window...');
  buildMenu();
  createWindow();

  // Shortcut backup
  globalShortcut.register('CommandOrControl+Shift+A', openAdminPanel);

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Setup auto-updater (if available)
  if (autoUpdater) {
    autoUpdater.autoDownload = true;

    autoUpdater.on('checking-for-update', () => {
      console.log('AutoUpdater: checking for update...');
      if (mainWindow) mainWindow.webContents.send('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('AutoUpdater: update available', info);
      if (mainWindow) mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('AutoUpdater: no update available');
      if (mainWindow) mainWindow.webContents.send('update-not-available');
    });

    autoUpdater.on('error', (err) => {
      console.error('AutoUpdater error', err);
      if (mainWindow) mainWindow.webContents.send('update-error', err == null ? 'unknown' : (err.stack || err).toString());
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (mainWindow) mainWindow.webContents.send('update-download-progress', progressObj);
      console.log(`AutoUpdater: download ${Math.round(progressObj.percent)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('AutoUpdater: update downloaded', info);
      // Send to our CUSTOM renderer UI — do NOT use native dialog
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // Delay first check slightly so UI has time to show
    setTimeout(() => {
      try {
        // Use checkForUpdates() — NOT checkForUpdatesAndNotify()
        // checkForUpdatesAndNotify shows native OS dialog which conflicts with our UI
        autoUpdater.checkForUpdates();
      } catch (e) {
        console.error('autoUpdater.checkForUpdates failed:', e);
      }
    }, 5000);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
