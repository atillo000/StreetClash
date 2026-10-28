import http from 'node:http';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 8080);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8' };
const clients = new Set();
let revision = Date.now();
let reloadTimer;
const changed = new Set();
const watchedTypes = new Set(['.html', '.css', '.js', '.mjs', '.json', '.glb', '.gltf', '.png', '.jpg', '.jpeg', '.webp', '.ogg', '.mp3', '.wav']);

function broadcast(res) {
  res.write(`data: ${JSON.stringify({ revision })}\n\n`);
}

function changedFile(file) {
  if (!watchedTypes.has(path.extname(file).toLowerCase())) return;
  changed.add(file);
  clearTimeout(reloadTimer);
  // Coalesce editor rename/write events and allow generated assets to finish saving.
  reloadTimer = setTimeout(() => {
    revision++;
    console.log(`Reload: ${[...changed].join(', ')}`);
    changed.clear();
    for (const res of clients) broadcast(res);
  }, file.startsWith('assets/') ? 750 : 250);
}

// Watch source folders, not node_modules, .git, builds or archived source packs.
const watchers = [watch(root, (_, name) => {
  if (name === 'index.html') changedFile(name);
})];
for (const directory of ['src', 'assets']) {
  try {
    const watcher = watch(path.join(root, directory), { recursive: true }, (_, name) => {
      if (name) changedFile(`${directory}/${String(name).replaceAll('\\', '/')}`);
    });
    watcher.on('error', error => console.error(`Live reload watcher (${directory}): ${error.message}`));
    watchers.push(watcher);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// Injected by this development server only; index.html and production builds stay clean.
const clientScript = `(() => {
  const stream = new EventSource('/__streetclash/events');
  let revision;
  stream.onmessage = event => {
    const next = JSON.parse(event.data).revision;
    if (revision !== undefined && next !== revision) location.reload();
    revision = next;
  };
  window.addEventListener('pagehide', () => stream.close(), { once: true });
})();`;

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/__streetclash/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive' });
      clients.add(res); broadcast(res);
      const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15000);
      res.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
      return;
    }
    if (pathname === '/__streetclash/live.js') {
      res.setHeader('Content-Type', 'text/javascript'); res.end(clientScript); return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let data = await readFile(file);
    const extension = path.extname(file);
    // Exporting a fighter writes watched assets; do not interrupt preparation.
    if (extension === '.html' && !pathname.startsWith('/scripts/prepare')) {
      data = data.toString('utf8').replace(/<\/body>/i, '<script src="/__streetclash/live.js" defer></script></body>');
      // Minimal preparation pages may omit a closing body tag.
      if (!data.includes('src="/__streetclash/live.js"')) data += '<script src="/__streetclash/live.js" defer></script>';
    }
    res.setHeader('Content-Type', types[extension] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});

function stop() {
  clearTimeout(reloadTimer);
  for (const watcher of watchers) watcher.close();
  for (const res of clients) res.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Stop the existing server with Ctrl+C, then run npm start again.`
    : error.message);
  for (const watcher of watchers) watcher.close();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Street Clash: http://127.0.0.1:${port}\nLive reload enabled: save code, styles or runtime assets to reload the browser.`));
