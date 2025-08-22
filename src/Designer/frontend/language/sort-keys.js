/**
 * Order text files by key.
 */

const fs = require('fs');
const path = require('path');

const makeJsonStringFromObject = (obj) => JSON.stringify(obj, null, 2);
const appendLineBreak = (str) => `${str}\n`;
const createFileContent = (obj) => appendLineBreak(makeJsonStringFromObject(obj));

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
  const fileContent = createFileContent(sortedContent);
  fs.writeFileSync(filepath, fileContent);
});
