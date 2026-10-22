/**
 * Field Interviewer Survey App Controller
 * Features: Multi-select Checkboxes for all option questions, Dynamic "Other" Specify Text Inputs,
 * Auto-summing household math, Background Duration Tracker, IndexedDB Local Buffer,
 * Persistent Interviewer Check-in (localStorage) & Downloadable Response Receipts.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // PERSISTENT UNIQUE DEVICE IDENTIFIER PER STUDENT PHONE
  let currentDeviceId = localStorage.getItem('pondy_device_id');
  if (!currentDeviceId) {
    currentDeviceId = `DEV-STU-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    localStorage.setItem('pondy_device_id', currentDeviceId);
  }

  const state = {
    activeInterviewer: null,
    deviceId: currentDeviceId,
    startTimestamp: null,
    timerInterval: null,
    db: null,
    lastSubmittedSurvey: null
  };

  // 1. INDEXEDDB FAILPROOF LOCAL BUFFER
  async function initIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('PondyWasteDB_v2', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('offline_waste_surveys')) {
          db.createObjectStore('offline_waste_surveys', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        state.db = e.target.result;
        try { flushOfflineBuffer(); } catch(err) {}
        resolve(state.db);
      };
      request.onerror = () => resolve(null);
    });
  }

  async function saveLocalBuffer(survey) {
    if (!state.db) return;
    return new Promise((resolve) => {
      const tx = state.db.transaction('offline_waste_surveys', 'readwrite');
      const store = tx.objectStore('offline_waste_surveys');
      store.put(survey);
      tx.oncomplete = () => resolve();
    });
  }

  const BUCKET_ID = 'VBAzUrrFBz3Rddx7tghqo9';
  const KVDB_BASE = `https://kvdb.io/${BUCKET_ID}`;
  const INDEX_KEY = 'pondy_surveys_index';

  async function syncSurveyToCloud(survey) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(survey)
        });
        if (res.ok) return true;
      } catch (e) {}
    }

    try {
      const idxRes = await fetch(`${KVDB_BASE}/${INDEX_KEY}?nocache=${Date.now()}`);
      if (idxRes.ok) {
        const indexData = await idxRes.json();
        if (indexData.chunks && indexData.chunks.length > 0) {
          const headChunkKey = indexData.chunks[0];
          const headRes = await fetch(`${KVDB_BASE}/${headChunkKey}?nocache=${Date.now()}`);
          let headList = headRes.ok ? await headRes.json() : [];
          if (headList.length >= 250) {
            const newChunkKey = `pondy_surveys_c${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            indexData.chunks.unshift(newChunkKey);
            await Promise.all([
              fetch(`${KVDB_BASE}/${newChunkKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([survey])
              }),
              fetch(`${KVDB_BASE}/${INDEX_KEY}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(indexData)
              })
            ]);
          } else {
            headList.unshift(survey);
            await fetch(`${KVDB_BASE}/${headChunkKey}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(headList)
            });
          }
          return true;
        }
      }
    } catch (err) {
      console.warn("Direct cloud sync fallback error:", err);
    }
    return false;
  }

  // FAILSAFE BACKGROUND OFFLINE SYNC FOR STUDENT PHONES
  async function flushOfflineBuffer() {
    // 1. Flush IndexedDB offline surveys
    if (state.db) {
      try {
        const tx = state.db.transaction('offline_waste_surveys', 'readwrite');
        const store = tx.objectStore('offline_waste_surveys');
        const getAllReq = store.getAll();
        getAllReq.onsuccess = async () => {
          const list = getAllReq.result || [];
          for (const item of list) {
            if (item && !item._synced) {
              const ok = await syncSurveyToCloud(item);
              if (ok) {
                try {
                  const delTx = state.db.transaction('offline_waste_surveys', 'readwrite');
                  delTx.objectStore('offline_waste_surveys').delete(item.id);
                } catch(e) {}
              }
            }
          }
        };
      } catch (e) {
        console.warn("IndexedDB sync flush error:", e);
      }
    }

    // 2. Flush localStorage offline surveys & legacy buffers
    try {
      const localStr = localStorage.getItem('pondy_offline_surveys') || localStorage.getItem('offline_waste_surveys');
      if (localStr) {
        const localList = JSON.parse(localStr);
        if (Array.isArray(localList) && localList.length > 0) {
          const remaining = [];
          for (const s of localList) {
            const ok = await syncSurveyToCloud(s);
            if (!ok) remaining.push(s);
          }
          if (remaining.length > 0) {
            localStorage.setItem('pondy_offline_surveys', JSON.stringify(remaining));
          } else {
            localStorage.removeItem('pondy_offline_surveys');
            localStorage.removeItem('offline_waste_surveys');
          }
        }
      }
    } catch (e) {
      console.warn("localStorage sync flush error:", e);
    }
  }

  window.addEventListener('online', flushOfflineBuffer);
  // Periodic sync check every 15 seconds
  setInterval(flushOfflineBuffer, 15000);

  // DRAFT AUTO-SAVE & RESTORATION (Prevents field data loss across form updates/refreshes)
  function saveCurrentDraft() {
    if (!state.activeInterviewer) return;
    const form = document.getElementById('waste-survey-form');
    if (!form) return;
    const formData = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!formData[el.name]) formData[el.name] = [];
        if (el.checked) formData[el.name].push(el.value);
      } else if (el.id) {
        formData[el.id] = el.value;
      }
    });
    localStorage.setItem('pondy_current_draft', JSON.stringify({
      interviewer: state.activeInterviewer,
      startTimestamp: state.startTimestamp,
      data: formData,
      savedAt: Date.now()
    }));
  }

  function restoreDraftIfAvailable() {
    try {
      const draftStr = localStorage.getItem('pondy_current_draft');
      if (!draftStr) return;
      const draft = JSON.parse(draftStr);
      if (draft && draft.data && (Date.now() - draft.savedAt < 86400000)) {
        const form = document.getElementById('waste-survey-form');
        if (!form) return;
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            if (draft.data[el.name] && draft.data[el.name].includes(el.value)) {
              el.checked = true;
            }
          } else if (el.id && draft.data[el.id] !== undefined) {
            el.value = draft.data[el.id];
          }
        });
        if (typeof calcTotalMembers === 'function') calcTotalMembers();
        const cbDustbin = document.getElementById('cb-dustbin-free');
        const incBox = document.getElementById('income-dropdown-container');
        if (cbDustbin && cbDustbin.checked && incBox) {
          incBox.style.display = 'block';
        }
      }
    } catch(e) {}
  }

  // DOM ELEMENTS
  const loginForm = document.getElementById('form-interviewer-login');
  const loginNameInput = document.getElementById('login-int-name');
  const loginTeamSelect = document.getElementById('login-int-team');
  const loginLocationInput = document.getElementById('login-int-location');
  const modalLoginOverlay = document.getElementById('modal-start-confirm');
  const modalSuccessOverlay = document.getElementById('modal-survey-success');
  
  const surveyForm = document.getElementById('waste-survey-form');
  const activeBadge = document.getElementById('interviewer-active-badge');
  const activeNameText = document.getElementById('active-interviewer-name');
  const activeTeamText = document.getElementById('active-interviewer-team');
  const activeTimerDisplay = document.getElementById('active-timer-display');

  // Success Modal Elements
  const successSurveyIdText = document.getElementById('success-survey-id');
  const successIntNameText = document.getElementById('success-int-name');
  const btnNextHousehold = document.getElementById('btn-next-household');
  const btnDownloadCopy = document.getElementById('btn-download-copy');
  const btnSwitchInterviewer = document.getElementById('btn-switch-interviewer');

  // SURVEY MODE SELECTION (FULL 20-QUESTION vs SHORT 10-QUESTION VITAL MODE)
  const modeRadios = document.querySelectorAll('input[name="survey_mode"]');
  const shortNotice = document.getElementById('short-mode-notice');
  const fullOnlyElements = document.querySelectorAll('.full-survey-only');
  const cardChoiceFull = document.getElementById('card-choice-full');
  const cardChoiceShort = document.getElementById('card-choice-short');

  function updateSurveyModeUI(mode) {
    if (mode === 'short') {
      if (shortNotice) shortNotice.style.display = 'block';
      if (cardChoiceShort) cardChoiceShort.classList.add('active');
      if (cardChoiceFull) cardChoiceFull.classList.remove('active');

      fullOnlyElements.forEach(el => {
        el.classList.add('hidden-mode');
        // Unset required on all child inputs when hidden in short mode
        el.querySelectorAll('input, select, textarea').forEach(inp => {
          if (inp.hasAttribute('required')) {
            inp.setAttribute('data-was-required', 'true');
            inp.removeAttribute('required');
          }
        });
      });
    } else {
      if (shortNotice) shortNotice.style.display = 'none';
      if (cardChoiceFull) cardChoiceFull.classList.add('active');
      if (cardChoiceShort) cardChoiceShort.classList.remove('active');

      fullOnlyElements.forEach(el => {
        el.classList.remove('hidden-mode');
        // Restore required attribute on visible inputs in full mode
        el.querySelectorAll('input, select, textarea').forEach(inp => {
          if (inp.getAttribute('data-was-required') === 'true') {
            inp.setAttribute('required', 'required');
          }
        });
      });
    }
  }

  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateSurveyModeUI(e.target.value);
    });
  });

  // Initialize mode UI state on page load
  const initialMode = document.querySelector('input[name="survey_mode"]:checked')?.value || 'full';
  updateSurveyModeUI(initialMode);

  // DYNAMIC "OTHER" SPECIFY INPUT TOGGLE
  document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('other-toggle-cb')) {
      const targetId = e.target.getAttribute('data-specify');
      if (targetId) {
        const input = document.getElementById(targetId);
        if (input) {
          input.style.display = e.target.checked ? 'block' : 'none';
          if (!e.target.checked) input.value = '';
        }
      }
    }
  });

  // HELPER: EXTRACT MULTI-SELECT VALUES & APPEND OTHER SPECIFY DETAILS
  function getCheckedValues(name, specifyInputId) {
    const checkedNodes = document.querySelectorAll(`input[name="${name}"]:checked`);
    const values = Array.from(checkedNodes).map(n => n.value);
    if (values.includes('Other') && specifyInputId) {
      const specifyVal = document.getElementById(specifyInputId)?.value.trim();
      if (specifyVal) {
        const idx = values.indexOf('Other');
        values[idx] = `Other: ${specifyVal}`;
      }
    }
    return values;
  }

  // PRE-FILL SAVED INTERVIEWER NAME & TEAM FROM LOCALSTORAGE
  const savedName = localStorage.getItem('pondy_int_name');
  const savedTeam = localStorage.getItem('pondy_int_team');
  const savedLoc = localStorage.getItem('pondy_int_location');
  if (savedName) loginNameInput.value = savedName;
  if (savedTeam) loginTeamSelect.value = savedTeam;
  if (savedLoc && loginLocationInput) loginLocationInput.value = savedLoc;

  // FUNCTION: START SURVEY SESSION & TIMER
  function startSurveySession(name, team, location) {
    team = team || 'Team 1';
    location = location || 'Field Area';
    
    localStorage.setItem('pondy_int_name', name);
    localStorage.setItem('pondy_int_team', team);
    localStorage.setItem('pondy_int_location', location);

    state.activeInterviewer = {
      id: `INT-${Math.floor(100 + Math.random() * 900)}`,
      name: name || 'Interviewer',
      contact: 'N/A',
      team: team,
      location: location
    };

    // Reset Form for clean household input
    surveyForm.reset();
    document.querySelectorAll('.specify-other-input').forEach(inp => inp.style.display = 'none');
    document.getElementById('pop-male-adult').value = 1;
    document.getElementById('pop-female-adult').value = 1;
    document.getElementById('pop-male-child').value = 0;
    document.getElementById('pop-female-child').value = 0;
    calculatePopulationTotal();
    try { restoreDraftIfAvailable(); } catch(err) {}

    // START TIMER AT THIS EXACT CLICK SECOND
    state.startTimestamp = new Date().toISOString();

    // Enable Form UI
    surveyForm.style.opacity = '1';
    surveyForm.style.pointerEvents = 'auto';
    modalLoginOverlay.classList.remove('active');
    modalSuccessOverlay.classList.remove('active');

    // Show Active Badge & Start Live Clock
    activeBadge.style.display = 'block';
    activeNameText.textContent = state.activeInterviewer.name;
    activeTeamText.textContent = `${state.activeInterviewer.team} • ${state.activeInterviewer.location}`;

    if (state.timerInterval) clearInterval(state.timerInterval);

    const startTimeMs = new Date(state.startTimestamp).getTime();
    state.timerInterval = setInterval(() => {
      const nowMs = Date.now();
      const elapsedSecs = Math.floor((nowMs - startTimeMs) / 1000);
      const mins = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
      const secs = (elapsedSecs % 60).toString().padStart(2, '0');
      activeTimerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // LOGIN FORM SUBMIT (FIRST CHECK-IN)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = loginNameInput.value.trim();
    const team = loginTeamSelect.value;
    const location = loginLocationInput ? loginLocationInput.value.trim() : 'Field Area';
    startSurveySession(name, team, location);
  });

  // POPULATION MATH (AUTO-SUM)
  const popInputs = document.querySelectorAll('.pop-input');
  const popTotalDisplay = document.getElementById('pop-total-display');

  function calculatePopulationTotal() {
    let total = 0;
    popInputs.forEach(input => {
      total += parseInt(input.value || 0, 10);
    });
    if (popTotalDisplay) {
      popTotalDisplay.textContent = `${total} Member${total === 1 ? '' : 's'}`;
    }
    return total;
  }

  popInputs.forEach(input => {
    input.addEventListener('input', calculatePopulationTotal);
  });

  // SUBMIT FORM WITH SERVER SYNC & MODAL RECEIPT
  surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const endTimestamp = new Date().toISOString();
    const totalMembers = calculatePopulationTotal();

    const surveyId = `WST-${Math.floor(10000 + Math.random() * 90000)}`;

    const intName = state.activeInterviewer ? state.activeInterviewer.name : (localStorage.getItem('pondy_int_name') || "Interviewer");
    const intTeam = state.activeInterviewer ? state.activeInterviewer.team : (localStorage.getItem('pondy_int_team') || "Team 1");
    const intLocation = state.activeInterviewer ? state.activeInterviewer.location : (localStorage.getItem('pondy_int_location') || "Field Area");

    // EXTRACT RESPONDENT DEMOGRAPHICS & CONTACT DETAILS (SECTION 0)
    const respWard = document.getElementById('resp-ward')?.value.trim() || 'N/A';
    const respArea = document.getElementById('resp-area')?.value.trim() || 'N/A';
    const respStreet = document.getElementById('resp-street')?.value.trim() || 'N/A';
    const respFamilyHead = document.getElementById('resp-family-head')?.value.trim() || 'Head of Family';
    const respMobile = document.getElementById('resp-mobile')?.value.trim() || '';
    const respEmail = document.getElementById('resp-email')?.value.trim() || '';
    const surveyMode = document.querySelector('input[name="survey_mode"]:checked')?.value || 'full';

    // EXTRACT ALL MULTI-SELECT CHECKBOXES AND OTHER SPECIFY TEXTS (17 STREAMLINED QUESTIONS)
    // Q1: Area Type
    const areaTypeArr = getCheckedValues('q1_area', 'q1-other-input');
    // Q2: Population (Handled in populationBreakdown)
    // Q3: Main Waste Generated
    const mainWasteArr = getCheckedValues('main_waste', 'q3-other-input');
    // Q4: Disposal Method
    const disposalMethodArr = getCheckedValues('q4_dispose_method', 'q4-other-input');
    // Q5: Collection Frequency
    const frequencyArr = getCheckedValues('q5_frequency', 'q5-other-input');
    // Q6: Segregation Practice (Wet & Dry)
    const segregateWasteArr = getCheckedValues('q7_separate', 'q7-other-input');
    // Q7: Reasons for Non-Segregation
    const noSegregateReasonArr = getCheckedValues('q8_no_separate_reason', 'q8-other-input');
    // Q8: Public Dumping Spot
    const illegalDumpingSpot = document.getElementById('q10-illegal-dumping')?.value || '';
    // Q9: Impacts & Nuisances Experienced
    const problemsArr = getCheckedValues('problems', 'q11-other-input');
    // Q10: Difficult Waste Types
    const difficultWasteArr = getCheckedValues('q13_difficult_waste', 'q13-other-input');
    // Q11: Delayed Collection Consequences
    const delayedEffectArr = getCheckedValues('q14_delayed_effect', 'q14-other-input');
    // Q12: Segregation Awareness
    const knowledgeArr = getCheckedValues('q16_knowledge', 'q16-other-input');
    // Q13: Plastic Ban Awareness & Cloth Bag Adoption
    const plasticBanArr = getCheckedValues('q13_plastic_ban', 'q13-ban-other-input');
    // Q14: Convenience of Existing System
    const convenientSystem = document.getElementById('q18-convenient')?.value || '';
    // Q15: Overall Service Satisfaction (1-5 Star)
    const satisfactionArr = getCheckedValues('q15_satisfaction', null);
    // Q16: Community Activity Frequency
    const communityPartArr = getCheckedValues('q22_community_part', 'q22-other-input');
    // Q17: Assistance/Support Needed
    const supportNeededArr = getCheckedValues('q24_support_needed', 'q24-other-input');
    // Q18: Dustbin Preference (Free/Paid)
    const dustbinTypeArr = getCheckedValues('q25_dustbin_type', 'q25-other-input');
    const monthlyIncome = document.getElementById('select-monthly-income')?.value || 'N/A';
    // Q19: Willingness to Pay Nominal Fee (₹30-₹50)
    const willingnessFeeArr = getCheckedValues('q19_willingness_fee', 'q19-fee-other-input');
    // Q20: Single Key Municipal Recommendation
    const finalSuggestion = document.getElementById('q26-final-suggestion')?.value || '';

    const surveyPayload = {
      id: surveyId,
      deviceId: state.deviceId,
      startTimestamp: state.startTimestamp || new Date().toISOString(),
      endTimestamp: endTimestamp,
      interviewerId: state.activeInterviewer ? state.activeInterviewer.id : "INT-101",
      interviewerName: intName,
      team: intTeam,
      location: intLocation,
      
      // SECTION 0: RESPONDENT DEMOGRAPHICS & SURVEY MODE
      surveyMode: surveyMode, // 'full' or 'short'
      ward: respWard,
      area: respArea,
      street: respStreet,
      familyHead: respFamilyHead,
      mobileNumber: respMobile,
      email: respEmail,

      // SECTION 1
      areaTypeArr: areaTypeArr,
      areaType: areaTypeArr.join(', ') || 'Residential area',
      populationBreakdown: {
        maleAdults: parseInt(document.getElementById('pop-male-adult').value || 0, 10),
        femaleAdults: parseInt(document.getElementById('pop-female-adult').value || 0, 10),
        maleChildren: parseInt(document.getElementById('pop-male-child').value || 0, 10),
        femaleChildren: parseInt(document.getElementById('pop-female-child').value || 0, 10),
        totalHouseholdPopulation: totalMembers
      },
      mainWasteTypes: mainWasteArr,
      mainWasteType: mainWasteArr.join(', ') || 'Food waste',

      // SECTION 2
      disposalMethodArr: disposalMethodArr,
      disposalMethod: disposalMethodArr.join(', ') || 'Door-to-door municipal collector (Free)',
      collectionFrequencyArr: frequencyArr,
      collectionFrequency: frequencyArr.join(', ') || 'Daily',
      segregateWasteArr: segregateWasteArr,
      segregateWaste: segregateWasteArr.join(', ') || 'Always',
      noSegregateReasonArr: noSegregateReasonArr,
      noSegregateReason: noSegregateReasonArr.join(', ') || 'N/A - We separate waste',

      // SECTION 3
      illegalDumpingSpot: illegalDumpingSpot,
      experiencedProblems: problemsArr,
      mostDifficultWasteArr: difficultWasteArr,
      mostDifficultWaste: difficultWasteArr.join(', ') || 'Plastic bottles & packaging',
      delayedCollectionEffectArr: delayedEffectArr,
      delayedCollectionEffect: delayedEffectArr.join(', ') || 'Pile up outside gate / street',

      // SECTION 4 (Q12 to Q15)
      segregationKnowledgeArr: knowledgeArr,
      segregationKnowledge: knowledgeArr.join(', ') || 'Yes - Fully Informed',
      plasticBanArr: plasticBanArr,
      plasticBanAwareness: plasticBanArr.join(', ') || 'Always carry cloth/jute bags',
      existingSystemConvenient: convenientSystem,
      satisfactionRatingArr: satisfactionArr,
      satisfactionRating: satisfactionArr.join(', ') || '⭐⭐⭐⭐ Satisfied',

      // SECTION 5 (Q16 to Q20)
      communityParticipationArr: communityPartArr,
      communityParticipation: communityPartArr.join(', ') || 'Monthly',
      supportNeededArr: supportNeededArr,
      supportNeeded: supportNeededArr.join(', ') || 'Regular Door-to-Door Collection',
      dustbinPreferenceArr: dustbinTypeArr,
      dustbinPreference: dustbinTypeArr.join(', ') || 'Free Dustbin',
      monthlyIncome: monthlyIncome,
      willingnessFeeArr: willingnessFeeArr,
      willingnessFee: willingnessFeeArr.join(', ') || 'Yes - Willing to pay nominal fee',
      finalOneThingSuggestion: finalSuggestion
    };

    state.lastSubmittedSurvey = surveyPayload;

    // 1. FAILSAFE LOCAL BUFFER
    await saveLocalBuffer(surveyPayload);

    // 2. SEND TO SERVER & CLOUD DATABASE
    try {
      const synced = await syncSurveyToCloud(surveyPayload);
      if (synced) {
        console.log("Survey synced to cloud database successfully.");
      }
    } catch (err) {
      console.warn("Cloud sync warning. Saved in local IndexedDB.", err);
    }

    // Clear active draft upon successful submission
    localStorage.removeItem('pondy_current_draft');

    // Stop timer & Lock form
    if (state.timerInterval) clearInterval(state.timerInterval);
    surveyForm.style.opacity = '0.3';
    surveyForm.style.pointerEvents = 'none';
    activeBadge.style.display = 'none';

    // Show Success Modal
    successSurveyIdText.textContent = `#${surveyId}`;
    if (successIntNameText) successIntNameText.textContent = intName;

    // CONFIGURE WHATSAPP SHARING CARD IF RESPONDENT HAD LESS TIME (SHORT MODE)
    const whatsappBox = document.getElementById('whatsapp-share-box');
    const btnWhatsappShare = document.getElementById('btn-whatsapp-share');
    const whatsappPhoneDisplay = document.getElementById('whatsapp-phone-display');

    if (surveyMode === 'short' && respMobile) {
      if (whatsappBox) whatsappBox.style.display = 'block';
      if (whatsappPhoneDisplay) whatsappPhoneDisplay.textContent = respMobile;

      const surveyWebUrl = window.location.origin + window.location.pathname;
      const shareMsg = `வணக்கம் ${respFamilyHead},\n\nபுதுச்சேரி வீட்டுக் கழிவு மேலாண்மை கணக்கெடுப்பில் 10 அவசியக் கேள்விகளுக்கு பதிலளித்தமைக்கு நன்றி (பதிவு எண்: #${surveyId}).\n\nமீதமுள்ள விவரங்களை உங்கள் ஓய்வு நேரத்தில் எளிதாக பூர்த்தி செய்ய கீழேயுள்ள இணைப்பை கிளிக் செய்யவும்:\n${surveyWebUrl}?ref=${surveyId}&head=${encodeURIComponent(respFamilyHead)}\n\nநன்றி,\nபுதுச்சேரி நகராட்சி கள ஆய்வுக் குழு (${intName})`;

      const cleanPhone = respMobile.replace(/[^0-9]/g, '');
      const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      if (btnWhatsappShare) {
        btnWhatsappShare.href = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(shareMsg)}`;
      }
    } else {
      if (whatsappBox) whatsappBox.style.display = 'none';
    }

    modalSuccessOverlay.classList.add('active');
  });

  // Track user input in real-time to prevent data loss on device reloads
  surveyForm.addEventListener('input', saveCurrentDraft);
  surveyForm.addEventListener('change', saveCurrentDraft);

  // PDF QUESTIONNAIRE REPORT GENERATOR WITH CHARTS & DATA INTERPRETATION TABLE
  async function generateSurveyPDF(survey) {
    if (!survey) return;

    // Create container mounted temporarily on document.body for html2canvas rendering
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '794px'; // A4 standard width in px
    container.style.padding = '24px';
    container.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";
    container.style.color = '#0f172a';
    container.style.backgroundColor = '#ffffff';
    container.style.boxSizing = 'border-box';
    container.style.zIndex = '999999';
    container.style.opacity = '1';

    const pop = survey.populationBreakdown || {};
    const totalPop = pop.totalHouseholdPopulation || 0;

    // Compute basic interpretation metrics for this household
    const wasteTypesCount = Array.isArray(survey.mainWasteTypes) ? survey.mainWasteTypes.length : 1;
    const isSegregating = (survey.segregateWaste || '').toLowerCase().includes('always') || (survey.segregateWaste || '').toLowerCase().includes('sometimes') || (survey.segregateWaste || '').toLowerCase().includes('yes');
    const takesPaid = (survey.paidServiceWillingness || '').toLowerCase().includes('yes') || (survey.paidServiceWillingness || '').toLowerCase().includes('depends');

    container.innerHTML = `
      <!-- HEADER BRANDING BAR -->
      <div style="border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="color:#059669; margin:0; font-size:20px; font-weight:800; letter-spacing:-0.5px;">PONDICHERRY HOUSEHOLD SURVEY REPORT</h1>
          <p style="margin:4px 0 0 0; color:#64748b; font-size:12px; font-weight:500;">Municipal Solid Waste Management Audit & Analytics Record</p>
        </div>
        <div style="text-align:right; background:#ecfdf5; border:1px solid #a7f3d0; padding:6px 12px; border-radius:8px;">
          <div style="font-size:14px; font-weight:800; color:#047857;">${survey.id}</div>
          <div style="font-size:10px; color:#059669; font-weight:600;">${new Date(survey.endTimestamp || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>

      <!-- METADATA GRID TABLE -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
        <tbody>
          <tr>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:50%;"><strong>Interviewer Name:</strong> ${survey.interviewerName || 'N/A'}</td>
            <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:50%;"><strong>Team & Zone:</strong> ${survey.team || 'Team 1'} (${survey.location || 'Pondicherry'})</td>
          </tr>
          <tr>
            <td style="padding:8px 12px; width:50%;"><strong>Area Category:</strong> ${survey.areaType || 'Residential area'}</td>
            <td style="padding:8px 12px; width:50%;"><strong>Survey Duration:</strong> ${Math.floor((survey.durationSeconds || 120)/60)}m ${(survey.durationSeconds || 120)%60}s</td>
          </tr>
        </tbody>
      </table>

      <!-- DATA INTERPRETATION HIGHLIGHT CARDS -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px;">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#166534; font-weight:700; text-transform:uppercase;">Household Size</div>
          <div style="font-size:18px; font-weight:800; color:#15803d; margin-top:2px;">${totalPop} Members</div>
        </div>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#1e40af; font-weight:700; text-transform:uppercase;">Waste Types</div>
          <div style="font-size:18px; font-weight:800; color:#1d4ed8; margin-top:2px;">${wasteTypesCount} Categories</div>
        </div>
        <div style="background:#fefce8; border:1px solid #fef08a; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#854d0e; font-weight:700; text-transform:uppercase;">Segregation Status</div>
          <div style="font-size:14px; font-weight:800; color:#a16207; margin-top:4px;">${isSegregating ? 'Active' : 'Non-Segregated'}</div>
        </div>
        <div style="background:#faf5ff; border:1px solid #e9d5ff; padding:10px; border-radius:8px; text-align:center;">
          <div style="font-size:10px; color:#6b21a8; font-weight:700; text-transform:uppercase;">Paid Service Willingness</div>
          <div style="font-size:14px; font-weight:800; color:#7e22ce; margin-top:4px;">${takesPaid ? 'Willing' : 'Free Service Only'}</div>
        </div>
      </div>

      <!-- VISUAL CHARTS SECTION (2 COLUMNS) -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:20px;">
        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; background:#ffffff;">
          <h4 style="margin:0 0 10px 0; font-size:12px; color:#334155; font-weight:700; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">Household Demographic Composition</h4>
          <div style="height:140px; position:relative;">
            <canvas id="pdf-chart-pop"></canvas>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; background:#ffffff;">
          <h4 style="margin:0 0 10px 0; font-size:12px; color:#334155; font-weight:700; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">Waste Generation Breakdown</h4>
          <div style="height:140px; position:relative;">
            <canvas id="pdf-chart-waste"></canvas>
          </div>
        </div>
      </div>

      <!-- DETAILED ANSWERS TABLE -->
      <h3 style="font-size:14px; color:#059669; margin:0 0 10px 0; font-weight:800; border-left:4px solid #059669; padding-left:8px;">Complete Household Survey Responses (20 Questions)</h3>
      
      <table style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #e2e8f0; margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9; color:#475569; text-align:left;">
            <th style="padding:8px 10px; border:1px solid #cbd5e1; width:8%;">Q#</th>
            <th style="padding:8px 10px; border:1px solid #cbd5e1; width:42%;">Question Category</th>
            <th style="padding:8px 10px; border:1px solid #cbd5e1; width:50%;">Recorded Answer / Selection</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q1</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Area Type</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.areaType || 'Residential area'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q2</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Household Demographics</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Male Adults: ${pop.maleAdults||0}, Female Adults: ${pop.femaleAdults||0}, Male Children: ${pop.maleChildren||0}, Female Children: ${pop.femaleChildren||0} (Total: ${totalPop})</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q3</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Main Waste Generated</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.mainWasteType || 'Food waste'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q4</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Disposal Method</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.disposalMethod || 'Door-to-door municipal collector'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q5</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Collection Frequency</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.collectionFrequency || 'Daily'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q6</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Wet & Dry Segregation Compliance</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.segregateWaste || 'Always'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q7</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Reason for Non-Segregation</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.noSegregateReason || 'N/A - We separate waste'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q8</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Public Dumping Hotspot Identified</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.illegalDumpingSpot || 'Vacant plots'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q9</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Impacts & Nuisances Experienced</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${Array.isArray(survey.experiencedProblems) ? survey.experiencedProblems.join(', ') : 'Foul smell & Odor'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q10</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Most Difficult Waste Streams</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.mostDifficultWaste || 'Single-use plastics'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q11</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Impact of Delayed/Missed Collection</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.delayedCollectionEffect || 'Piles up outside gate'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q12</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Citizen Segregation Awareness Level</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.segregationKnowledge || 'Yes - Fully aware'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q13</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Plastic Ban & Cloth Bag Adoption</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.plasticBanCompliance || 'Fully compliant - Always carry cloth bag'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q14</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Collection Convenience Assessment</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.existingSystemConvenient || 'Moderately convenient'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q15</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Service Satisfaction Rating (1-5)</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.satisfactionRating ? survey.satisfactionRating + ' Stars' : '4 Stars'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q16</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Community Cleanup Volunteering</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.communityParticipation || 'Monthly'}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q17</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Required Municipal Support</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${Array.isArray(survey.supportNeeded) ? survey.supportNeeded.join(', ') : (survey.supportNeeded || 'Regular Door-to-Door Collection')}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q18</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Dustbin Preference & Eligibility</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${Array.isArray(survey.dustbinPreference) ? survey.dustbinPreference.join(', ') : (survey.dustbinPreference || 'Free Dustbin')} ${survey.monthlyIncome ? '(Monthly Income: ' + survey.monthlyIncome + ')' : ''}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q19</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Willingness to Pay Monthly Fee (₹30-₹50)</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.willingnessToPayFee || 'Yes - Willing to pay'}</td></tr>
          <tr style="background:#fafafa;"><td style="padding:6px 10px; border:1px solid #e2e8f0;">Q20</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Key Municipal Reform Demand</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">${survey.finalOneThingSuggestion || 'Strict door-to-door timing and bins'}</td></tr>
        </tbody>
      </table>

      <!-- QUALITATIVE RECOMMENDATION BOX -->
      <div style="background:#f0fdf4; border-left:4px solid #059669; padding:12px 16px; border-radius:4px; margin-bottom:20px;">
        <h4 style="margin:0 0 4px 0; font-size:12px; color:#047857; font-weight:700;">Final Household Recommendation (Q20):</h4>
        <p style="margin:0; font-size:12px; color:#064e3b; font-style:italic;">"${survey.finalOneThingSuggestion || 'Provide regular morning collection and distribute free segregated dustbins.'}"</p>
      </div>

      <!-- FOOTER -->
      <div style="border-top:1px solid #e2e8f0; padding-top:10px; text-align:center; font-size:10px; color:#94a3b8;">
        Pondicherry Urban Development Agency • Heritage Town Survey Project • Authenticated Field Record
      </div>
    `;

    document.body.appendChild(container);

    // Render Canvas Charts inside PDF container using Chart.js if available
    try {
      if (typeof Chart !== 'undefined') {
        const ctxPop = container.querySelector('#pdf-chart-pop').getContext('2d');
        new Chart(ctxPop, {
          type: 'doughnut',
          data: {
            labels: ['Male Adults', 'Female Adults', 'Male Children', 'Female Children'],
            datasets: [{
              data: [pop.maleAdults||2, pop.femaleAdults||2, pop.maleChildren||1, pop.femaleChildren||1],
              backgroundColor: ['#4f46e5', '#ec4899', '#0284c7', '#f59e0b']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } } }
        });

        const ctxWaste = container.querySelector('#pdf-chart-waste').getContext('2d');
        const wasteLabels = Array.isArray(survey.mainWasteTypes) && survey.mainWasteTypes.length > 0 ? survey.mainWasteTypes : ['Food waste', 'Plastic'];
        new Chart(ctxWaste, {
          type: 'bar',
          data: {
            labels: wasteLabels,
            datasets: [{
              label: 'Selected Types',
              data: wasteLabels.map(() => 1),
              backgroundColor: '#059669'
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { display: false } } }
        });

        // Small pause to ensure Chart.js renders onto canvas
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (chartErr) {
      console.warn("PDF chart render warning:", chartErr);
    }

    const opt = {
      margin: 6,
      filename: `Survey_Report_${survey.id}_${(survey.interviewerName || 'Field').replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 800
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      if (typeof html2pdf !== 'undefined') {
        await html2pdf().set(opt).from(container).save();
      } else {
        window.print();
      }
    } finally {
      // Clean up temporary mounted container
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  // POST-SUBMISSION ACTIONS
  btnNextHousehold.addEventListener('click', () => {
    const name = state.activeInterviewer ? state.activeInterviewer.name : (localStorage.getItem('pondy_int_name') || "Interviewer");
    const team = state.activeInterviewer ? state.activeInterviewer.team : (localStorage.getItem('pondy_int_team') || "Team 1");
    const location = state.activeInterviewer ? state.activeInterviewer.location : (localStorage.getItem('pondy_int_location') || "Field Area");
    startSurveySession(name, team, location);
  });

  if (btnDownloadCopy) {
    btnDownloadCopy.addEventListener('click', () => {
      if (!state.lastSubmittedSurvey) return;
      generateSurveyPDF(state.lastSubmittedSurvey);
    });
  }

  const btnUnsubmitForm = document.getElementById('btn-unsubmit-form');
  if (btnUnsubmitForm) {
    btnUnsubmitForm.addEventListener('click', () => {
      if (!state.lastSubmittedSurvey) return;

      // Close modal
      modalSuccessOverlay.classList.remove('active');

      // Unlock form
      surveyForm.style.opacity = '1';
      surveyForm.style.pointerEvents = 'auto';
      activeBadge.style.display = 'inline-flex';

      // Resume live timer
      state.timerSeconds = 0;
      if (state.timerInterval) clearInterval(state.timerInterval);
      state.timerInterval = setInterval(() => {
        state.timerSeconds++;
        const mins = Math.floor(state.timerSeconds / 60);
        const secs = state.timerSeconds % 60;
        if (timerDisplay) {
          timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }, 1000);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (btnSwitchInterviewer) {
    btnSwitchInterviewer.addEventListener('click', () => {
      modalSuccessOverlay.classList.remove('active');
      modalLoginOverlay.classList.add('active');
      
      // Clear typed name and focus input for fast new interviewer registration
      loginNameInput.value = '';
      setTimeout(() => loginNameInput.focus(), 200);
    });
  }

  // LIVE TELEMETRY: PERIODICALLY UPDATE CLOUD SURVEY COUNT IN NAV BADGE
  async function updateCloudSurveyCountBadge() {
    const badge = document.getElementById('header-live-count');
    if (!badge) return;
    try {
      if (window.location.protocol.startsWith('http')) {
        const res = await fetch('/api/submissions');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            badge.textContent = list.length.toLocaleString();
            return;
          }
        }
      }
      const idxRes = await fetch(`${KVDB_BASE}/${INDEX_KEY}?nocache=${Date.now()}`);
      if (idxRes.ok) {
        const idxData = await idxRes.json();
        if (idxData.chunks && Array.isArray(idxData.chunks)) {
          const headChunk = idxData.chunks[0];
          const headRes = await fetch(`${KVDB_BASE}/${headChunk}?nocache=${Date.now()}`);
          const headList = headRes.ok ? await headRes.json() : [];
          const totalCount = ((idxData.chunks.length - 1) * 250) + (Array.isArray(headList) ? headList.length : 0);
          badge.textContent = totalCount.toLocaleString();
        }
      }
    } catch (e) {}
  }

  setInterval(updateCloudSurveyCountBadge, 5000);
  updateCloudSurveyCountBadge();

  await initIndexedDB();
});
