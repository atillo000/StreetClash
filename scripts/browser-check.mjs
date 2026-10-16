import { readFile, writeFile } from 'node:fs/promises';

const tabs = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
const tab = tabs.find(t => t.url.includes(process.env.GAME_URL || '127.0.0.1:8123'));
if (!tab) throw new Error('Open the game in the Chrome debugging session first');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const browserErrors = [];
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    browserErrors.push(msg.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
  }
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
  await send('Runtime.enable');
  if (process.argv[2]?.startsWith('@')) {
    const ready = await send('Runtime.evaluate', { expression: "(async()=>{for(let i=0;i<300&&!window.__ready;i++){const error=document.getElementById('errmsg')?.textContent;if(error)return{error};await new Promise(r=>setTimeout(r,100));}return{ready:!!window.__ready};})()", awaitPromise: true, returnByValue: true });
    if (!ready.result?.value?.ready) throw new Error(JSON.stringify(ready.result?.value));
  }
  if (process.argv.includes('--gesture')) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'F2', code: 'F2', windowsVirtualKeyCode: 113 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'F2', code: 'F2', windowsVirtualKeyCode: 113 });
  }
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  if (browserErrors.length) throw new Error(browserErrors.join('\n'));
  console.log(JSON.stringify(result.result.value, null, 2));
  if (process.argv[3] && !process.argv[3].startsWith('--')) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.argv[3], Buffer.from(shot.data, 'base64'));
  }
  if (result.result.value?.passed === false) process.exitCode = 1;
} finally { ws.close(); }
