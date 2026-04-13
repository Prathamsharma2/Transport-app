Transport App
=============

This repo contains the Electron desktop app and a scaffolded Node.js API server under `server/`.

Quick start (local)

- Install deps and run the desktop app:

```bash
cd "/Users/prathamsharma/Documents/test applications/transport-system/transport-app"
npm install
npm start
```

Server (optional) and migration

See `server/README.md` for API server and migration instructions.

Running the Desktop App (don't open the HTML in a browser)

- To run the desktop app during development use Electron (this opens a native window). From the project root:

  ```bash
  cd "/Users/prathamsharma/Documents/test applications/transport-system/transport-app"
  npm install
  npm start
  ```

- Do NOT open `index.html` or `login.html` directly in Safari or another browser — the app is an Electron desktop app and must be launched via Electron so Node features and native menus work.

Building a macOS app bundle

- To package a macOS application (creates a .app inside `dist/`), run:

  ```bash
  npm run package:mac
  ```

  This uses `electron-packager` to produce a macOS app. After packing you can open the generated `.app` from Finder or run it directly.

If you prefer an installer (DMG) or Windows/.exe builds, use `electron-builder` or run packaging on the target OS (or CI).
