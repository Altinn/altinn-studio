const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const templatePath = path.resolve(
  __dirname,
  'templates',
  'schema.template.json',
);

const template = fs.readFileSync(templatePath, 'utf-8');

const getModel = (modelname) => {
  return template
    .replaceAll('__modelname__', modelname)
    .replaceAll('__datamodelid__', crypto.randomUUID());
};

module.exports = (modelname) => {
  const filename = modelname + '.schema.json';
  const filepath = path.resolve(__dirname, 'storage', filename);
  const newSchema = getModel(modelname);
  fs.writeFileSync(filepath, newSchema, 'utf-8');
  return JSON.parse(newSchema);
};
