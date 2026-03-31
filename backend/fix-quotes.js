const fs = require('fs');
let content = fs.readFileSync('d:/wind-energy-project/EnergyDNA/backend/server.js', 'utf8');
const count = (content.match(/console\.error\(\[500 ERROR\]/g) || []).length;
content = content.replace(/console\.error\(\[500 ERROR\]/g, "console.error('[500 ERROR]'");
fs.writeFileSync('d:/wind-energy-project/EnergyDNA/backend/server.js', content);
console.log(`Fixed ${count} occurrences`);
