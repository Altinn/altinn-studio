const fs = require('fs');
const crypto = require('crypto');
const { getStoragePath, getTemplatePath } = require('../utils');

const templatePath = getTemplatePath('schema.template.json');

const template = fs.readFileSync(templatePath, 'utf-8');

const getModel = (modelname) => {
  return template.replaceAll('__modelname__', modelname).replaceAll('__datamodelid__', crypto.randomUUID());
};

module.exports = (req, res) => {
  const { modelName } = req.body;
  const filepath = getStoragePath(`${modelName}.schema.json`);
  const newSchema = getModel(modelName);
  fs.writeFileSync(filepath, newSchema, 'utf-8');
  const content = JSON.parse(newSchema);
  res.status(201);
  res.json(content);
};
