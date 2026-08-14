const fs = require('fs');
const content = fs.readFileSync('error-capture.log', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(Math.max(lines.length - 20, 0)).join('\n'));
