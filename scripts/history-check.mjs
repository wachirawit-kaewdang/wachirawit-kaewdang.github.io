// Checks Back and Forward between the home page and Appendix A in a real browser: Back returns to
// the reading place with focus on the link followed, and Forward returns to the appendix place.
// Run after a build: npm run history-check (npm run verify runs it).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';
import { findChrome } from './chrome.mjs';

// Node 20 has WebSocket only behind a flag, so the script restarts itself with it there.
if (!globalThis.WebSocket) {
  const child = spawn(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  await main();
}

async function main() {
  const port = 4181;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const profile = mkdtempSync(join(tmpdir(), 'history-check-'));
  const server = await preview({ logLevel: 'silent', preview: { port, strictPort: true } });
  // GitHub's Linux runners don't allow Chrome's sandbox. This only loads the site just built.
  const chrome = spawn(findChrome(), [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`,
    '--remote-debugging-port=0', 'about:blank',
  ], { stdio: 'ignore' });
  const failures = [];
  let socket;
  try {
    // Chrome writes the port it chose into the profile.
    const portFile = join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 80 && !existsSync(portFile); i++) await wait(250);
    const debugPort = readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    };
    const send = (method, params = {}) => new Promise((done, fail) => {
      pending.set(++id, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : done(m.result)));
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    const step = async (delta) => {
      const { currentIndex, entries } = await send('Page.getNavigationHistory');
      await send('Page.navigateToHistoryEntry', { entryId: entries[currentIndex + delta].id });
      await wait(1200);
    };
    const state = () => evaluate(`(() => {
      const a = document.activeElement, r = a.getBoundingClientRect();
      return { top: Math.round(scrollY), appendix: !!document.getElementById('appendix-title'),
        focusInView: a !== document.body && r.bottom > 0 && r.top < innerHeight, focus: (a.textContent || '').trim().slice(0, 40) };
    })()`);

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: `http://localhost:${port}/` });
    await wait(2000);

    // Follow the first cross-reference into the appendix from partway down the page.
    const link = await evaluate(`(async () => {
      const a = document.querySelector('.seealso a');
      a.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 500));
      const top = Math.round(scrollY), text = a.textContent.trim().slice(0, 40);
      a.click();
      return { top, text };
    })()`);
    await wait(1000);
    const deep = await evaluate(`(async () => {
      scrollTo({ top: 3000, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 800));
      return Math.round(scrollY);
    })()`);

    await step(-1);
    const back = await state();
    if (back.appendix) failures.push('Back from the appendix stayed on the appendix');
    if (Math.abs(back.top - link.top) > 40) failures.push(`Back returned to ${back.top}px, not the reading place at ${link.top}px`);
    if (back.focus !== link.text) failures.push(`Back put focus on “${back.focus}”, not the link followed (“${link.text}”)`);

    await step(1);
    const forward = await state();
    if (!forward.appendix) failures.push('Forward did not return to the appendix');
    if (Math.abs(forward.top - deep) > 40) failures.push(`Forward returned to ${forward.top}px, not the appendix place at ${deep}px`);
    if (!forward.focusInView) failures.push('Forward left focus off screen');
  } catch (error) {
    failures.push(`the browser check could not run: ${error.message.split('\n')[0]}`);
  } finally {
    socket?.close();
    chrome.kill();
    await new Promise((done) => server.httpServer.close(done));
    await wait(300);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {
      // A locked temp folder is left for the OS; it must not hide the result.
    }
  }

  if (failures.length) {
    console.error(failures.map((f) => `✗ ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('✓ Back and Forward between the pages return to the reading place and the link followed');
}
