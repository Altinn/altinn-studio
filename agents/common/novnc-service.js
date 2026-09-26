#!/usr/bin/env node
// Serves noVNC and bridges its WebSocket to the desktop's Unix socket, so a person can open the
// Agent's screen in a browser with nothing installed.
//
// The image ships this program's unit disabled. agentd enables it when the Agent declares
// `access: [{type: vnc}]` and disables it when the Agent stops declaring it.
'use strict';

const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');

/** Reads a setting the unit must provide, so the unit stays the only place that names it. */
function required(name) {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`novnc: ${name} is not set; run this through agent-vnc-web.service\n`);
    process.exit(1);
  }
  return value;
}

const root = process.env.AGENT_NOVNC_ROOT || '/usr/local/share/novnc';
const socketPath = required('AGENT_DESKTOP_SOCKET');
const host = process.env.AGENT_NOVNC_HOST || '127.0.0.1';
const port = Number(required('AGENT_NOVNC_PORT'));

// resize=scale keeps the scaling in the viewer. resize=remote would ask the X server to match the
// browser window, which would move the Agent's own display off the geometry its screenshots and
// coordinates are sized for.
const VIEWER = '/vnc.html?autoconnect=1&resize=scale&reconnect=1&path=websockify';

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff2', 'font/woff2'],
]);

/** Resolves a request path inside the served directory: null when it escapes, undefined when malformed. */
function resolve(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split('?')[0]);
  } catch {
    // A malformed escape must not take down the viewer every open browser shares.
    return undefined;
  }
  // A NUL byte is valid in a URL but not in a file path, and fs throws on it rather than failing.
  if (decoded.includes('\0')) return undefined;
  const resolved = path.resolve(root, `.${path.posix.normalize(decoded)}`);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

/**
 * Whether a WebSocket upgrade comes from a page this server served.
 *
 * The desktop has no VNC password, so a bridge open to any origin would hand any website the
 * person has open the screen, keyboard and pointer. The viewer may be reached at an address other
 * than loopback, such as a tailnet name, so the check is same-origin rather than an allowlist:
 * the page's origin must name the host and port the request was sent to.
 */
function sameOrigin(request) {
  const { origin, host } = request.headers;
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && url.host === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  if (request.url === '/' || request.url === '') {
    response.writeHead(302, { location: VIEWER }).end();
    return;
  }
  const file = resolve(request.url);
  if (file === undefined) {
    response.writeHead(400).end();
    return;
  }
  if (file === null) {
    response.writeHead(403).end();
    return;
  }
  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': CONTENT_TYPES.get(path.extname(file)) || 'application/octet-stream',
      'content-length': stats.size,
      // The viewer is the Agent's live screen; a cached copy of it is never right.
      'cache-control': 'no-store',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(file)
      .on('error', () => response.destroy())
      .pipe(response);
  });
}

const server = http.createServer((request, response) => {
  // One bad request must never take down the viewer every open browser shares.
  try {
    serve(request, response);
  } catch (error) {
    process.stderr.write(`novnc: ${request.method} ${request.url} failed: ${error.message}\n`);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});

const sockets = new WebSocketServer({
  server,
  path: '/websockify',
  // noVNC offers `binary` for compatibility with older proxies and expects it echoed when it does.
  handleProtocols: (offered) => (offered.has('binary') ? 'binary' : false),
  verifyClient: ({ req }) => sameOrigin(req),
});

sockets.on('connection', (socket) => {
  const display = net.connect(socketPath);
  let drain;
  const close = () => {
    clearInterval(drain);
    display.destroy();
    if (socket.readyState === socket.OPEN) socket.close();
  };
  display.on('data', (chunk) => {
    socket.send(chunk);
    // Let the display wait while a slow viewer catches up rather than buffering without bound.
    if (socket.bufferedAmount > 1 << 20) {
      display.pause();
      clearInterval(drain);
      drain = setInterval(() => {
        if (socket.bufferedAmount <= 1 << 20) {
          clearInterval(drain);
          display.resume();
        }
      }, 20);
    }
  });
  display.on('error', (error) => {
    process.stderr.write(`novnc: cannot reach the desktop at ${socketPath}: ${error.message}\n`);
    close();
  });
  display.on('close', close);
  socket.on('message', (data) => display.write(data));
  socket.on('close', close);
  socket.on('error', close);
});

server.listen(port, host, () => {
  process.stdout.write(
    `novnc: serving ${root} on http://${host}:${port}${VIEWER} for ${socketPath}\n`,
  );
});
