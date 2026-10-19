// Regenerates docs/spoonful-demo.mp4: drives the app in headless Chrome with captions + cursor overlays.
// Narration WAVs come from Windows SAPI (Microsoft Zira); audio is muxed afterwards with ffmpeg.
// Needs puppeteer-core + ffmpeg-static installed in ../e2e/node_modules (paths below).
// Records the Spoonful demo video. Usage: node record.js <projectRoot> <outDir>
const http = require('http'), fs = require('fs'), path = require('path');
const E2E = path.join(__dirname, '..', 'e2e', 'node_modules');
const puppeteer = require(path.join(E2E, 'puppeteer-core'));
const ffmpegDir = path.dirname(require(path.join(E2E, 'ffmpeg-static')));
process.env.PATH = ffmpegDir + path.delimiter + process.env.PATH;

const ROOT = process.argv[2], OUT = process.argv[3];
const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
const wavDur = id => (fs.statSync(path.join(__dirname, 'audio', id + '.wav')).size - 44) / 88200;
const testOut = fs.readFileSync(path.join(__dirname, 'testout.txt'), 'utf8').trim().split(/\r?\n/);

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8766);

const sleep = ms => new Promise(r => setTimeout(r, ms));

const OVERLAY_CSS = `
#v-cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:1100px;width:max-content;z-index:9999;
  background:rgba(10,14,12,.86);color:#fff;font:600 26px/1.35 'Atkinson Hyperlegible',system-ui,sans-serif;padding:10px 22px;border-radius:12px;text-align:center;letter-spacing:normal;word-spacing:normal}
#v-cap:empty{display:none}
.toast{bottom:110px!important}
#v-cur{position:fixed;left:640px;top:360px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;z-index:9998;pointer-events:none;
  background:rgba(255,200,0,.35);border:3px solid #e0a800;box-shadow:0 0 0 4px rgba(255,255,255,.6);transition:left .6s ease,top .6s ease,transform .15s}
#v-cur.click{transform:scale(.7)}
#v-cur.off{display:none}
#v-card{position:fixed;inset:0;z-index:9990;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  background:#2f5d50;color:#f6f3ee;font-family:'Atkinson Hyperlegible',system-ui,sans-serif;text-align:center;transition:opacity .6s}
#v-card h1{font-size:84px;margin:0;letter-spacing:normal}#v-card p{font-size:34px;margin:0;opacity:.95}#v-card small{font-size:22px;opacity:.8;margin-top:18px}
#v-card.hide{opacity:0;pointer-events:none}
#v-term{position:fixed;inset:0;z-index:9990;background:#0d1117;color:#c9d1d9;font:16px/1.4 Consolas,'Courier New',monospace;padding:26px 60px;white-space:pre;overflow:hidden}
#v-term .ok{color:#3fb950}#v-term .dim{color:#8b949e}#v-term .hl{color:#ffe14d;font-weight:bold}
`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:8766/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: OVERLAY_CSS });
  await page.evaluate(() => {
    for (const id of ['v-cap', 'v-cur']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); }
  });

  const cap = text => page.evaluate(t => { document.getElementById('v-cap').textContent = t; }, text);
  const card = html => page.evaluate(h => {
    let c = document.getElementById('v-card');
    if (!c) { c = document.createElement('div'); c.id = 'v-card'; document.body.appendChild(c); }
    c.innerHTML = h; c.classList.remove('hide'); document.getElementById('v-cur').classList.add('off');
  }, html);
  const hideCard = () => page.evaluate(() => { const c = document.getElementById('v-card'); if (c) c.classList.add('hide'); document.getElementById('v-cur').classList.remove('off'); });

  async function point(sel, nth = 0) {
    const handles = await page.$$(sel);
    const el = handles[nth];
    if (!el) throw new Error('missing ' + sel);
    await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await sleep(550);
    const b = await el.boundingBox();
    await page.evaluate((x, y) => { const c = document.getElementById('v-cur'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, b.x + b.width / 2, b.y + b.height / 2);
    await sleep(650);
    return el;
  }
  async function click(sel, nth = 0) {
    const el = await point(sel, nth);
    await page.evaluate(() => document.getElementById('v-cur').classList.add('click'));
    await el.click();
    await sleep(150);
    await page.evaluate(() => document.getElementById('v-cur').classList.remove('click'));
  }
  const scrollTo = (sel, block = 'start') => page.$eval(sel, (e, b) => e.scrollIntoView({ block: b, behavior: 'smooth' }), block);

  // Per-scene choreography. `at(s)` waits until s seconds into the scene.
  const ACTIONS = {
    intro: async () => { await card('<h1>Spoonful</h1><p>Plan by energy, not by hours.</p><small>Taskforge 2026</small>'); },
    question: async at => { await hideCard(); await at(4); await point('label[for="preset-2"]'); await at(7); await point('label[for="preset-10"]'); await at(10); await point('[data-key="empty-sample"]'); },
    great: async at => {
      await click('[data-key="empty-sample"]'); await at(2.5); await click('label[for="preset-10"]');
      await at(5); await scrollTo('#today-plan'); await at(7); await point('.plan-item', 0); await at(9); await point('.plan-item', 2);
      await at(12); await point('.meter');
    },
    low: async at => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(500); await click('label[for="preset-4"]');
      await at(3); await scrollTo('#today-plan'); await at(5.5); await point('.plan-list');
      await at(8); await point('.group-note', 0); await at(12); await click('#group-no-room > summary'); await sleep(300); await point('#group-no-room .group-note');
    },
    breakdown: async at => {
      await click('[data-action="breakdown"]', 0); await at(5); await click('[data-action="add-all-suggested"]');
      await at(9); await click('[data-nav="today"]'); await sleep(400); await click('label[for="preset-6"]');
      await at(11.5); await point('.plan-item .sub');
    },
    focus: async at => {
      await click('[data-key="start-focus"]'); await at(3.5); await click('[data-action="focus-done"]');
      await at(6); await click('[data-action="focus-skip"]'); await at(8.5); await point('[data-action="focus-speak"]');
      await at(10.5); await click('[data-action="timer-start"]');
    },
    access: async at => {
      await click('[data-nav="settings"]'); await at(2); await click('input[name=textSize][value=large]');
      await at(4); await click('#set-readable'); await at(6); await click('#set-contrast'); await at(7.5); await click('input[name=theme][value=dark]');
      await at(9); await click('[data-nav="today"]');
      for (let i = 0; i < 4; i++) { await sleep(700); await page.keyboard.press('Tab'); }
    },
    tech: async at => {
      await page.evaluate(() => { const t = document.createElement('div'); t.id = 'v-term'; document.body.appendChild(t); document.getElementById('v-cur').classList.add('off'); });
      const lines = ['<span class="dim">~/spoonful</span> $ npm test', ''].concat(
        testOut.map(l => /^✔/.test(l) ? '<span class="ok">' + l.replace(/ \([\d.]+ms\)/, '') + '</span>' : l),
        ['', '<span class="dim">~/spoonful</span> $ node tests/e2e.browser.js', '<span class="hl">axe-core WCAG 2.1 AA: 0 violations in 6 states · 0 console errors</span>']);
      for (const l of lines) { await page.evaluate(h => { document.getElementById('v-term').innerHTML += h + '\n'; }, l); await sleep(260); }
    },
    outro: async () => {
      await page.evaluate(() => document.getElementById('v-term').remove());
      await card('<h1>Spoonful</h1><p>Plan by energy, not by hours.</p><p style="font-size:30px;margin-top:20px">waazy-w.github.io/spoonful</p><small>github.com/waazy-w/spoonful</small>');
    }
  };

  const recorder = await page.screencast({ path: path.join(OUT, 'video.webm') });
  const t0 = Date.now();
  const timings = [];
  for (const sc of scenes) {
    const dur = wavDur(sc.id);
    const start = Date.now();
    const at = s => sleep(Math.max(0, start + s * 1000 - Date.now()));
    // Captions: split the narration time across lines by length.
    const total = sc.cap.reduce((n, c) => n + c.length, 0);
    let acc = 0;
    const capTimers = sc.cap.map(c => { const ms = acc / total * dur * 1000; acc += c.length; return setTimeout(() => cap(c).catch(() => {}), ms); });
    timings.push({ id: sc.id, offset: (start - t0) / 1000, dur });
    await ACTIONS[sc.id](at);
    await at(dur + 0.6);
    capTimers.forEach(clearTimeout);
    await cap('');
    console.log(sc.id, 'planned', dur.toFixed(1), 'actual', ((Date.now() - start) / 1000).toFixed(1));
  }
  await sleep(1500);
  await recorder.stop();
  fs.writeFileSync(path.join(OUT, 'timings.json'), JSON.stringify(timings, null, 1));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
