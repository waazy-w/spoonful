// Browser end-to-end + axe-core accessibility audit.
// Setup: npm i puppeteer-core@23.11.1 axe-core@4.10.2   (edit executablePath below to your Chrome/Edge)
// Run:   node tests/e2e.browser.js . tests/shots
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = process.argv[2], OUT = process.argv[3];
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); res.end(d); });
}).listen(8765);
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const log = (...a) => console.log(...a);
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
  const text = s => page.$eval(s, el => el.innerText);
  const axe = async (label) => {
    await page.evaluate(axeSrc);
    const r = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a','wcag2aa','wcag21aa','best-practice'] }));
    log(`[axe ${label}] violations: ${r.violations.length}`);
    r.violations.forEach(v => log('  -', v.id, v.impact, v.help, v.nodes.slice(0,3).map(n => n.target.join(' ')).join(' | ')));
  };
  await axe('empty today');
  await page.screenshot({ path: OUT + '/01-empty.png' });
  // load sample
  await page.click('[data-key="empty-sample"]');
  await page.click('label[for="preset-4"]');
  log('PLAN (low=4):\n' + await text('#today-plan'));
  await axe('today low');
  await page.screenshot({ path: OUT + '/02-low-day.png', fullPage: true });
  await page.click('label[for="preset-10"]');
  log('PLAN (great=10) planned items:', await page.$$eval('.plan-item .title', els => els.map(e => e.innerText)));
  await page.screenshot({ path: OUT + '/03-great-day.png', fullPage: true });
  await page.click('label[for="preset-4"]');
  // break down the deferred lab report
  const bd = await page.$('[data-action="breakdown"]');
  log('breakdown button present:', !!bd);
  await bd.click();
  log('active after breakdown:', await page.evaluate(() => document.activeElement.id));
  await page.click('[data-action="add-all-suggested"]');
  log('steps after add-all:', await page.$$eval('.step-list label', els => els.map(e => e.innerText)));
  await axe('tasks panel');
  await page.screenshot({ path: OUT + '/04-breakdown.png', fullPage: true });
  // add task via form, validation
  await page.click('#add-task button[type=submit]');
  log('validation error visible:', await page.$eval('#title-error', e => !e.hidden));
  await page.type('#task-title', 'Email advisor about extension');
  await page.click('label[for="cost-1"]');
  await page.click('#add-task button[type=submit]');
  log('toast:', await text('#toast'));
  // today plan now
  await page.click('[data-nav="today"]');
  await page.click('label[for="preset-6"]');
  log('PLAN after breakdown (okay=6):\n' + await text('#today-plan'));
  // focus
  await page.click('[data-key="start-focus"]');
  log('FOCUS:', await text('#focus-body'));
  await axe('focus');
  await page.screenshot({ path: OUT + '/05-focus.png' });
  log('done btn:', await page.evaluate(() => { const b = document.querySelectorAll('[data-action="focus-done"]'); return [...b].map(x => JSON.stringify(x.getBoundingClientRect()) + ' hiddenAncestor=' + !!x.closest('[hidden]')); }));
  await page.click('[data-action="focus-done"]');
  log('active after done:', await page.evaluate(() => document.activeElement.getAttribute('data-key')));
  log('live:', await page.evaluate(() => new Promise(r => setTimeout(() => r(document.getElementById('live').textContent), 100))));
  await page.click('[data-action="focus-skip"]');
  log('FOCUS after skip:', await text('#focus-title'));
  for (let i = 0; i < 10; i++) { const b = await page.$('[data-action="focus-done"]'); if (!b) break; await b.click(); }
  log('FOCUS end:', await text('#focus-body'));
  await page.click('[data-nav="today"]');
  log('TODAY end:\n' + await text('#today-plan'));
  // undo
  await page.click('[data-action="undo"]');
  log('done entries after undo:', await page.$$eval('#today-plan .done-list li', e => e.length));
  // persistence
  await page.reload({ waitUntil: 'networkidle0' });
  log('after reload spoons:', await page.$eval('#spoon-count', e => e.value), 'tasks:', await page.evaluate(() => JSON.parse(localStorage.getItem('spoonful:v1')).tasks.length));
  // settings
  await page.click('[data-nav="settings"]');
  await page.click('#set-contrast'); await page.click('#set-readable');
  await page.click('input[name=theme][value=dark]'); await page.click('input[name=textSize][value=large]');
  await axe('settings dark contrast');
  await page.click('[data-nav="today"]');
  await page.screenshot({ path: OUT + '/06-dark-contrast-large.png', fullPage: true });
  await page.click('[data-nav="settings"]');
  await page.click('#set-contrast'); await page.click('#set-readable');
  await axe('settings dark');
  await page.click('input[name=theme][value=light]'); await page.click('input[name=textSize][value=default]');
  // keyboard-only: tab from top
  await page.click('[data-nav="today"]');
  await page.keyboard.press('Tab');
  // mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.screenshot({ path: OUT + '/07-mobile.png', fullPage: true });
  log('horizontal overflow on mobile:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  log('SW registered:', await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length)));
  log('ERRORS:', errors.length ? errors : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
