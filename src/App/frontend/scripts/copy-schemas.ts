/* eslint-disable no-console */
import fs from 'fs';
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}
fs.cpSync('schemas', 'dist/schemas', { recursive: true });
console.log('Copied schemas to dist/');
