const path = require('path');
const fs = require('fs');
const { projectRootDir } = require('../utils');

const filepath = path.resolve(
  projectRootDir(),
  'frontend',
  'app-development',
  'public',
  'index.html'
);
const indexHtml = fs.readFileSync(filepath, 'utf-8');

module.exports = (req, res) => res.send(indexHtml);
