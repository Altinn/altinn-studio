const fs = require('fs');
const ini = require('ini');

const [, , customFile, baseFile, mergedFile] = process.argv;

if (!customFile || !baseFile || !mergedFile) {
  console.error('Usage: node merge.js <custom-values.ini> <base-values.ini> <merged-values.ini>');
  process.exit(1);
}

/**
 * The ini package does not support having the same name for both a section
 * and a key (e.g., filter, error, etc). To prevent conflicts, this function appends "Section"
 * to the names of all section headers in the .ini file content.
 */
const updateSectionNames = (content) =>
  content
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        return `[${trimmedLine.slice(1, -1)}Section]`;
      }
      return line;
    })
    .join('\n');

/**
 * Replaces base values with custom values
 */
const merge = (baseContent, customContent) => {
  const customIni = ini.parse(customContent);
  let currentSection = '';
  return baseContent
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        currentSection = trimmedLine.slice(1, -1) + 'Section';
      }

      const keyValueMatch = trimmedLine.match(/([^=]+)=(.*)/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        let value = keyValueMatch[2].trim();

        const newValue = currentSection ? customIni[currentSection]?.[key] : customIni[key];
        return `${key} = ${newValue !== undefined ? ini.safe(newValue) : value}`;
      }

      return line;
    })
    .join('\n');
};

let baseFileContent = fs.readFileSync(baseFile, 'utf-8');
let customFileContent = fs.readFileSync(customFile, 'utf-8');
customFileContent = updateSectionNames(customFileContent);

const mergedContent = merge(baseFileContent, customFileContent);

fs.writeFileSync(mergedFile, mergedContent, 'utf-8');

console.log('Updated!');
