/**
 * Order text files by key.
 */

const fs = require('fs');
const path = require('path');

const textFilesDir = path.resolve(__dirname, 'src');

fs.readdirSync(textFilesDir).forEach((filename) => {
  const filepath = path.resolve(textFilesDir, filename);
  const rawFile = fs.readFileSync(filepath, 'utf-8');
  const content = JSON.parse(rawFile);
  const sortedContent = {};
  Object.keys(content)
    .sort()
    .forEach((key) => {
      sortedContent[key] = content[key];
    });
  fs.writeFileSync(filepath, JSON.stringify(sortedContent, null, 2));
});
