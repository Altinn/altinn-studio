const fs = require('fs');
const path = require('path');
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  return dirPath;
};
const langFilesDir = path.resolve(__dirname, 'src');
const distDir = ensureDir(path.resolve(__dirname, '..', 'dist'));
const distFileDir = ensureDir(path.resolve(distDir, 'language'));
fs.readdirSync(langFilesDir).forEach((filename) =>
  fs.copyFileSync(
    path.resolve(langFilesDir, filename),
    path.resolve(distFileDir, filename),
  ),
);
