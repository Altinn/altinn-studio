import fs from 'node:fs';
import path from 'node:path';

type TestCodeLists = { animals: string; vehicles: string };

export const codeListsBinary: TestCodeLists = {
  animals: codeListContentBinary('animals'),
  vehicles: codeListContentBinary('vehicles'),
};

function codeListContentBinary(codeListName: string): string {
  return readCodeListFile(codeListName, 'base64');
}

export const codeListsUTF8: TestCodeLists = {
  animals: codeListContentUTF8('animals'),
  vehicles: codeListContentUTF8('vehicles'),
};

function codeListContentUTF8(codeListName: string): string {
  return readCodeListFile(codeListName, 'utf8');
}

function readCodeListFile(name: string, encoding: BufferEncoding): string {
  const fileName = name + '.json';
  return fs.readFileSync(path.resolve(__dirname, fileName), encoding);
}
