const path = require('path');

module.exports = () =>
  require('child_process')
    .execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '..', '..'),
    })
    .toString()
    .trim();
