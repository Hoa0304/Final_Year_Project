const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Add keyboardShouldPersistTaps to ScrollView
      content = content.replace(/<ScrollView(?!\s+keyboardShouldPersistTaps)/g, '<ScrollView keyboardShouldPersistTaps="handled"');
      
      // Add keyboardShouldPersistTaps to FlatList
      content = content.replace(/<FlatList(?!\s+keyboardShouldPersistTaps)/g, '<FlatList keyboardShouldPersistTaps="handled"');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

walk('src/screens');
console.log('Finished updating ScrollViews and FlatLists');
