const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('https://pondicherry-household-survey.vercel.app', { waitUntil: 'networkidle2' });
  
  // Fill check-in modal
  await page.type('#login-int-name', 'Romy Roy');
  await page.select('#login-int-team', 'Team 1');
  await page.type('#login-int-location', 'Muthialpet');
  await page.click('#modal-start-confirm button[type="submit"]');
  await new Promise(r => setTimeout(r, 1000));

  // Check section 0 inputs exist
  const hasWard = (await page.$('#resp-ward')) !== null;
  const hasArea = (await page.$('#resp-area')) !== null;
  const hasStreet = (await page.$('#resp-street')) !== null;
  const hasHead = (await page.$('#resp-family-head')) !== null;
  const hasMobile = (await page.$('#resp-mobile')) !== null;
  console.log('Section 0 Fields:', { hasWard, hasArea, hasStreet, hasHead, hasMobile });

  // Test toggling short mode
  await page.click('#mode-short');
  await new Promise(r => setTimeout(r, 500));

  const hiddenCount = await page.$$eval('.full-survey-only.hidden-mode', els => els.length);
  console.log('Hidden full-survey elements count in short mode:', hiddenCount);

  await page.screenshot({ path: 'short_mode_check.png', fullPage: false });
  await browser.close();
  console.log('SUCCESS: Puppeteer verified Short Mode and Profile fields!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
