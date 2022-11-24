const fs = require('fs');
const prettier = require('prettier');
const { getStoragePath } = require('../utils');

module.exports = (req, res) => {
  const { modelPath } = req.query;
  const filename = modelPath.split('/').pop();
  const filepath = getStoragePath(filename);
  const content = JSON.stringify(req.body);
  const contentFormatted = prettier.format(content, {
    parser: 'json',
    printWidth: 120,
  });
  fs.writeFileSync(filepath, contentFormatted, 'utf-8');
  res.status(200);
  res.json(content);
};
