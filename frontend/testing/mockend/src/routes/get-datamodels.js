const fs = require('fs');
const path = require('path');
const { getStoragePath } = require('../utils');
/**
 * Returns all dataModels
 */
module.exports = (req, res) => {
  const directory = getStoragePath('.');
  const files = fs.readdirSync(directory);
  const out = [];
  files.forEach((fileName) => {
    const repositoryRelativeUrl = fileName;
    const filePath = path.resolve(directory, fileName);
    out.push({
      filePath,
      directory,
      repositoryRelativeUrl,
      fileName,
      fileType: 'json',
      fileStatus: 'Default',
      description: null,
      lastChanged: '2022-09-06T10:14:19.2423776+02:00',
    });
  });
  res.json(out);
};
