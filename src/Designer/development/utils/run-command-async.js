const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '../..');

/**
 * Starts a command without blocking the event loop, so that slow work (docker builds) can run while
 * the setup continues with something else. Resolves on exit code 0, rejects otherwise.
 */
module.exports = (command) => {
  console.log('CMD (background):', command);
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      }
    });
  });
};
