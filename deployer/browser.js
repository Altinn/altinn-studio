'use strict';

const fs = require('node:fs');
const { exec } = require('node:child_process');

function isWsl() {
  if (process.platform !== 'linux') return false;
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
  try {
    const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
    return version.includes('microsoft');
  } catch {
    return false;
  }
}

function openUrlInBrowser(url) {
  let command;
  if (isWsl()) {
    command = `powershell.exe -NoProfile -Command "Start-Process '${url}'"`;
  } else if (process.platform === 'darwin') {
    command = `open "${url}"`;
  } else if (process.platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.error(`[startup] Could not open URL in browser: ${err.message}`);
    }
  });
}

module.exports = {
  openUrlInBrowser,
};
