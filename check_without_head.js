const fs = require('fs');
const surveys = JSON.parse(fs.readFileSync('surveys_backup_raw.json', 'utf8'));

const withoutHead = surveys.filter(s => !s.familyHead || s.familyHead.trim() === '');
console.log('Surveys without familyHead:', withoutHead.length);

const intMap = {};
withoutHead.forEach(s => {
  const name = (s.interviewerName || 'Unknown').trim();
  intMap[name] = (intMap[name] || 0) + 1;
});
console.log('Interviewer distribution for surveys without familyHead:', intMap);

// Check if there are exact duplicate IDs among withoutHead
const idMap = {};
withoutHead.forEach(s => {
  idMap[s.id] = (idMap[s.id] || 0) + 1;
});
console.log('Unique IDs among withoutHead:', Object.keys(idMap).length);
const dups = Object.entries(idMap).filter(([k,v]) => v > 1);
console.log('Duplicates by ID among withoutHead:', dups.length, dups);
