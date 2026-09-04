/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const contractSchemas = path.join(repositoryRoot, 'src/common/ts/layout-contract/schemas');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}
fs.cpSync('schemas', 'dist/schemas', { recursive: true });
fs.cpSync(contractSchemas, 'dist/schemas', { recursive: true });
console.log('Copied schemas to dist/');
