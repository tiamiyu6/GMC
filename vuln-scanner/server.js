// Zero-dependency local web app: serves the dashboard UI and runs scans on
// demand. Deliberately built on Node core modules only — `node server.js`
// is the entire setup, nothing to `npm install`.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { runScan } = require('./scanner.js');

const PORT = Number(process.env.PORT) || 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// --- Basic per-IP rate limiting -------------------------------------
// This tool makes outbound requests to whatever URL a caller supplies.
// Left completely open, a publicly reachable copy of this server would
// itself become a handy DDoS/scanning proxy. Keep it modest and local-use
// shaped: a handful of scans per window per source IP.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SCANS_PER_WINDOW = 8;
const scanLog = new Map(); // ip -> timestamps[]

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (scanLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  scanLog.set(ip, hits);
  return hits.length > MAX_SCANS_PER_WINDOW;
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const ext = path.extname(full);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' }).end(data);
  });
}

function handleScan(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const target = parsed.searchParams.get('url');
  const consent = parsed.searchParams.get('consent');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': 'null',
  });
  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  if (isRateLimited(clientIp(req))) {
    send('error', { message: `Rate limit reached: max ${MAX_SCANS_PER_WINDOW} scans per 15 minutes from this machine. Try again shortly.` });
    return res.end();
  }
  if (consent !== '1') {
    send('error', { message: 'Scan not authorized: you must confirm you own the target or have explicit permission to test it.' });
    return res.end();
  }
  if (!target) {
    send('error', { message: 'Missing url parameter.' });
    return res.end();
  }

  console.log(`[scan] ${new Date().toISOString()} ip=${clientIp(req)} target=${target}`);

  let ended = false;
  const done = () => { ended = true; };
  req.on('close', done);

  runScan(target, {
    onEvent: (event) => {
      if (ended) return;
      send(event.type, event);
    },
  })
    .catch((err) => {
      if (ended) return;
      send('error', { message: err.message || String(err) });
    })
    .finally(() => {
      if (!ended) res.end();
    });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/scan')) {
    return handleScan(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Vulnerability scanner running at http://localhost:${PORT}`);
  console.log('Only scan sites you own or are explicitly authorized to test.');
});
