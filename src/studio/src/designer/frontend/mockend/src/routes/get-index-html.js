/**
 * for some weird reason we need to get the index.html again. no clue why
 */

const path = require('path');
const fs = require('fs');

const filepath = path.resolve(__dirname, '..', '..', '..', 'app-development', 'public', 'index.html');
const indexHtml = fs.readFileSync(filepath, 'utf-8');

module.exports = () => indexHtml;
