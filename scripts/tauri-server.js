#!/usr/bin/env node
/**
 * Minimal static file server for Tauri dev mode.
 * Serves the Next.js static export from `out/` with correct MIME types.
 * Designed to be reliable in WebKit/Android WebViews.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const OUT_DIR = path.join(__dirname, '..', 'out');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.otf':  'font/otf',
  '.wav':  'audio/wav',
  '.mp3':  'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.map':  'application/json',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function resolveFilePath(urlPath) {
  // Decode URI components (e.g., %5B -> [)
  let decoded = decodeURIComponent(urlPath);

  // Remove query string
  decoded = decoded.split('?')[0];

  // Security: prevent path traversal
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(OUT_DIR, safePath);

  // If the path points to a directory, try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  // If the file doesn't exist, try appending .html (Next.js pretty URLs)
  if (!fs.existsSync(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      return htmlPath;
    }
  }

  // If still not found, try with /index.html (trailing slash pages)
  if (!fs.existsSync(filePath)) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return filePath; // Return even if it doesn't exist (will 404)
}

const server = http.createServer((req, res) => {
  const filePath = resolveFilePath(req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 404 — serve index.html as fallback (SPA-like behavior for client routing)
      const indexPage = path.join(OUT_DIR, 'index.html');
      fs.readFile(indexPage, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[tauri-server] Serving ${OUT_DIR} on http://0.0.0.0:${PORT}`);
});

