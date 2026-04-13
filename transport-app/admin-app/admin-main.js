const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0b0d14',
    title: 'Dhillon Roadlines — Superadmin Console',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'admin-login.html'));
  
  // mainWindow.webContents.openDevTools(); // Debug only

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App Menu
function buildMenu() {
  const template = [
    {
      label: 'Admin',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: (_, win) => win && win.reload() },
        { label: 'Toggle DevTools', accelerator: 'F12', click: (_, win) => win && win.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
