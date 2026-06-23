const fs = require('fs');
const path = require('path');

const words = new Set();
const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) {
      walk(fp);
    } else if (fp.endsWith('.tsx')) {
      const content = fs.readFileSync(fp, 'utf8');
      
      const matches = content.match(/>\s*([^<{}]+)\s*</g);
      if (matches) {
        matches.forEach(m => {
          const text = m.replace(/>|</g, '').trim();
          if (text.length > 2 && /[a-zA-Z]/.test(text) && !vietnameseChars.test(text)) {
            words.add(text);
          }
        });
      }
      
      const placeholders = content.match(/placeholder=[\"']([^\"']+)[\"']/g);
      if (placeholders) {
        placeholders.forEach(m => {
          const text = m.replace(/placeholder=[\"']/, '').slice(0, -1);
          if (text.length > 2 && /[a-zA-Z]/.test(text) && !vietnameseChars.test(text)) {
            words.add(text);
          }
        });
      }
    }
  }
}

walk('src');
fs.writeFileSync('english_strings.json', JSON.stringify(Array.from(words), null, 2));
console.log('Done, found ' + words.size + ' potential strings');
