const path = require('path');
const fs = require('fs');
module.exports = (modelpath, jsonSchema) => {
  const filename = modelpath.split('/').pop();
  const filepath = path.resolve(__dirname, 'storage', filename);
  fs.writeFileSync(filepath, JSON.stringify(jsonSchema), 'utf-8');
  return jsonSchema;
};
