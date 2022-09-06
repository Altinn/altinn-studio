const path = require('path');
const fs = require('fs');
const prettier = require('prettier');
module.exports = (modelpath, jsonSchema) => {
  const filename = modelpath.split('/').pop();
  const filepath = path.resolve(__dirname, 'storage', filename);
  const content = JSON.stringify(jsonSchema);
  const contentFormatted = prettier.format(content, {
    parser: 'json',
    printWidth: 120,
  });
  fs.writeFileSync(filepath, contentFormatted, 'utf-8');
  return jsonSchema;
};
