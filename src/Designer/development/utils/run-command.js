const { execSync } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '../..');

/**
 * Runs a command and waits for it to finish.
 *
 * A failing command aborts the setup, so that a broken step is reported where it happens instead of
 * surfacing minutes later as a timeout while waiting for the stack to come up. Steps that are
 * expected to fail when the setup is re-run against existing data (creating a user that already
 * exists, for instance) pass `{ allowFailure: true }`.
 */
module.exports = (command, { allowFailure = false } = {}) => {
  console.log('CMD:', command);
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
    });
  } catch {
    if (!allowFailure) {
      throw new Error(`Command failed: ${command}`);
    }
    console.log('     Command failed, continuing:', command);
  }
};
