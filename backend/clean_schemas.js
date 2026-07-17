const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  
  // Remove schema: '...' from timestamps or tableName blocks
  if (content.includes("schema: '")) {
    content = content.replace(/schema:\s*'[^']+',\s*/g, '');
    modified = true;
  }
  
  // Remove invalid 4th arguments or association arguments
  if (content.includes(", { schema: '")) {
    content = content.replace(/,\s*\{\s*schema:\s*'[^']+'\s*\}/g, '');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned ${file}`);
  }
}
