import { readFile, writeFile } from 'node:fs/promises';

const tabs = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
const tab = tabs.find(t => t.url.includes('127.0.0.1:8123'));
if (!tab) throw new Error('Open the game in the Chrome debugging session first');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, msg => msg.error ? reject(msg.error) : resolve(msg.result));
    ws.send(JSON.stringify({ id: key, method, params }));
  });
}
const expression = process.argv[2]?.startsWith('@')
  ? await readFile(process.argv[2].slice(1), 'utf8')
  : process.argv[2] || '({ready:window.__ready,error:document.getElementById("errmsg").textContent})';
try {
  if (process.argv.includes('--gesture')) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'F2', code: 'F2', windowsVirtualKeyCode: 113 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'F2', code: 'F2', windowsVirtualKeyCode: 113 });
  }
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  console.log(JSON.stringify(result.result.value, null, 2));
  if (process.argv[3] && !process.argv[3].startsWith('--')) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.argv[3], Buffer.from(shot.data, 'base64'));
  }
  if (result.result.value?.passed === false) process.exitCode = 1;
} finally { ws.close(); }
