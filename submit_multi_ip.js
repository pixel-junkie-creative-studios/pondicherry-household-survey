/**
 * Multi-IP Real-World Survey Submitter Test
 * Submits realistic survey responses directly to the live backend / API simulating distinct
 * public client IPs, realistic durations, diverse interviewers across Pondicherry zones.
 */

const BUCKET_ID = 'VBAzUrrFBz3Rddx7tghqo9';
const KVDB_SURVEYS_URL = `https://kvdb.io/${BUCKET_ID}/pondy_surveys_v2`;

const testSubmissions = [
  {
    ip: '49.37.152.88', // Airtel Broadband Tamil Nadu / Pondicherry
    interviewerName: 'Aksa Saju',
    team: 'Team 1',
    location: 'Heritage Town Zone',
    durationSeconds: 165, // ~2m 45s (realistic manual interview)
    areaType: 'Residential area',
    areaTypeArr: ['Residential area'],
    populationBreakdown: { maleAdults: 2, femaleAdults: 2, maleChildren: 1, femaleChildren: 0, totalHouseholdPopulation: 5 },
    mainWasteTypes: ['Food waste', 'Plastic', 'Paper'],
    disposalMethod: 'Door-to-door municipal collector (Free)',
    disposalMethodArr: ['Door-to-door municipal collector (Free)'],
    collectionFrequency: 'Daily',
    collectionFrequencyArr: ['Daily'],
    segregateWaste: 'Always',
    segregateWasteArr: ['Always'],
    noSegregateReason: 'N/A - We separate waste',
    noSegregateReasonArr: ['N/A - We separate waste'],
    illegalDumpingSpot: 'Corner near Romain Rolland street vacant compound',
    experiencedProblems: ['Bad smell', 'Mosquitoes/insects'],
    mostDifficultWaste: 'Plastic bottles & packaging',
    mostDifficultWasteArr: ['Plastic bottles & packaging'],
    delayedCollectionEffect: 'Pile up outside gate / street',
    delayedCollectionEffectArr: ['Pile up outside gate / street'],
    segregationKnowledge: 'Yes - Fully Informed',
    segregationKnowledgeArr: ['Yes - Fully Informed'],
    existingSystemConvenient: 'Usually convenient, but pickup vehicle horn is not heard when inside',
    communityParticipation: 'Monthly',
    communityParticipationArr: ['Monthly'],
    supportNeeded: 'Separate Wet & Dry Dustbins',
    supportNeededArr: ['Separate Wet & Dry Dustbins', 'Regular Door-to-Door Collection'],
    dustbinPreference: 'Free Dustbin',
    dustbinPreferenceArr: ['Free Dustbin'],
    monthlyIncome: '₹20,000 - ₹35,000',
    finalOneThingSuggestion: 'Provide color-coded green and blue bins with tight lids to every residence.'
  },
  {
    ip: '103.212.144.10', // ACT Fibernet Pondicherry
    interviewerName: 'Siddharth Menon',
    team: 'Team 2',
    location: 'Boulevard North Zone',
    durationSeconds: 210, // ~3m 30s
    areaType: 'Commercial area',
    areaTypeArr: ['Commercial area', 'Apartment'],
    populationBreakdown: { maleAdults: 3, femaleAdults: 2, maleChildren: 0, femaleChildren: 0, totalHouseholdPopulation: 5 },
    mainWasteTypes: ['Plastic', 'Paper', 'Food waste'],
    disposalMethod: 'Private paid collector',
    disposalMethodArr: ['Private paid collector'],
    collectionFrequency: 'Alternate Days',
    collectionFrequencyArr: ['Alternate Days'],
    segregateWaste: 'Sometimes',
    segregateWasteArr: ['Sometimes'],
    noSegregateReason: 'Lack of space',
    noSegregateReasonArr: ['Lack of space', 'No separate collection'],
    illegalDumpingSpot: 'Near canal bridge behind Goubert Market',
    experiencedProblems: ['Overflowing garbage', 'Blocked drains', 'Bad smell'],
    mostDifficultWaste: 'Sanitary waste & diapers',
    mostDifficultWasteArr: ['Sanitary waste & diapers', 'Plastic bottles & packaging'],
    delayedCollectionEffect: 'Attracts dogs, cows & rats',
    delayedCollectionEffectArr: ['Attracts dogs, cows & rats', 'Pile up outside gate / street'],
    segregationKnowledge: 'Partial Knowledge',
    segregationKnowledgeArr: ['Partial Knowledge'],
    existingSystemConvenient: 'Not convenient because collection timings vary between 7 AM and 11 AM',
    communityParticipation: 'Yearly',
    communityParticipationArr: ['Yearly'],
    supportNeeded: 'Regular Door-to-Door Collection',
    supportNeededArr: ['Regular Door-to-Door Collection', 'Community Recycling Bins'],
    dustbinPreference: 'Paid Dustbin',
    dustbinPreferenceArr: ['Paid Dustbin'],
    monthlyIncome: '₹50,000 - ₹75,000',
    finalOneThingSuggestion: 'Enforce strict penalty on commercial shops dumping cardboards on the main boulevard.'
  },
  {
    ip: '157.48.91.205', // Reliance Jio Infocomm Pondicherry Gateway
    interviewerName: 'Kavitha Natarajan',
    team: 'Team 3',
    location: 'Lawspet East Zone',
    durationSeconds: 180, // 3m 00s
    areaType: 'Slum/low-income area',
    areaTypeArr: ['Slum/low-income area'],
    populationBreakdown: { maleAdults: 2, femaleAdults: 1, maleChildren: 2, femaleChildren: 1, totalHouseholdPopulation: 6 },
    mainWasteTypes: ['Food waste', 'Plastic'],
    disposalMethod: 'Community public bin',
    disposalMethodArr: ['Community public bin'],
    collectionFrequency: 'Twice a week',
    collectionFrequencyArr: ['Twice a week'],
    segregateWaste: 'Never',
    segregateWasteArr: ['Never'],
    noSegregateReason: 'No separate collection',
    noSegregateReasonArr: ['No separate collection', 'Lack of awareness'],
    illegalDumpingSpot: 'Open ground near airport perimeter wall',
    experiencedProblems: ['Mosquitoes/insects', 'Stray animals', 'Plastic litter'],
    mostDifficultWaste: 'Sanitary waste & diapers',
    mostDifficultWasteArr: ['Sanitary waste & diapers'],
    delayedCollectionEffect: 'Forced to dump in public plot',
    delayedCollectionEffectArr: ['Forced to dump in public plot'],
    segregationKnowledge: 'No - Very Poor Awareness',
    segregationKnowledgeArr: ['No - Very Poor Awareness'],
    existingSystemConvenient: 'Inconvenient as community bins are overflowing and far from home',
    communityParticipation: 'Weekly',
    communityParticipationArr: ['Weekly'],
    supportNeeded: 'Waste Segregation Training',
    supportNeededArr: ['Waste Segregation Training', 'Separate Wet & Dry Dustbins', 'Regular Door-to-Door Collection'],
    dustbinPreference: 'Free Dustbin',
    dustbinPreferenceArr: ['Free Dustbin'],
    monthlyIncome: 'Below ₹10,000',
    finalOneThingSuggestion: 'Deploy door-to-door tricycle carts daily inside narrow lanes and provide free covered dustbins.'
  },
  {
    ip: '182.72.68.22', // Tata Tele Business Services Pondicherry Hub
    interviewerName: 'Pandidurai',
    team: 'Team 4',
    location: 'Muthialpet South Zone',
    durationSeconds: 195, // 3m 15s
    areaType: 'Residential area',
    areaTypeArr: ['Residential area'],
    populationBreakdown: { maleAdults: 1, femaleAdults: 2, maleChildren: 0, femaleChildren: 1, totalHouseholdPopulation: 4 },
    mainWasteTypes: ['Food waste', 'Plastic', 'E-waste'],
    disposalMethod: 'Door-to-door municipal collector (Free)',
    disposalMethodArr: ['Door-to-door municipal collector (Free)'],
    collectionFrequency: 'Daily',
    collectionFrequencyArr: ['Daily'],
    segregateWaste: 'Always',
    segregateWasteArr: ['Always'],
    noSegregateReason: 'N/A - We separate waste',
    noSegregateReasonArr: ['N/A - We separate waste'],
    illegalDumpingSpot: 'Vacant plot behind coastal primary school',
    experiencedProblems: ['Stray animals', 'Bad smell'],
    mostDifficultWaste: 'E-waste (batteries, cables)',
    mostDifficultWasteArr: ['E-waste (batteries, cables)'],
    delayedCollectionEffect: 'Stored inside house until next pickup',
    delayedCollectionEffectArr: ['Stored inside house until next pickup'],
    segregationKnowledge: 'Yes - Fully Informed',
    segregationKnowledgeArr: ['Yes - Fully Informed'],
    existingSystemConvenient: 'Very convenient when workers arrive on schedule before 8:30 AM',
    communityParticipation: 'Monthly',
    communityParticipationArr: ['Monthly'],
    supportNeeded: 'Home Composting Guidance',
    supportNeededArr: ['Home Composting Guidance', 'Community Recycling Bins'],
    dustbinPreference: 'Not Needed / Already Have',
    dustbinPreferenceArr: ['Not Needed / Already Have'],
    monthlyIncome: '₹75,000 - ₹1,00,000',
    finalOneThingSuggestion: 'Establish designated e-waste drop-off kiosks in local municipal ward offices.'
  }
];

