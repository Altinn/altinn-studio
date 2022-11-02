const fs = require('fs');
const crypto = require('crypto');
const { getStoragePath, getTemplatePath } = require('../utils');

const templatePath = getTemplatePath('schema.template.json');

const template = fs.readFileSync(templatePath, 'utf-8');

const getModel = (modelname) => {
  return template.replaceAll('__modelname__', modelname).replaceAll('__datamodelid__', crypto.randomUUID());
};

module.exports = (modelname) => {
  const filepath = getStoragePath(modelname + '.schema.json');
  const newSchema = getModel(modelname);
  fs.writeFileSync(filepath, newSchema, 'utf-8');
  return JSON.parse(newSchema);
};
