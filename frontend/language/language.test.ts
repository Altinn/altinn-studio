import fs from 'fs';
import path from 'path';

const langFilesDir = path.resolve(__dirname, 'src');
const files = fs.readdirSync(langFilesDir);
const langFiles = [];
files.forEach((filename) => {
  const filepath = path.resolve(langFilesDir, filename);
  const rawFile = fs.readFileSync(filepath, 'utf-8');
  const content = JSON.parse(rawFile);
  langFiles.push([filename, content]);
});
const allKeys = [];
langFiles.forEach((file) => {
  Object.keys(file[1]).forEach((key) => allKeys.push(key));
});
const uniqueKeys = [...new Set(allKeys)];
uniqueKeys.sort();
describe('Text files', () => {
  test.skip.each(langFiles)('%s should have all keys in all files', (filename, content) => {
    expect(Object.keys(content)).toBe(uniqueKeys);
  });

  test.each(langFiles)('%s should be sorted alphabetically', (filename, content) => {
    const sortedKeys = Object.keys(content).sort();
    expect(Object.keys(content)).toEqual(sortedKeys);
  });
});
