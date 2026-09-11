import type { CodeListFile, OrdinaryCodeListFile } from '../../../../types/CodeListFile';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const colorsFile = codeListFile('colours');
export const fruitsFile = codeListFile('fruits');
export const countriesFile = codeListFile('countries');

function codeListFile(codeListName: string): OrdinaryCodeListFile {
  const fileName = codeListName + '.json';
  return {
    name: fileName,
    content: fs.readFileSync(path.resolve(__dirname, fileName), 'utf8'),
  };
}

export const codeLists: CodeListFile[] = [colorsFile, fruitsFile, countriesFile];
