const fs = require('fs');
const surveys = JSON.parse(fs.readFileSync('surveys_backup_raw.json', 'utf8'));

// 1. Check exact ID duplicates
const byId = {};
surveys.forEach(s => {
  byId[s.id] = (byId[s.id] || 0) + 1;
});
const duplicateIds = Object.entries(byId).filter(([k,v]) => v > 1);
console.log('Total surveys:', surveys.length);
console.log('Unique IDs:', Object.keys(byId).length);
console.log('Duplicate IDs count:', duplicateIds.length);
console.log('Duplicate IDs sample:', duplicateIds.slice(0, 10));

// 2. Check Respondent Name (familyHead)
const withHead = surveys.filter(s => s.familyHead && s.familyHead.trim() !== '');
console.log('\nSurveys with familyHead specified:', withHead.length);

const headMap = {};
withHead.forEach(s => {
  const norm = s.familyHead.trim().toLowerCase();
  if (!headMap[norm]) headMap[norm] = [];
  headMap[norm].push(s);
});

console.log('Unique family head names:', Object.keys(headMap).length);
const repeatedHeads = Object.entries(headMap).filter(([k, list]) => list.length > 1);
console.log('Repeated family head names count:', repeatedHeads.length);
console.log('Repeated family heads details:');
repeatedHeads.forEach(([name, list]) => {
  console.log(`- "${name}" appears ${list.length} times:`);
  list.forEach(s => {
    console.log(`    ID: ${s.id}, Int: ${s.interviewerName}, Ward: ${s.ward}, Area: ${s.area || s.location}, Mobile: ${s.mobileNumber}, Time: ${s.endTimestamp}`);
  });
});
