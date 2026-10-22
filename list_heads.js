const fs = require('fs');
const surveys = JSON.parse(fs.readFileSync('surveys_backup_raw.json', 'utf8'));

const headMap = {};
surveys.filter(s => s.familyHead && s.familyHead.trim() !== '').forEach(s => {
  const norm = s.familyHead.trim().toLowerCase();
  if (!headMap[norm]) headMap[norm] = [];
  headMap[norm].push(s);
});

console.log('All 16 Family Heads:');
Object.entries(headMap).forEach(([name, list]) => {
  const s = list[0];
  console.log('Head: "' + name + '" -> ' + list.length + ' entries. Int: ' + s.interviewerName + ', Ward: ' + s.ward + ', Area: ' + (s.area || s.location) + ', Mobile: ' + s.mobileNumber);
});
