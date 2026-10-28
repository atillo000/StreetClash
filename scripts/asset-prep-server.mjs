import http from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const folder = path.resolve('assets/characters/generated');
await mkdir(folder, { recursive: true });
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  const match = /^\/(capoeira|magic|soldier|archer|greatsword|axe|mutant|paladin|zombie|chupacabra|avatar)\.(glb|json)$/.exec(req.url);
  if (req.method !== 'POST' || !match) { res.writeHead(404).end(); return; }
  try {
    const chunks = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 40 * 1024 * 1024) throw new Error('Asset too large'); chunks.push(chunk); }
    await writeFile(path.join(folder, `${match[1]}.${match[2]}`), Buffer.concat(chunks));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ bytes: length }));
  } catch (e) { res.writeHead(400).end(e.message); }
}).listen(8124, '127.0.0.1', () => console.log('Local fighter preparation receiver on 8124'));
