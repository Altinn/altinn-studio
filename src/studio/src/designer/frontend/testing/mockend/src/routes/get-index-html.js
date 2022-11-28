/**
 * for some weird reason we need to get the index.html again. no clue why
 */

const path = require('path');
const fs = require('fs');
const { projectRootDir } = require('../utils');

const filepath = path.resolve(projectRootDir(), 'app-development', 'public', 'index.html');
const indexHtml = fs.readFileSync(filepath, 'utf-8');

module.exports = (req, res) => res.send(indexHtml);
