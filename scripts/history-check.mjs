// Checks Back and Forward between the home page and Appendix A in a real browser: Back returns to
// the reading place with focus on the link followed, and Forward returns to the appendix place.
// Run after a build: npm run history-check (npm run verify runs it).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromeFlags, withSite } from './chrome.mjs';

// Node 20 has WebSocket only behind a flag, so the script restarts itself with it there.
if (!globalThis.WebSocket) {
  const child = spawn(process.execPath, ['--experimental-websocket', ...process.argv.slice(1)], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  const failures = await withSite('history-check', check);
  if (failures.length) {
    console.error(failures.map((f) => `✗ ${f}`).join('\n'));
    process.exit(1);
  }
  console.log('✓ Back and Forward between the pages return to the reading place and the link followed');
}

async function check({ chrome: path, profile, url }) {
  const failures = [];
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  // Chrome's own messages are kept, so a crash says why instead of only "no port file".
  let chromeSaid = '';
  const chrome = spawn(path, [...chromeFlags(profile), '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', (chunk) => { chromeSaid = (chromeSaid + chunk).slice(-2000); });
  let socket;
  try {
    // Chrome writes the port it chose into the profile.
    const portFile = join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 80 && !existsSync(portFile); i++) await wait(250);
    if (!existsSync(portFile)) {
      throw new Error(`Chrome did not start: ${chromeSaid.trim().split('\n').at(-1) || `exit code ${chrome.exitCode}`}`);
    }
    const debugPort = readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`, { signal: AbortSignal.timeout(10_000) })).json();
    socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      const timer = setTimeout(() => fail(new Error('Chrome did not open the debugging connection within 10 s')), 10_000);
      socket.onopen = () => { clearTimeout(timer); done(); };
      socket.onerror = () => { clearTimeout(timer); fail(new Error('the connection to Chrome failed')); };
    });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    };
    // If Chrome stops answering or the connection drops, every waiting call fails instead of
    // hanging until CI's 10-minute limit.
    const dropAll = (why) => {
      for (const settle of pending.values()) settle({ error: { message: why } });
      pending.clear();
    };
    socket.onclose = () => dropAll(`Chrome closed the connection${chromeSaid ? `: ${chromeSaid.trim().split('\n').at(-1)}` : ''}`);
    socket.onerror = () => dropAll('the connection to Chrome failed');
    const send = (method, params = {}) => new Promise((done, fail) => {
      const callId = ++id;
      const timer = setTimeout(() => {
        pending.delete(callId);
        fail(new Error(`${method}: Chrome did not answer within 10 s`));
      }, 10_000);
      pending.set(callId, (m) => {
        clearTimeout(timer);
        if (m.error) fail(new Error(`${method}: ${m.error.message}`));
        else done(m.result);
      });
      socket.send(JSON.stringify({ id: callId, method, params }));
    });
    const evaluate = async (expression) =>
      (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    // Waits by checking, not by fixed sleeps, so a slow machine only takes longer: until `ready`
    // holds and the scroll position stays put for three reads in a row, at most 10 seconds.
    const settle = async (ready) => {
      let last = null;
      let same = 0;
      for (let i = 0; i < 100; i++) {
        const now = await evaluate(`(${ready}) ? Math.round(scrollY) : null`);
        same = now !== null && now === last ? same + 1 : 0;
        if (same >= 2) return true;
        last = now;
        await wait(100);
      }
      return false;
    };
    const onAppendix = "!!document.getElementById('appendix-title')";
    const step = async (delta, ready) => {
      const { currentIndex, entries } = await send('Page.getNavigationHistory');
      await send('Page.navigateToHistoryEntry', { entryId: entries[currentIndex + delta].id });
      if (!(await settle(ready))) failures.push(`the page did not settle after ${delta < 0 ? 'Back' : 'Forward'}`);
    };
    const state = () => evaluate(`(() => {
      const a = document.activeElement, r = a.getBoundingClientRect();
      return { top: Math.round(scrollY), appendix: ${onAppendix},
        focusInView: a !== document.body && r.bottom > 0 && r.top < innerHeight, focus: (a.textContent || '').trim().slice(0, 40) };
    })()`);

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: `${url}/` });
    // The pre-rendered page already has the link, so also wait for the scripts to finish loading.
    if (!(await settle("document.readyState === 'complete' && !!document.querySelector('.seealso a')"))) {
      throw new Error('the home page did not load');
    }
    await wait(300);

    // Follow the first cross-reference into the appendix from partway down the page.
    const link = await evaluate(`(async () => {
      const a = document.querySelector('.seealso a');
      a.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 300));
      const top = Math.round(scrollY), text = a.textContent.trim().slice(0, 40);
      a.click();
      return { top, text };
    })()`);
    if (!(await settle(onAppendix))) throw new Error('following the cross-reference did not open the appendix');
    await evaluate("scrollTo({ top: 3000, behavior: 'instant' })");
    await settle(onAppendix);
    // The place is saved on a 250 ms throttle while scrolling, so give it time to be written.
    await wait(400);
    const deep = await evaluate('Math.round(scrollY)');

    await step(-1, `!${onAppendix}`);
    const back = await state();
    if (back.appendix) failures.push('Back from the appendix stayed on the appendix');
    if (Math.abs(back.top - link.top) > 40) failures.push(`Back returned to ${back.top}px, not the reading place at ${link.top}px`);
    if (back.focus !== link.text) failures.push(`Back put focus on “${back.focus}”, not the link followed (“${link.text}”)`);

    await step(1, onAppendix);
    const forward = await state();
    if (!forward.appendix) failures.push('Forward did not return to the appendix');
    if (Math.abs(forward.top - deep) > 40) failures.push(`Forward returned to ${forward.top}px, not the appendix place at ${deep}px`);
    if (!forward.focusInView) failures.push('Forward left focus off screen');

    // The name in the running head goes home, to the top, with no "section doesn't exist" notice.
    await evaluate("document.querySelector('.runhead-name').click()");
    if (!(await settle(`!${onAppendix}`))) failures.push('the name in the running head did not leave the appendix');
    await wait(300);
    const home = await evaluate(`({ top: Math.round(scrollY), notice: document.querySelector('.notice')?.textContent.trim() ?? '' })`);
    if (home.notice) failures.push(`the name in the running head showed a notice: “${home.notice.slice(0, 60)}”`);
    if (home.top > 40) failures.push(`the name in the running head landed at ${home.top}px, not the top`);

  } catch (error) {
    failures.push(`the browser check could not run: ${error.message.split('\n')[0]}`);
  } finally {
    socket?.close();
    chrome.kill();
    // Chrome must have exited before withSite removes its profile.
    if (chrome.exitCode === null) await new Promise((done) => { chrome.once('exit', done); setTimeout(done, 3000); });
  }
  return failures;
}
