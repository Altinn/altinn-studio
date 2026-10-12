// Preload only in the Percy CLI process, never in Cypress or its browsers.
const { Worker, isMainThread, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');

if (isMainThread) {
  const outputDir = path.resolve(process.env.PERCY_CPU_PROFILE_DIR);
  const intervalMs = Number(process.env.PERCY_CPU_PROFILE_INTERVAL_MS || 30000);
  if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
    throw new Error('Percy CPU profile interval must be at least 1000 milliseconds.');
  }
  const worker = new Worker(__filename, {
    workerData: { outputDir, intervalMs },
    execArgv: [],
  });
  worker.on('error', (error) => console.error('Percy CPU profiler failed:', error));
  // Profiling must not extend the CLI lifetime or change its exit status.
  worker.unref();
} else {
  const { Session } = require('node:inspector/promises');
  const { setTimeout: delay } = require('node:timers/promises');
  const { outputDir, intervalMs } = workerData;
  const session = new Session();
  const profiles = [];
  // Inspector promises do not keep the worker's event loop alive between
  // commands. The parent unrefs the worker, so this cannot keep Percy alive.
  const keepAlive = setInterval(() => {}, intervalMs);

  async function profile() {
    fs.mkdirSync(outputDir, { recursive: true });
    // The worker can stop and save the main thread's profile even while its
    // event loop is blocked. Exit-only profiling would lose that evidence.
    session.connectToMainThread();
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: 10000 });
    await session.post('Profiler.start');
    console.log(`Percy CPU profiling started: ${outputDir}`);
    while (true) {
      await delay(intervalMs);
      const { profile: cpuProfile } = await session.post('Profiler.stop');
      await session.post('Profiler.start');
      const filename = path.join(outputDir, `percy-${process.pid}-${Date.now()}.cpuprofile`);
      fs.writeFileSync(`${filename}.tmp`, JSON.stringify(cpuProfile));
      fs.renameSync(`${filename}.tmp`, filename);
      profiles.push(filename);
      // Bound disk use during a long stall and retain the last two minutes.
      if (profiles.length > 4) fs.unlinkSync(profiles.shift());
      console.log(`Saved Percy CPU profile: ${path.basename(filename)}`);
    }
  }

  profile().catch((error) => {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'profiler-error.txt'), String(error.stack || error));
    console.error('Percy CPU profiler failed:', error);
    session.disconnect();
    clearInterval(keepAlive);
  });
}
