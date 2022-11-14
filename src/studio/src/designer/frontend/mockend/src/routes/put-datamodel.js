const fs = require('fs');
const prettier = require('prettier');
const { getStoragePath } = require('../utils');

module.exports = (modelpath, jsonSchema) => {
  const filename = modelpath.split('/').pop();
  const filepath = getStoragePath(filename);
  const content = JSON.stringify(jsonSchema);
  const contentFormatted = prettier.format(content, {
    parser: 'json',
    printWidth: 120,
  });
  fs.writeFileSync(filepath, contentFormatted, 'utf-8');
  return jsonSchema;
};
