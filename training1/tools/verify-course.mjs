// Opens every module of the course in headless Chrome, presses every simulator control and reports JavaScript
// errors, failed simulators, missing quizzes and broken diagrams.
// Usage: node tools/verify-course.mjs  (needs Google Chrome; Node 22+ for the global WebSocket)
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + Math.floor(Math.random() * 600);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ids = readdirSync(join(ROOT, 'assets/modules')).sort()
  .map((f) => readFileSync(join(ROOT, 'assets/modules', f), 'utf8').match(/id: '([^']+)'/)[1]);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'course-'))}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());
process.on('uncaughtException', (e) => { console.error(e.message); process.exit(2); });

let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(200); }
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, fail) => {
  ws.addEventListener('open', ok);
  ws.addEventListener('error', () => fail(new Error('Cannot connect to Chrome DevTools')));
  setTimeout(() => fail(new Error('Timed out connecting to Chrome DevTools')), 10000);
});
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.description || a.value).join(' '));
});
const send = (method, params = {}) => new Promise((r, fail) => {
  const id = ++seq;
  pending.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => pending.has(id) && fail(new Error(`${method} timed out`)), 60000);
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.result.value;

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: `file://${ROOT}/index.html` });
await sleep(1500);
await evaluate('window.confirm = () => false; true');

let failures = 0;
for (const id of ids) {
  errors.length = 0;
  await evaluate(`location.hash = '${id}'; true`);
  await sleep(500);
  const report = await evaluate(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const content = document.querySelector('main .content');
    const problems = [];
    content.querySelectorAll('.verdict.bad').forEach((v) => { if (/Simulator failed|Unknown simulator/.test(v.textContent)) problems.push(v.textContent); });
    if (/Quiz not found/.test(content.textContent)) problems.push('quiz not found');
    await Promise.all([...content.querySelectorAll('figure.diagram img')].map((img) => {
      img.loading = 'eager';
      return Promise.race([img.decode(), sleep(5000).then(() => { throw new Error('timeout'); })])
        .catch(() => problems.push('broken image ' + img.getAttribute('src')));
    }));
    const sims = [...content.querySelectorAll('[data-sim]')];
    let clicks = 0;
    for (const sim of sims) {
      for (const sel of [...sim.querySelectorAll('select')]) {
        for (let i = 0; i < sel.options.length; i++) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change')); clicks++; }
      }
      for (let pass = 0; pass < 2; pass++) {
        for (const b of [...sim.querySelectorAll('button, .item, .bin, input[type=checkbox]')]) {
          if (!b.isConnected) continue;
          b.click(); clicks++;
          await sleep(5);
        }
      }
    }
    await sleep(600);
    return { sims: sims.map((s) => s.dataset.sim), quizzes: content.querySelectorAll('[data-quiz] .q').length, figures: content.querySelectorAll('figure.diagram').length, clicks, problems };
  })()`);
  await sleep(300);
  const bad = report.problems.length + errors.length;
  failures += bad ? 1 : 0;
  console.log(`${bad ? 'FAIL' : ' ok '}  ${id.padEnd(18)} sims=${report.sims.join(',') || '-'} quiz=${report.quizzes} figs=${report.figures} interactions=${report.clicks}`);
  for (const p of [...report.problems, ...errors]) console.log(`        ${String(p).split('\n').slice(0, 3).join(' | ')}`);
}
ws.close();
chrome.kill();
console.log(failures ? `\n${failures} module(s) with problems` : `\nAll ${ids.length} modules render and every simulator survives being clicked.`);
process.exit(failures ? 1 : 0);
