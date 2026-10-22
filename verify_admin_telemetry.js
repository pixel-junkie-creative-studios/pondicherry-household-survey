const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser with Chrome:', executablePath);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to admin portal...');
  const adminUrl = 'file:///' + path.resolve(__dirname, 'admin.html').replace(/\\/g, '/');
  await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('Waiting for live poll & charts to render...');
  // Wait until total surveys count updates from 0
  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('stat-total-surveys');
      return el && el.textContent.trim() !== '0';
    }, { timeout: 15000 });
  } catch (e) {
    console.log('Notice: waitForFunction finished or timed out, continuing...');
  }

  await new Promise(r => setTimeout(r, 4000));

  // Extract KPI counts
  const kpis = await page.evaluate(() => {
    return {
      total: document.getElementById('stat-total-surveys')?.innerText,
      avgDuration: document.getElementById('stat-avg-duration')?.innerText,
      suspicious: document.getElementById('stat-suspicious-count')?.innerText,
      totalPop: document.getElementById('stat-total-population')?.innerText,
      avgFamily: document.getElementById('stat-avg-family')?.innerText,
      devices: document.getElementById('stat-unique-devices')?.innerText,
      clustering: document.getElementById('stat-ip-clustering')?.innerText
    };
  });
  console.log('Executive KPI Metrics:', kpis);

  // Extract Summary Table samples
  const summaryTables = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll('.data-summary-table'));
    return tables.map(t => {
      const rows = Array.from(t.querySelectorAll('tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return rows;
    });
  });
  console.log(`Rendered ${summaryTables.length} Data Summary Tables!`);
  if (summaryTables.length > 0) {
    console.log('Sample Table 1 (Area Types):', JSON.stringify(summaryTables[0], null, 2));
    console.log('Sample Table 2 (Waste Types):', JSON.stringify(summaryTables[1], null, 2));
    console.log('Sample Table 3 (Disposal Methods):', JSON.stringify(summaryTables[2], null, 2));
  }

  // Take screenshot of admin telemetry dashboard
  const screenshotPath = path.resolve(__dirname, 'admin_telemetry_live.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot of admin telemetry to:', screenshotPath);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
