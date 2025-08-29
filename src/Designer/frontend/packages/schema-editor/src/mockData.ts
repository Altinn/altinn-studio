import * as fs from 'fs';
import * as path from 'path';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

export const dataMock: JsonSchema = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'test', 'fixtures', 'mock-string.json'), 'utf-8'),
);
