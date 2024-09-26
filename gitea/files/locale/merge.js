const fs = require('fs');
const ini = require('ini');

const [, , baseFile, customFile, mergedFile] = process.argv;

if (!baseFile || !customFile || !mergedFile) {
  console.error('Usage: node merge.js <base-values.ini> <custom-values.ini> <merged-values.ini>');
  process.exit(1);
}

/**
 * The ini package does not support :
 * - having the same name for both a key and a section (e.g., filter, error, etc)
 * - having a dot in the section name (e.g., [git.filemode])
 *
 * To prevent these issues, this function appends '-section' to the names of all sections
 * and replace all dots with hyphens.
 */
const updateSectionNames = (content) =>
  content
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        return `[${trimmedLine.slice(1, -1).replace('.', '-')}-section]`;
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
        currentSection = trimmedLine.slice(1, -1).replace('.', '-') + '-section';
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
