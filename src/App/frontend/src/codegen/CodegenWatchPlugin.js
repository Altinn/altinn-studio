/* eslint-disable @typescript-eslint/no-require-imports,no-console */
const { spawn, execSync } = require('child_process');

class CodegenWatchPlugin {
  constructor() {
    this.watcherProcess = null;

    // Check if bun is available for faster codegen execution
    let hasBun;
    try {
      execSync(process.platform === 'win32' ? 'where bun' : 'which bun', { stdio: 'pipe' });
      hasBun = true;
    } catch {
      hasBun = false;
    }
    this.codegenCommand = hasBun ? 'bun src/codegen/run.ts' : 'npx tsx src/codegen/run.ts';
  }

  apply(compiler) {
    compiler.hooks.watchRun.tapAsync('CodegenWatchPlugin', (compilation, callback) => {
      if (!this.watcherProcess) {
        this.startWatcher();
      }
      callback();
    });

    compiler.hooks.shutdown.tap('CodegenWatchPlugin', () => {
      if (this.watcherProcess) {
        this.watcherProcess.kill();
      }
    });
  }

  startWatcher() {
    console.log('Starting file watcher for automatic codegen...');

    // Use chokidar-cli to watch files and run codegen on changes
    this.watcherProcess = spawn(
      'npx',
      ['chokidar-cli', '--initial', '--silent', 'src/layout/**/config.ts', 'src/codegen', '-c', this.codegenCommand],
      { cwd: process.cwd(), stdio: 'inherit' },
    );

    this.watcherProcess.on('error', (error) => {
      console.error('Watcher process error:', error);
    });

    this.watcherProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`Watcher process exited with code ${code}`);
      }
      if (signal) {
        console.log(`Watcher process killed with signal ${signal}`);
      }
    });
  }
}

module.exports = CodegenWatchPlugin;
