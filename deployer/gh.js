'use strict';

const { spawn } = require('node:child_process');

function createSemaphore(max) {
  let active = 0;
  const queue = [];
  return async function withPermit(fn) {
    if (active >= max) await new Promise((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      if (queue.length > 0) queue.shift()();
    }
  };
}

function ghRaw(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`gh ${args.slice(0, 3).join(' ')} failed: ${stderr.trim().slice(0, 200)}`));
    });
    child.stdin.end();
  });
}

function createGhClient({ parallel }) {
  const withGhPermit = createSemaphore(parallel);
  const counter = { total: 0 };

  async function ghApi(apiPath) {
    counter.total++;
    const raw = await withGhPermit(() => ghRaw(['api', apiPath]));
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`JSON parse failed for ${apiPath}`);
    }
  }

  async function ghApiPost(apiPath, fields) {
    counter.total++;
    const args = ['api', '--method', 'POST', apiPath, '--silent'];
    for (const [key, val] of Object.entries(fields)) {
      if (Array.isArray(val)) {
        for (const v of val) args.push('-F', `${key}[]=${v}`);
      } else if (typeof val === 'number') {
        args.push('-F', `${key}=${val}`);
      } else {
        args.push('-f', `${key}=${String(val)}`);
      }
    }
    await withGhPermit(() => ghRaw(args));
  }

  function getRequestCount() {
    return counter.total;
  }

  return {
    ghApi,
    ghApiPost,
    getRequestCount,
  };
}

module.exports = {
  createGhClient,
};
