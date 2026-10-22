/**
 * GOOGLE APPS SCRIPT: STREAMLINED 15-QUESTION PONDICHERRY HOUSEHOLD SURVEY
 * Integrates all concepts from the comprehensive 25-question audit into 15 high-impact questions.
 * 
 * FEATURES:
 * - Respondent Profile (Ward, Locality, Street, Family Head, Mobile Number [OPTIONAL])
 * - Exactly 15 Comprehensive Concept Questions (Zero monthly income requirement)
 * - Auto-creates Google Form & links to Google Sheet in Drive
 * 
 * HOW TO RUN:
 * 1. Open Google Apps Script: https://script.google.com
 * 2. Paste this entire code into the editor.
 * 3. Click Save (floppy disk) and click "Run" (play icon).
 * 4. The execution log outputs the published form link and responses spreadsheet!
 */

function doGet(e) {
  return createPondicherryHouseholdSurveyForm();
}

function createPondicherryHouseholdSurveyForm() {
  const formTitle = "புதுச்சேரி வீட்டுக் கழிவு மேலாண்மை கணக்கெடுப்பு / Pondicherry Household Waste Management Survey";
  const formDesc = "புதுச்சேரி நகராட்சி திடக்கழிவு மேலாண்மை அதிகாரப்பூர்வ கள ஆய்வு.\nOfficial Municipal Solid Waste Management Field Survey for Pondicherry Households (15 Streamlined Core Questions).";

  // 1. Create the new Google Form in Drive
  const form = FormApp.create(formTitle);
  form.setDescription(formDesc);
  form.setIsQuiz(false);
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);

  Logger.log("Creating Form: " + formTitle);

  // ==========================================
  // SECTION 0: INTERVIEWER & RESPONDENT PROFILE
  // ==========================================
  form.addSectionHeaderItem()
    .setTitle("கள ஆய்வாளர் விவரங்கள் / Field Interviewer Information")
    .setHelpText("கள ஆய்வாளர் அடையாளம் / Field student details");

  form.addTextItem()
    .setTitle("கள ஆய்வாளர் பெயர் / Interviewer Name")
    .setRequired(true);

  form.addListItem()
    .setTitle("ஒதுக்கப்பட்ட குழு / Assigned Team")
    .setChoiceValues(["Team 1", "Team 2", "Team 3", "Team 4"])
    .setRequired(true);

  form.addSectionHeaderItem()
    .setTitle("பதிலளிப்பவர் மற்றும் முகவரி விவரங்கள் / Respondent Profile & Household Address")
    .setHelpText("வார்டு, பகுதி, தெரு, குடும்பத் தலைவர் பெயர் மற்றும் தொடர்பு / Ward, Street, Family Head & Contact");

  form.addTextItem()
    .setTitle("நகராட்சி வார்டு எண் / Ward Number")
    .setHelpText("எ.கா: Ward 12 / முத்தியால்பேட்டை")
    .setRequired(true);

  form.addTextItem()
    .setTitle("பகுதி / Locality or Area Name")
    .setHelpText("எ.கா: அன்னை தெரசா நகர் / மூலக்குளம்")
    .setRequired(true);

  form.addTextItem()
    .setTitle("தெரு பெயர் & கதவு எண் / Street Name & Door No.")
    .setHelpText("எ.கா: 4வது குறுக்கு தெரு, கதவு எண்: 12B")
    .setRequired(true);

  form.addTextItem()
    .setTitle("குடும்பத் தலைவர் பெயர் / Name of Family Head")
    .setRequired(true);

  // MOBILE NUMBER: EXPLICITLY OPTIONAL AS REQUESTED
  form.addTextItem()
    .setTitle("பெரியவரின் மொபைல் எண் (WhatsApp) / Mobile Number (Adult) [Optional / விருப்பப்பட்டால்]")
    .setHelpText("10 இலக்க மொபைல் எண் / 10-digit mobile number for WhatsApp updates (விருப்பப்பட்டால் மட்டும்)")
    .setRequired(false);

  // ==========================================
  // SECTION 1: HOUSEHOLD PROFILE & MAIN WASTE (Q1 - Q3)
  // ==========================================
  form.addPageBreakItem()
    .setTitle("பகுதி 1: அடிப்படையும் கழிவு வகைகளும் / Locality & Waste Generation")
    .setHelpText("கேள்விகள் 1 முதல் 3 / Questions 1 to 3");

  // Q1: Area Type
  form.addCheckboxItem()
    .setTitle("1. நீங்கள் எந்த வகையான பகுதியில் வசிக்கிறீர்கள்? / What type of area do you live in? (Select All That Apply)")
    .setChoiceValues([
      "குடியிருப்பு பகுதி / Residential area",
      "சேரி / குறைந்த வருவாய் பகுதி / Slum/low-income area",
      "அபார்ட்மெண்ட் / Apartment",
      "கிராமப்புற பகுதி / Rural area",
      "வணிக பகுதி / Commercial area",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q2: Household Demographics & Family Math
  form.addSectionHeaderItem()
    .setTitle("2. உங்கள் வீட்டில் எத்தனை பேர் வசிக்கிறார்கள்? / How many people live in your household?")
    .setHelpText("குடும்ப உறுப்பினர் எண்ணிக்கை / Enter number of adult males, females & children");

  form.addTextItem().setTitle("ஆண்கள் (பெரியவர்கள்) / Adult Males (18+)").setRequired(true);
  form.addTextItem().setTitle("பெண்கள் (பெரியவர்கள்) / Adult Females (18+)").setRequired(true);
  form.addTextItem().setTitle("சிறுவர்கள் (ஆண்) / Children (Male, <18)").setRequired(true);
  form.addTextItem().setTitle("சிறுமிகள் (பெண்) / Children (Female, <18)").setRequired(true);

  // Q3: Primary Household Waste Generated
  form.addCheckboxItem()
    .setTitle("3. உங்கள் வீட்டில் அதிகமாக உருவாகும் கழிவு வகைகள் எவை? / What are the main types of waste generated in your household? (Select All That Apply)")
    .setChoiceValues([
      "உணவுக் கழிவுகள் / Food & kitchen waste",
      "பிளாஸ்டிக் (பாட்டில்கள், பைகள்) / Plastics (bottles & carry bags)",
      "காகிதம் & அட்டை / Paper & cardboard",
      "கண்ணாடி / Glass containers",
      "மின்சாரக் கழிவுகள் / E-waste (batteries, cables)",
      "சுகாதாரக் கழிவுகள் (நாப்கின், டயப்பர்) / Sanitary waste & diapers",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 2: DISPOSAL, FREQUENCY & SEGREGATION (Q4 - Q6)
  // ==========================================
  form.addPageBreakItem()
    .setTitle("பகுதி 2: அகற்றும் முறைகளும் தரம் பிரித்தலும் / Disposal, Collection & Segregation")
    .setHelpText("கேள்விகள் 4 முதல் 6 / Questions 4 to 6");

  // Q4: Disposal Method
  form.addCheckboxItem()
    .setTitle("4. உங்கள் வீட்டுக் கழிவுகளை எவ்வாறு அகற்றுகிறீர்கள்? / How do you currently dispose of household waste? (Select All That Apply)")
    .setChoiceValues([
      "வீடு தேடி வரும் இலவச நகராட்சி சேகரிப்பாளர் / Door-to-door municipal collector (Free)",
      "தனியார் கட்டண சேகரிப்பாளர் / Private paid collector",
      "பொதுக் குப்பைத் தொட்டி / Community public bin",
      "காலி மனை / தெருவில் கொட்டுதல் / Dump on vacant plot or street",
      "எரித்தல் / Burn waste locally",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q5: Collection Frequency
  form.addCheckboxItem()
    .setTitle("5. உங்கள் பகுதியில் எவ்வளவு அடிக்கடி கழிவுகள் சேகரிக்கப்படுகின்றன? / How often is waste collected in your area? (Select All That Apply)")
    .setChoiceValues([
      "தினமும் / Daily",
      "ஒரு நாள் விட்டு ஒரு நாள் / Alternate Days",
      "வாரத்திற்கு இருமுறை / Twice a week",
      "வாரத்திற்கு ஒருமுறை / Once a week",
      "முறையற்றது / அரிதாக / Irregular or Rarely",
      "சேகரிக்கப்படுவதில்லை / Never collected",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q6: Segregation Practice & Key Reason If Not (Unified)
  form.addCheckboxItem()
    .setTitle("6. வீட்டுக் கழிவுகளை மட்கும் மற்றும் மட்காதவையாகப் பிரிக்கிறீர்களா? பிரிக்காவிட்டால் காரணம்? / Do you separate wet and dry waste? If not, why? (Select All That Apply)")
    .setChoiceValues([
      "எப்போதும் பிரிப்போம் / Always separate wet & dry",
      "சில நேரங்களில் பிரிப்போம் / Sometimes separate",
      "பிரிப்பதில்லை: விழிப்புணர்வு இன்மை / Never: Lack of awareness",
      "பிரிப்பதில்லை: நகராட்சி தனியாக எடுப்பதில்லை / Never: No separate collection by municipality",
      "பிரிப்பதில்லை: இடப்பற்றாக்குறை / நேரமின்மை / Never: Lack of space or time",
      "பிரிப்பதில்லை: சிரமமானது / Never: Inconvenient",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 3: PROBLEMS, DUMPING & DELAYS (Q7 - Q10)
  // ==========================================
  form.addPageBreakItem()
    .setTitle("பகுதி 3: சுற்றுச்சூழல் பாதிப்புகளும் சிரமங்களும் / Dumping Hotspots & Impacts")
    .setHelpText("கேள்விகள் 7 முதல் 10 / Questions 7 to 10");

  // Q7: Public Dumping Hotspot
  form.addTextItem()
    .setTitle("7. மக்கள் கழிவுகளை பொது இடங்களில் கொட்டுகிறார்களா? ஆம் எனில், எங்கே? / Do people dump waste in public places? If yes, where?")
    .setHelpText("எ.கா: இ.சி.ஆர் சாலை சந்திப்பு காலி மனை, தெரு முக்கு / e.g., Vacant plot near street corner")
    .setRequired(true);

  // Q8: Environmental Nuisances & Delayed Collection Impacts (Unified)
  form.addCheckboxItem()
    .setTitle("8. பொது இடத்தில் கொட்டுவதாலும் காலதாமத சேகரிப்பாலும் ஏற்படும் பாதிப்புகள் என்ன? / What are the impacts of public dumping and delayed collection? (Select All That Apply)")
    .setChoiceValues([
      "துர்நாற்றம் & கொசுக்கள் / Bad smell, mosquitoes & insects",
      "தெரு நாய், மாடு, பன்றி மற்றும் எலிகள் / Stray animals (dogs, cows, rats)",
      "சாக்கடை அடைப்பு / Blocked stormwater drains",
      "குப்பை எரிப்பதால் புகை / Air pollution due to burning waste",
      "தெருவில் நிரம்பி வழியும் குப்பை / Overflowing garbage outside gate",
      "பிளாஸ்டிக் கழிவுகள் சுற்றுப்புற சீர்கேடு / Plastic litter pollution",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q9: Most Difficult Waste Stream to Dispose
  form.addCheckboxItem()
    .setTitle("9. எந்த வகையான கழிவை அகற்றுவது மிகவும் கடினமாக உள்ளது? / Which type of waste is most difficult for you to dispose of? (Select All That Apply)")
    .setChoiceValues([
      "பிளாஸ்டிக் பாட்டில்கள் & கவர் / Packaging plastics & bottles",
      "சுகாதாரக் கழிவுகள் (நாப்கின், டயப்பர்) / Sanitary napkins & diapers",
      "மின்சாரக் கழிவுகள் (பேட்டரி, வயர்) / E-waste (batteries, cables)",
      "மருத்துவக் கழிவுகள் / Hazardous or Medical waste",
      "கண்ணாடி கழிவுகள் / Broken glass & ceramics",
      "ஈரமான உணவுக் கழிவுகள் / Wet kitchen food scraps",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q10: Single-Use Plastic Ban & Cloth Bag Adoption
  form.addCheckboxItem()
    .setTitle("10. புதுச்சேரி ஒருமுறை பயன்படுத்தும் பிளாஸ்டிக் தடை பற்றிய விழிப்புணர்வு உள்ளதா? துணிப்பை பயன்படுத்துகிறீர்களா? / Plastic ban awareness and cloth bag usage? (Select All That Apply)")
    .setChoiceValues([
      "ஆம் - எப்போதும் துணிப்பை பயன்படுத்துகிறேன் / Yes - Always carry cloth/jute bags",
      "விழிப்புணர்வு உண்டு, சில சமயம் பிளாஸ்டிக் பயன்படுத்துகிறேன் / Aware but sometimes still use plastic",
      "பிளாஸ்டிக் தடை பற்றி தெரியாது / Not aware of plastic ban",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // ==========================================
  // SECTION 4: CONVENIENCE & CITIZEN PREFERENCES (Q11 - Q15)
  // ==========================================
  form.addPageBreakItem()
    .setTitle("பகுதி 4: திருப்தி, தீர்வுகள் மற்றும் பரிந்துரைகள் / Satisfaction, Dustbins & Reforms")
    .setHelpText("கேள்விகள் 11 முதல் 15 / Questions 11 to 15");

  // Q11: Existing Collection Convenience & Reasoning
  form.addParagraphTextItem()
    .setTitle("11. தற்போதுள்ள கழிவு சேகரிப்பு முறை உங்களுக்கு வசதியாக உள்ளதா? ஏன்? / Is existing collection system convenient for you? Why/why not?")
    .setHelpText("எ.கா: காலை நேரம் நிலையாக இல்லை / e.g., Irregular morning tipper arrival")
    .setRequired(true);

  // Q12: Overall Municipal Waste Service Satisfaction (1 - 5 Stars)
  form.addListItem()
    .setTitle("12. புதுச்சேரி நகராட்சியின் ஒட்டுமொத்த கழிவு மேலாண்மை சேவையில் உங்கள் திருப்தி நிலை என்ன? / Overall Satisfaction Rating with Municipal Waste Service?")
    .setChoiceValues([
      "⭐⭐⭐⭐⭐ மிக திருப்தி / Very Satisfied (5/5)",
      "⭐⭐⭐⭐ திருப்தி / Satisfied (4/5)",
      "⭐⭐⭐ நடுத்தரமானது / Neutral (3/5)",
      "⭐⭐ திருப்தியின்மை / Dissatisfied (2/5)",
      "⭐ மிக திருப்தியின்மை / Very Dissatisfied (1/5)"
    ])
    .setRequired(true);

  // Q13: Required Assistance & Community Drives (Unified)
  form.addCheckboxItem()
    .setTitle("13. கழிவுகளை சிறப்பாக நிர்வகிக்க உங்களுக்கு என்ன உதவி தேவை? சமூக தூய்மைப் பணியில் பங்கேற்பீர்களா? / Assistance needed & willingness to join community cleanup? (Select All That Apply)")
    .setChoiceValues([
      "சீரான வீடு வீடான தினசரி சேகரிப்பு / Regular Door-to-Door Daily Collection",
      "மட்கும் & மட்கா கழிவுகளுக்கு தனித்தனி தொட்டிகள் / Separate Wet & Dry Dustbins",
      "கழிவுகளை தரம் பிரிக்கும் விழிப்புணர்வு பயிற்சி / Waste Segregation Training",
      "வீட்டு உரமாக்கல் வழிகாட்டல் / Home Composting Guidance",
      "மாதந்தோறும் சமூக தூய்மைப் பணியில் பங்கேற்பேன் / Ready to join monthly community cleanup",
      "ஆண்டிற்கு ஒருமுறை சமூகப் பணியில் பங்கேற்பேன் / Ready to join annual cleanup drives",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q14: Dustbin Preference & Willingness to Pay Nominal Monthly Fee (Unified) - NO MONTHLY INCOME SHIT
  form.addCheckboxItem()
    .setTitle("14. குப்பைத் தொட்டி விருப்பம் மற்றும் மாத பயனர் கட்டணம் (₹30-₹50) செலுத்தும் விருப்பம்? / Dustbin preference and willingness to pay nominal monthly fee (₹30-₹50)? (Select All That Apply)")
    .setChoiceValues([
      "இலவச குப்பைத் தொட்டி வேண்டும் / Need Free Dustbin",
      "கட்டணக் குப்பைத் தொட்டி வாங்கத் தயார் / Ready to purchase Dustbin",
      "ஏற்கனவே குப்பைத் தொட்டி உள்ளது / Already have proper dustbins",
      "நம்பகமான தினசரி சேவைக்கு சிறு கட்டணம் (₹30-₹50) செலுத்த தயார் / Willing to pay nominal monthly fee (₹30-₹50) for reliable daily service",
      "சேவை தினமும் சீராக இருந்தால் மட்டுமே கட்டணம் செலுத்துவோம் / Pay only if collection is 100% daily & reliable",
      "முற்றிலும் இலவசமாக வழங்கப்பட வேண்டும் / Must be completely free without fee",
      "ஏதுமில்லை / Nil or None"
    ])
    .showOtherOption(true)
    .setRequired(true);

  // Q15: Single Key Municipal Recommendation (Final Reform)
  form.addParagraphTextItem()
    .setTitle("15. புதுச்சேரி கழிவு மேலாண்மையில் ஒரு முக்கிய மாற்றத்தை செய்ய முடிந்தால், அது என்னவாக இருக்கும்? / If you could change ONE key thing about waste management, what would it be?")
    .setHelpText("நகராட்சி அதிகாரிகளுக்கு உங்கள் முதன்மையான யோசனை / Your single most important recommendation for municipal authorities...")
    .setRequired(true);

  // Link to responses Google Sheet automatically
  const ss = SpreadsheetApp.create("Pondicherry_Household_Survey_Responses_15Q");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  const publishedUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = ss.getUrl();

  Logger.log("\n========================================================");
  Logger.log("🎉 SUCCESS! 15-QUESTION STREAMLINED GOOGLE FORM CREATED!");
  Logger.log("1. VIEW / FILL LIVE FORM LINK: " + publishedUrl);
  Logger.log("2. EDIT FORM IN GOOGLE DRIVE:  " + editUrl);
  Logger.log("3. LIVE RESPONSES SPREADSHEET: " + sheetUrl);
  Logger.log("========================================================\n");

  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #0b1120; color: #f8fafc; padding: 40px 20px; text-align: center; margin: 0;">
        <div style="max-width: 650px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.2); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px auto; line-height: 64px;">✓</div>
          <h2 style="color: #ffffff; margin-bottom: 8px;">15-Question Streamlined Google Form Created!</h2>
          <p style="color: #94a3b8; font-size: 15px; margin-top: 0;">Covers all 25 core concepts in 15 questions, mobile optional, and monthly income removed.</p>
          
          <div style="margin-top: 28px; text-align: left; display: flex; flex-direction: column; gap: 16px;">
            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="display: block; font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">1. Live Form Link (Send to Students)</span>
              <a href="${publishedUrl}" target="_blank" style="display: inline-block; margin-top: 6px; color: #60a5fa; word-break: break-all; text-decoration: underline; font-weight: 600;">${publishedUrl}</a>
            </div>

            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="display: block; font-size: 12px; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px;">2. Edit Form in Google Drive</span>
              <a href="${editUrl}" target="_blank" style="display: inline-block; margin-top: 6px; color: #d8b4fe; word-break: break-all; text-decoration: underline; font-weight: 600;">${editUrl}</a>
            </div>

            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="display: block; font-size: 12px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px;">3. Response Google Sheet (Auto-Linked)</span>
              <a href="${sheetUrl}" target="_blank" style="display: inline-block; margin-top: 6px; color: #6ee7b7; word-break: break-all; text-decoration: underline; font-weight: 600;">${sheetUrl}</a>
            </div>
          </div>

          <div style="margin-top: 30px;">
            <a href="${publishedUrl}" target="_blank" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 28px; font-weight: 700; border-radius: 8px; text-decoration: none;">Open Live Form Now →</a>
          </div>
        </div>
      </body>
    </html>
  `);
}
