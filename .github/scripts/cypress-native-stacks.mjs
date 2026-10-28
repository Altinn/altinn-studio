// Native capture recovered from the previous stall investigation, including its
// corrected process discovery and stripped-Chrome frame-pointer unwinder.
import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function nativeBrowserStacks(rootPid, outputDir) {
  const { stdout: processes } = await execFileAsync(
    'ps',
    ['-eo', 'pid,ppid,pgid,nlwp,pcpu,rss,stat,etimes,time,comm'],
    { timeout: 5000, maxBuffer: 2 * 1024 * 1024 },
  );
  writeFileSync(path.join(outputDir, 'processes.log'), processes);
  const rows = processes
    .split('\n')
    .slice(1)
    .map((line) => {
      const fields = line.trim().split(/\s+/);
      return {
        pid: Number(fields[0]),
        parent: Number(fields[1]),
        age: Number(fields[7]),
        name: fields.at(-1),
      };
    });
  const descendants = (roots) => {
    const found = new Set(roots);
    let previousSize;
    do {
      previousSize = found.size;
      for (const row of rows) if (found.has(row.parent)) found.add(row.pid);
    } while (found.size !== previousSize);
    return found;
  };
  const testProcesses = descendants([rootPid]);
  const cypress = rows.filter((row) => testProcesses.has(row.pid) && row.name === 'Cypress');
  const cypressMain = new Set(
    cypress
      .filter((row) => !cypress.some((parent) => parent.pid === row.parent))
      .map((row) => row.pid),
  );
  // Percy has its own Chrome. Limit capture to descendants of Cypress itself.
  const browserProcesses = descendants(cypress.map((row) => row.pid));
  const targets = [];
  const processRoles = [];
  const discoveryErrors = [];
  for (const row of rows) {
    if (!browserProcesses.has(row.pid) || !/^(Cypress|chrome|chromium)$/.test(row.name)) continue;
    // The owned Cypress root is identified by ancestry. Reading its arguments
    // is unnecessary and can fail even while the browser is still alive.
    if (cypressMain.has(row.pid)) {
      targets.push({ pid: row.pid, age: row.age, role: 'cypress' });
      processRoles.push({ pid: row.pid, parent: row.parent, role: 'cypress' });
      continue;
    }
    try {
      // Inspect only the process type; never retain command arguments or tokens.
      // Read sandbox processes with the same privileges as gdb.
      const { stdout: commandLine } = await execFileAsync(
        'sudo',
        ['-n', 'cat', `/proc/${row.pid}/cmdline`],
        { timeout: 2000, maxBuffer: 32768 },
      );
      // Chromium rewrites child argv into one space-separated process title.
      // Accept both that title and the original null-separated arguments.
      const type = commandLine.match(/(?:^|[\0 ])--type=([a-z-]+)(?=[\0 ]|$)/)?.[1];
      const role =
        type === 'renderer'
          ? 'renderer'
          : type === 'gpu-process'
            ? 'gpu'
            : !type && commandLine.length > 0 && cypressMain.has(row.parent)
              ? 'browser'
              : null;
      processRoles.push({
        pid: row.pid,
        parent: row.parent,
        role: role || (['gpu-process', 'zygote', 'utility'].includes(type) ? type : 'unknown'),
        commandLineEmpty: commandLine.length === 0,
      });
      if (role) targets.push({ pid: row.pid, age: row.age, role });
    } catch (error) {
      discoveryErrors.push({ pid: row.pid, code: error.code, signal: error.signal });
    }
  }
  const selected = [
    ...targets
      .filter((target) => target.role === 'renderer')
      .sort((a, b) => a.age - b.age || b.pid - a.pid),
    ...targets.filter((target) => target.role === 'browser').slice(0, 1),
    ...targets.filter((target) => target.role === 'gpu'),
    ...targets.filter((target) => target.role === 'cypress').slice(0, 1),
  ];
  const stacks = [];
  const deadline = Date.now() + 60_000;
  for (const target of selected) {
    if (Date.now() >= deadline) {
      stacks.push({ ...target, captured: false, failure: 'capture budget exhausted' });
      continue;
    }
    const filename = `native-${target.role}-${target.pid}.log`;
    let result;
    let failure;
    try {
      // Root can attach to Chrome's non-dumpable sandbox processes. GNU timeout
      // bounds the privileged debugger itself, including symbol loading.
      result = await execFileAsync(
        'sudo',
        [
          '-n',
          'timeout',
          '--kill-after=2s',
          '10s',
          'gdb',
          '--batch',
          '--nx',
          '--nh',
          '-iex',
          'set auto-load off',
          '-iex',
          'set debuginfod enabled off',
          '-iex',
          'set print frame-arguments none',
          '-p',
          String(target.pid),
          '-ex',
          `python assert gdb.selected_inferior().pid == ${target.pid}`,
          '-ex',
          "python executable = gdb.current_progspace().filename; objfile = next((objfile for objfile in gdb.objfiles() if objfile.filename == executable), None); print('Executable:', executable); print('Build ID:', objfile.build_id if objfile else None)",
          '-ex',
          'info proc mappings',
          ...(target.role !== 'cypress'
            ? ['-ex', `source ${path.join(import.meta.dirname, 'chrome-frame-unwinder.py')}`]
            : []),
          '-ex',
          'thread apply all bt 30',
          '-ex',
          'thread apply all info registers',
          '-ex',
          'thread apply all x/64gx $rsp',
          '-ex',
          'detach',
        ],
        { timeout: 15000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024 },
      );
    } catch (error) {
      result = error;
      failure = { code: error.code, signal: error.signal };
    }
    writeFileSync(path.join(outputDir, filename), `${result.stdout || ''}\n${result.stderr || ''}`);
    stacks.push({
      ...target,
      filename,
      captured: /\n#0\s+/.test(result.stdout || ''),
      ...(failure && { failure }),
    });
  }
  return {
    stacks,
    processRoles,
    discoveryErrors,
    missingRoles: ['renderer', 'browser', 'gpu', 'cypress'].filter(
      (role) => !selected.some((target) => target.role === role),
    ),
    ...(selected.length === 0 && { error: 'No Cypress browser processes found' }),
  };
}
