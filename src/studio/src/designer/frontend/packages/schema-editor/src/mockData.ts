import * as fs from 'fs';
import * as path from 'path';

export const dataMock = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'test', 'fixtures', 'mock-string.json'), 'utf-8'),
);
