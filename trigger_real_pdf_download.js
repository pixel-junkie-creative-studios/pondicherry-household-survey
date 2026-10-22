const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser with Chrome...');
  const browser = await puppeteer.launch({
    headless: false, // Visible head to allow html2pdf download trigger
    executablePath: executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  // Configure Chrome CDP to allow downloads automatically
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to live production site...');
  await page.goto('https://pondicherry-household-survey.vercel.app', { waitUntil: 'networkidle0' });

  // 1. Enter interviewer name
  console.log('Filling Interviewer Check-in...');
  await page.type('#login-int-name', 'Romy Roy');
  await page.select('#login-int-team', 'Team 4|Muthialpet South Zone');
  await page.click('#form-interviewer-login button[type="submit"]');

  await new Promise(r => setTimeout(r, 1000));

  // 2. Fill Population math
  console.log('Filling household population numbers...');
  await page.type('#pop-male-adult', '2');
  await page.type('#pop-female-adult', '2');
  await page.type('#pop-male-child', '1');
  await page.type('#pop-female-child', '1');

  // 3. Select Multi-choice checkboxes for ALL required groups
  console.log('Selecting multi-choice checkboxes...');
  await page.evaluate(() => {
    const groups = document.querySelectorAll('.checkbox-group');
    groups.forEach(group => {
      const firstCb = group.querySelector('input[type="checkbox"]');
      if (firstCb) firstCb.checked = true;
    });
  });

  // Check free dustbin to trigger income dropdown
  await page.evaluate(() => {
    const cbFree = document.getElementById('cb-dustbin-free');
    if (cbFree) {
      cbFree.checked = true;
      cbFree.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Select monthly income bracket
  await page.select('#select-monthly-income', 'Below ₹10,000');

  // Fill textareas & text inputs
  console.log('Filling qualitative feedback...');
  await page.type('#q9-biggest-problem', 'Irregular morning collection');
  await page.type('#q10-illegal-dumping', 'Vacant plot at street end');
  await page.type('#q12-impact', 'Bad odor and health concerns');
  await page.type('#q15-prevent-reason', 'Lack of segregated dustbins');
  await page.type('#q17-info-needed', 'Home composting techniques');
  await page.type('#q18-convenient', 'Moderately convenient');
  await page.type('#q19-segregate-changes', 'Fixed daily morning timing');
  await page.type('#q20-one-change', 'Strict door-to-door timing');
  await page.type('#q26-final-suggestion', 'Provide regular morning collection and distribute free segregated dustbins.');

  // 4. Submit form
  console.log('Submitting completed survey form...');
  await page.click('#btn-submit-form');

  // Wait for success modal
  await page.waitForSelector('#modal-survey-success.active', { timeout: 8000 });
  console.log('Success modal displayed!');

  // 5. Click Download Copy of Submitted Form button
  console.log('Clicking Download Copy of Submitted Form button...');
  await page.click('#btn-download-copy');

  // Wait 4 seconds for html2pdf generation & download to save
  await new Promise(r => setTimeout(r, 4000));

  // Check downloaded file
  const files = fs.readdirSync(downloadPath);
  console.log('Downloaded files in directory:', files);

  await browser.close();
  console.log('Test completed successfully!');
})();
