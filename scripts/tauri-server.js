#!/usr/bin/env node
/**
 * Minimal static file server for Tauri dev mode.
 * Serves the Next.js static export from `out/` with correct MIME types.
 * Designed to be reliable in WebKit/Android WebViews.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 1420 is Tauri's conventional dev-server port and avoids colliding with the
// web app's regular `npm run dev` server on port 3000.
const PORT = Number.parseInt(process.env.TAURI_DEV_PORT || '1420', 10);
const HOST = process.env.TAURI_DEV_SERVER_HOST || '0.0.0.0';
const OUT_DIR = path.join(__dirname, '..', 'out');

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[tauri-server] Invalid TAURI_DEV_PORT: ${process.env.TAURI_DEV_PORT}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  console.error(`[tauri-server] Static export not found in ${OUT_DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function resolveFilePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }

  // Resolve from a synthetic root and then remove the leading separator. This
  // keeps absolute URL paths inside OUT_DIR and rejects traversal attempts.
  const relativePath = path.normalize(`/${decoded}`).replace(/^[/\\]+/, '');
  const filePath = path.resolve(OUT_DIR, relativePath);
  if (filePath !== OUT_DIR && !filePath.startsWith(`${OUT_DIR}${path.sep}`)) {
    return null;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) return indexPath;
  }

  if (!fs.existsSync(filePath)) {
    const htmlPath = `${filePath}.html`;
    if (fs.existsSync(htmlPath)) return htmlPath;
  }

  if (!fs.existsSync(filePath)) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) return indexPath;
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url || '/');

  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Serve the root page as a fallback for client-side routes.
      const indexPage = path.join(OUT_DIR, 'index.html');
      fs.readFile(indexPage, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(indexData);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[tauri-server] Port ${PORT} is already in use. Stop the process using it ` +
      `or set matching TAURI_DEV_PORT/build.devUrl values.`,
    );
  } else {
    console.error(`[tauri-server] Failed to start: ${error.message}`);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[tauri-server] Serving ${OUT_DIR} on http://${HOST}:${PORT}`);
});
