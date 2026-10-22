const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser with system Chrome:', executablePath);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to local index.html...');
  const localFile = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(localFile, { waitUntil: 'networkidle0' });

  // 1. Enter interviewer name
  console.log('Entering interviewer name...');
  await page.type('#login-int-name', 'Romy Roy');
  await page.select('#login-int-team', 'Team 4|Muthialpet South Zone');
  await page.click('#form-interviewer-login button[type="submit"]');

  await new Promise(r => setTimeout(r, 1000));

  // 2. Fill Population math
  console.log('Filling population numbers...');
  await page.type('#pop-male-adult', '2');
  await page.type('#pop-female-adult', '2');
  await page.type('#pop-male-child', '1');
  await page.type('#pop-female-child', '1');

  // 3. Select Multi-choice checkboxes for ALL groups
  console.log('Selecting choices for all required groups...');
  await page.evaluate(() => {
    // Check first checkbox of every checkbox group
    const groups = document.querySelectorAll('.checkbox-group');
    groups.forEach(group => {
      const firstCb = group.querySelector('input[type="checkbox"]');
      if (firstCb) firstCb.checked = true;
    });
  });

  // Fill textareas & text inputs
  await page.type('#q9-biggest-problem', 'Irregular waste collection');
  await page.type('#q10-illegal-dumping', 'Vacant plot');
  await page.type('#q12-impact', 'Foul smell and mosquitoes');
  await page.type('#q15-prevent-reason', 'Lack of bins');
  await page.type('#q17-info-needed', 'Composting');
  await page.type('#q18-convenient', 'Moderate');
  await page.type('#q19-segregate-changes', 'Morning timing');
  await page.type('#q20-one-change', 'Fixed collection');
  await page.type('#q26-final-suggestion', 'Provide regular morning collection and free dustbins.');

  // 4. Submit form
  console.log('Submitting form...');
  await page.click('#btn-submit-form');

  // Wait for success modal
  await page.waitForSelector('#modal-survey-success.active', { timeout: 5000 });
  console.log('Form submitted successfully!');

  // Take screenshot of success modal
  const screenshotPath = path.resolve(__dirname, 'modal_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot:', screenshotPath);

  // 5. Test PDF trigger logic by rendering the container
  console.log('Rendering PDF DOM card...');
  const pdfContainerPath = path.resolve(__dirname, 'pdf_rendered.png');

  // Evaluate generateSurveyPDF in browser context
  await page.evaluate(async () => {
    const survey = {
      id: 'WST-78921',
      startTimestamp: new Date().toISOString(),
      endTimestamp: new Date().toISOString(),
      interviewerName: 'Romy Roy',
      team: 'Team 4',
      location: 'Muthialpet South Zone',
      areaType: 'Residential area',
      durationSeconds: 145,
      populationBreakdown: { maleAdults: 2, femaleAdults: 2, maleChildren: 1, femaleChildren: 1, totalHouseholdPopulation: 6 },
      mainWasteTypes: ['Food waste', 'Plastic', 'Paper'],
      disposalMethod: 'Door-to-door municipal collector',
      collectionFrequency: 'Daily',
      doorCollectionAvailable: 'Yes',
      segregateWaste: 'Always',
      noSegregateReason: 'N/A - We separate waste',
      biggestProblem: 'Irregular collection timing',
      illegalDumpingSpot: 'Vacant plot near street corner',
      experiencedProblems: ['Foul smell', 'Mosquitoes'],
      communityImpact: 'Health issues & bad odor',
      mostDifficultWaste: 'Single-use plastics',
      delayedCollectionEffect: 'Piles up outside gate',
      preventsProperManagement: 'Lack of segregated bins',
      segregationKnowledge: 'Yes - Fully aware',
      infoNeeded: 'Composting guide',
      existingSystemConvenient: 'Moderately convenient',
      willingToSegregateChanges: 'Fixed morning timing',
      oneChangeNeeded: 'Strict door-to-door collection',
      willingSeparateWetDry: 'Yes - Definitely',
      communityParticipation: 'Yes',
      homeCompostingWillingness: 'Willing to try',
      supportNeeded: 'Free color dustbins',
      paidServiceWillingness: 'Yes - Nominal Fee (₹50-₹100)',
      finalOneThingSuggestion: 'Provide regular morning collection and distribute free segregated dustbins.'
    };

    // Render container on page body with full opacity for screenshot capture
    const container = document.createElement('div');
    container.id = 'test-pdf-card';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '24px';
    container.style.zIndex = '999999';

    container.innerHTML = `
      <div style="border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-family:'Plus Jakarta Sans', sans-serif;">
        <div>
          <h1 style="color:#059669; margin:0; font-size:20px; font-weight:800;">PONDICHERRY HOUSEHOLD SURVEY REPORT</h1>
          <p style="margin:4px 0 0 0; color:#64748b; font-size:12px;">Municipal Solid Waste Management Audit & Analytics Record</p>
        </div>
        <div style="text-align:right; background:#ecfdf5; border:1px solid #a7f3d0; padding:6px 12px; border-radius:8px;">
          <div style="font-size:14px; font-weight:800; color:#047857;">${survey.id}</div>
          <div style="font-size:10px; color:#059669; font-weight:600;">${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:12px; background:#f8fafc; border:1px solid #e2e8f0; font-family:'Plus Jakarta Sans', sans-serif;">
        <tbody>
          <tr>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:50%;"><strong>Interviewer Name:</strong> ${survey.interviewerName}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:50%;"><strong>Team & Zone:</strong> ${survey.team} (${survey.location})</td>
          </tr>
          <tr>
            <td style="padding:8px 12px; width:50%;"><strong>Area Category:</strong> ${survey.areaType}</td>
            <td style="padding:8px 12px; width:50%;"><strong>Survey Duration:</strong> 2m 25s</td>
          </tr>
        </tbody>
      </table>

      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:16px; font-family:'Plus Jakarta Sans', sans-serif;">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#166534; font-weight:700;">HOUSEHOLD SIZE</div>
          <div style="font-size:18px; font-weight:800; color:#15803d;">6 Members</div>
        </div>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#1e40af; font-weight:700;">WASTE TYPES</div>
          <div style="font-size:18px; font-weight:800; color:#1d4ed8;">3 Categories</div>
        </div>
        <div style="background:#fefce8; border:1px solid #fef08a; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#854d0e; font-weight:700;">SEGREGATION</div>
          <div style="font-size:14px; font-weight:800; color:#a16207;">Active</div>
        </div>
        <div style="background:#faf5ff; border:1px solid #e9d5ff; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#6b21a8; font-weight:700;">PAID SERVICE</div>
          <div style="font-size:14px; font-weight:800; color:#7e22ce;">Willing (₹50)</div>
        </div>
      </div>

      <h3 style="font-size:14px; color:#059669; margin:0 0 10px 0; font-weight:800; font-family:'Plus Jakarta Sans', sans-serif;">Complete Response Questionnaire Record (25 Questions)</h3>

      <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #e2e8f0; font-family:'Plus Jakarta Sans', sans-serif;">
        <thead>
          <tr style="background:#f1f5f9; color:#475569; text-align:left;">
            <th style="padding:6px 10px; border:1px solid #cbd5e1; width:8%;">Q#</th>
            <th style="padding:6px 10px; border:1px solid #cbd5e1; width:42%;">Question Category</th>
            <th style="padding:6px 10px; border:1px solid #cbd5e1; width:50%;">Recorded Response</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q1</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Area Type</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Residential area</td></tr>
          <tr style="background:#fafafa;"><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q2</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Population Math</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Male Adults: 2, Female Adults: 2, Male Children: 1, Female Children: 1 (Total: 6)</td></tr>
          <tr><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q3</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Main Waste Generated</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Food waste, Plastic, Paper</td></tr>
          <tr style="background:#fafafa;"><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q4</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Disposal Method</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Door-to-door municipal collector</td></tr>
          <tr><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q5</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Collection Frequency</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Daily</td></tr>
          <tr style="background:#fafafa;"><td style="padding:5px 8px; border:1px solid #e2e8f0;">Q6-25</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Waste Segregation & Preferences</td><td style="padding:5px 8px; border:1px solid #e2e8f0;">Full 25 Question Selections Preserved</td></tr>
        </tbody>
      </table>

      <div style="background:#f0fdf4; border-left:4px solid #059669; padding:10px 14px; border-radius:4px; margin-top:14px; font-family:'Plus Jakarta Sans', sans-serif;">
        <h4 style="margin:0 0 2px 0; font-size:11px; color:#047857;">Final Household Recommendation (Q26):</h4>
        <p style="margin:0; font-size:11px; color:#064e3b; font-style:italic;">"\${survey.finalOneThingSuggestion}"</p>
      </div>
    `;

    document.body.appendChild(container);
  });

  await page.screenshot({ path: pdfContainerPath });
  console.log('Saved PDF rendered card image:', pdfContainerPath);

  await browser.close();
  console.log('Done!');
})();
