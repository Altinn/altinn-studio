const path = require('path');
const fs = require('fs');
const templatePath = path.resolve(
  __dirname,
  'templates',
  'repo-data.template.json',
);

const template = fs.readFileSync(templatePath, 'utf-8');

module.exports = (hostname, owner, reponame) =>
  JSON.parse(
    template
      .replaceAll('__hostname__', hostname)
      .replaceAll('__owner__', owner)
      .replaceAll('__repo__', reponame),
  );
