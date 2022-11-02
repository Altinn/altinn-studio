const fs = require('fs');
const path = require('path');

const langFilesDir = path.resolve(__dirname, 'src');
const distFileDir = path.resolve(__dirname, '..', 'dist', 'language');
if (!fs.existsSync(distFileDir)) {
  fs.mkdirSync(distFileDir);
}
fs.readdirSync(langFilesDir).forEach((filename) =>
  fs.copyFileSync(
    path.resolve(langFilesDir, filename),
    path.resolve(distFileDir, filename),
  ),
);
