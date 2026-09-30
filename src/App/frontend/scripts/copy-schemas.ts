/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const contractSchemas = path.join(repositoryRoot, 'src/common/ts/layout-contract/schemas');
const distSchemas = path.join(repositoryRoot, 'src/App/frontend/dist/schemas');

fs.rmSync(distSchemas, { recursive: true, force: true });
fs.cpSync(contractSchemas, distSchemas, { recursive: true });
console.log('Copied schemas to dist/');
