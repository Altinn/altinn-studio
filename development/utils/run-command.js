const { execSync } = require('child_process');
const path = require('path');
module.exports = (command) => {
  console.log('CMD:', command);
  try {
    execSync(command, {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('     Command failed, run with --verbose to get the error message');
    //console.error(`Error: ${e.stdout}`);
  }
};