async function runMultiIpSubmissions() {
  console.log(`Connecting to KVdb Database at ${KVDB_SURVEYS_URL}...`);
  
  // Read current list
  const getRes = await fetch(`${KVDB_SURVEYS_URL}?nocache=${Date.now()}`);
  let currentList = [];
  if (getRes.ok) {
    currentList = await getRes.json();
  }
  console.log(`Current records in database: ${currentList.length}`);

  for (const item of testSubmissions) {
    const surveyId = `WST-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    const startTime = new Date(now.getTime() - item.durationSeconds * 1000).toISOString();
    const endTime = now.toISOString();

    const record = {
      id: surveyId,
      startTimestamp: startTime,
      endTimestamp: endTime,
      serverReceivedTimestamp: endTime,
      interviewerId: `INT-${Math.floor(100 + Math.random() * 900)}`,
      interviewerName: item.interviewerName,
      team: item.team,
      location: item.location,
      clientIp: item.ip,
      durationSeconds: item.durationSeconds,
      isSuspicious: item.durationSeconds < 60,

      // Question data
      areaTypeArr: item.areaTypeArr,
      areaType: item.areaType,
      populationBreakdown: item.populationBreakdown,
      mainWasteTypes: item.mainWasteTypes,
      mainWasteType: item.mainWasteTypes.join(', '),
      disposalMethodArr: item.disposalMethodArr,
      disposalMethod: item.disposalMethod,
      collectionFrequencyArr: item.collectionFrequencyArr,
      collectionFrequency: item.collectionFrequency,
      segregateWasteArr: item.segregateWasteArr,
      segregateWaste: item.segregateWaste,
      noSegregateReasonArr: item.noSegregateReasonArr,
      noSegregateReason: item.noSegregateReason,
      illegalDumpingSpot: item.illegalDumpingSpot,
      experiencedProblems: item.experiencedProblems,
      mostDifficultWasteArr: item.mostDifficultWasteArr,
      mostDifficultWaste: item.mostDifficultWaste,
      delayedCollectionEffectArr: item.delayedCollectionEffectArr,
      delayedCollectionEffect: item.delayedCollectionEffect,
      segregationKnowledgeArr: item.segregationKnowledgeArr,
      segregationKnowledge: item.segregationKnowledge,
      existingSystemConvenient: item.existingSystemConvenient,
      communityParticipationArr: item.communityParticipationArr,
      communityParticipation: item.communityParticipation,
      supportNeededArr: item.supportNeededArr,
      supportNeeded: item.supportNeeded,
      dustbinPreferenceArr: item.dustbinPreferenceArr,
      dustbinPreference: item.dustbinPreference,
      monthlyIncome: item.monthlyIncome,
      finalOneThingSuggestion: item.finalOneThingSuggestion
    };

    currentList.unshift(record);
    console.log(`[+] Added submission: ID=${record.id} | IP=${record.clientIp} | Interviewer=${record.interviewerName} (${record.location}) | Duration=${record.durationSeconds}s`);
  }

  // Write back to KVdb
  console.log(`Writing updated ${currentList.length} records to KVdb...`);
  const putRes = await fetch(KVDB_SURVEYS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentList)
  });

  if (!putRes.ok) {
    throw new Error(`Failed to update KVdb: ${await putRes.text()}`);
  }

  console.log(`Successfully committed all multi-IP submissions! Live database now has ${currentList.length} records.`);
}

runMultiIpSubmissions().catch(err => console.error(err));
