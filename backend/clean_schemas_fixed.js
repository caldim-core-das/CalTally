const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove `schema: '...'` completely from any options block
  content = content.replace(/schema:\s*['"][^'"]+['"],?\s*/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log('Cleaned', file);
}
