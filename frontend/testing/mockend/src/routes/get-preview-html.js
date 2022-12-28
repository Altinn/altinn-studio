const path = require('path');
const fs = require('fs');
const { projectRootDir } = require('../utils');

const filepath = path.resolve(
  projectRootDir(),
  'src',
  'studio',
  'src',
  'designer',
  'backend',
  'wwwroot',
  'designer',
  'html',
  'preview.html'
);
const indexHtml = fs.readFileSync(filepath, 'utf-8');

module.exports = (req, res) => res.send(indexHtml);
