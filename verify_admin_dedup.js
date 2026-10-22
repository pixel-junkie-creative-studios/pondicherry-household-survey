const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://pondicherry-household-survey.vercel.app/admin.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const totalSurveys = await page.$eval('#stat-total-surveys', el => el.textContent.trim());
  console.log('Admin Stat Total Surveys:', totalSurveys);

  const rowCount = await page.$$eval('#audit-telemetry-table tbody tr', trs => trs.length);
  console.log('Telemetry Table Rows Rendered:', rowCount);

  // Check unique respondent names rendered in table
  const renderedHeads = await page.$$eval('#audit-telemetry-table tbody tr td:nth-child(5)', tds => {
    return tds.map(td => td.textContent.trim()).filter(t => t !== 'N/A');
  });
  console.log('Rendered Family Heads (sample):', renderedHeads.slice(0, 10));

  const uniqueHeads = new Set(renderedHeads.map(h => h.toLowerCase()));
  console.log('Total rendered names count:', renderedHeads.length);
  console.log('Unique names count:', uniqueHeads.size);

  await page.screenshot({ path: 'admin_deduped_live.png', fullPage: false });
  await browser.close();
  console.log('Puppeteer verification finished!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
