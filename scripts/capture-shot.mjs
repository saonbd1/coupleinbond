// Temporary preview helper: captures a screenshot with Chrome DevTools Protocol
// so the viewport can be emulated exactly (headless --window-size clamps the
// viewport to 500px, which crops the saved image and fakes mobile clipping).
//
// Usage:
//   node scripts/capture-shot.mjs <url> <out.png> [width] [height] [fullPage]
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const [url, out, wArg, hArg, fullArg] = process.argv.slice(2);
const width = Number(wArg || 390);
const height = Number(hArg || 900);
const fullPage = fullArg === 'true';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222 + Math.floor(Math.random() * 400);

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + process.env.TEMP + '\\cline-shot-' + PORT,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not become available');
}

let msgId = 0;
const pending = new Map();

function send(ws, method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

try {
  const wsUrl = await findTarget();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });

  await send(ws, 'Page.enable');
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });

  await send(ws, 'Page.navigate', { url });
  await sleep(2500);

  const metrics = await send(ws, 'Page.getLayoutMetrics');
  const contentHeight = Math.ceil(metrics.cssContentSize.height);
  const viewportHeight = fullPage ? contentHeight : height;

  if (fullPage) {
    await send(ws, 'Emulation.setDeviceMetricsOverride', {
      width,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(600);
  }

  const shot = await send(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
  });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('saved ' + out + ' (' + width + 'x' + viewportHeight + ')');

  ws.close();
} finally {
  chrome.kill();
}
