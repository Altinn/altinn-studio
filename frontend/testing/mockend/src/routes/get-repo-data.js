const path = require('path');
const fs = require('fs');
const templatePath = path.resolve(__dirname, '..', 'templates', 'repo-data.template.json');

const template = fs.readFileSync(templatePath, 'utf-8');

module.exports = (req, res) => {
  const { owner, repo } = req.params;
  const content = JSON.parse(
    template.replaceAll('__hostname__', req.headers.host).replaceAll('__owner__', owner).replaceAll('__repo__', repo)
  );
  res.json(content);
};
