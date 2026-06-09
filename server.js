const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = parseInt(process.env.PORT || '3000', 10);
const BACKEND_URL = process.env.BACKEND_URL || '';
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '5000', 10);

function proxyToBackend(req, res) {
  let lib = http;
  let options;

  if (BACKEND_URL) {
    const backend = new URL(BACKEND_URL);
    lib = backend.protocol === 'https:' ? https : http;
    options = {
      hostname: backend.hostname,
      port: backend.port || (backend.protocol === 'https:' ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: backend.host }
    };
  } else {
    options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` }
    };
  }

  const proxyReq = lib.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Backend unavailable. Start the full app with: npm start'
    }));
  });

  req.pipe(proxyReq, { end: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    proxyToBackend(req, res);
    return;
  }
  
  // Default to index.html
  if (pathname === '/') {
    pathname = '/index (1).html';
  }
  
  const filePath = path.join(__dirname, pathname);
  const ext = path.parse(filePath).ext;
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - serve index.html for SPA routing
        fs.readFile(path.join(__dirname, 'index (1).html'), (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    }
  });
});

server.listen(port, () => {
  console.log(`CineMatch frontend running at http://localhost:${port}`);
  console.log(`API requests proxied to http://${BACKEND_HOST}:${BACKEND_PORT}`);
});
