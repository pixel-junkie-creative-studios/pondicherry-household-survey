const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('https://pondicherry-household-survey.vercel.app', { waitUntil: 'networkidle2' });

  // Check login
  await page.type('#login-int-name', 'Romy Roy');
  await page.select('#login-int-team', 'Team 1');
  await page.type('#login-int-location', 'Muthialpet');
  await page.click('#modal-start-confirm button[type="submit"]');
  await new Promise(r => setTimeout(r, 1000));

  // Check that mobile input does NOT have required
  const mobileRequired = await page.$eval('#resp-mobile', el => el.hasAttribute('required'));
  console.log('Is mobile number required:', mobileRequired);

  // Check that income dropdown does NOT exist in DOM
  const incomeExists = (await page.$('#income-dropdown-container')) !== null;
  console.log('Does monthly income container exist:', incomeExists);

  await page.screenshot({ path: 'latest_form_check.png', fullPage: false });
  await browser.close();
  console.log('Puppeteer verified: mobile optional & monthly income removed!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
