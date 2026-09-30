import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

// Arguments come from the runtime's actual command builders, not a copy of its policy.
const options = JSON.parse(process.argv[2]);
const attach = JSON.parse(process.argv[3]);
const session = process.argv[4];
const directory = await mkdtemp(join(tmpdir(), "tmux-scrollback-"));
const socket = join(directory, "socket");
const env = { ...process.env, TERM: "xterm-256color", TMUX: "" };
const tmux = (...args) => execFileSync("tmux", ["-S", socket, "-f", "/dev/null", ...args], { encoding: "utf8", env }).trim();
const format = (target, value) => tmux("display-message", "-p", "-t", target, `#{${value}}`);
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await setTimeout(50);
  }
  assert.fail("terminal condition timed out");
}
let client;
try {
  const program = join(directory, "output.sh");
  await writeFile(program, `#!/bin/sh
[ "$1" != alternate ] || printf '\\033[?1049h'
i=1
while [ "$i" -le 100 ]; do printf 'retained-line-%03d\\n' "$i"; i=$((i+1)); done
printf 'OUTPUT-READY'
if [ "$1" = alternate ]; then
  stty raw -echo
  printf '\\033[?1000h\\033[?1006h'
  exec cat > ${directory}/mouse-events
fi
exec sleep 120
`);
  tmux(...options, "new-session", "-d", "-x", "80", "-y", "10", "-s", session, `sh ${program} normal`);
  const pane = `=${session}:`;
  await until(() => tmux("capture-pane", "-p", "-t", pane).includes("OUTPUT-READY"));
  assert.equal(format(pane, "history_limit"), "50000", "limit must precede pane creation");
  assert.equal(tmux("show-options", "-gv", "mouse"), "on");
  assert.equal(tmux("show-options", "-sv", "focus-events"), "on");
  assert.equal(tmux("show-options", "-sv", "extended-keys"), "on");
  const features = tmux("show-options", "-s", "terminal-features");
  tmux(...options, "display-message", "-p", "configured");
  assert.equal(tmux("show-options", "-s", "terminal-features"), features, "reconfiguration must not append entries");
  assert.ok(features.includes('terminal-features[99] xterm*:extkeys'));
  assert.ok(Number(format(pane, "history_size")) >= 90);
  const history = tmux("capture-pane", "-p", "-S", "-", "-t", pane);
  assert.ok(history.includes("retained-line-001"));
  console.log("PASS: runtime options precede pane creation; repeated configuration is idempotent");
  console.log("PASS: normal-screen output is retained in 50,000-line pane history");

  tmux("set-option", "-g", "history-limit", "2000", ";", "new-session", "-d", "-s", "legacy", "sleep 120");
  tmux(...options, "new-session", "-d", "-s", "after-upgrade", "sleep 120");
  assert.equal(format("=legacy:", "history_limit"), "2000");
  assert.equal(format("=after-upgrade:", "history_limit"), "50000");
  console.log("PASS: new panes on an existing server get the new limit; old pane limits remain unchanged");

  tmux("new-session", "-d", "-x", "80", "-y", "10", "-s", "alternate", `sh ${program} alternate`);
  await until(() => tmux("capture-pane", "-p", "-t", "=alternate:").includes("OUTPUT-READY"));
  assert.equal(format("=alternate:", "alternate_on"), "1");
  assert.equal(format("=alternate:", "history_size"), "0");
  console.log("PASS: alternate-screen applications retain their own scrolling responsibility");

  // Exercise real PTY clients, including upgrading a session-local mouse override.
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const command = ["tmux", "-S", socket, ...attach].map(quote).join(" ");
  for (let attempt = 0; attempt < 2; attempt++) {
    tmux("set-option", "-t", pane, "mouse", "off");
    client = spawn("script", ["-q", "-c", command, "/dev/null"], { env, stdio: ["pipe", "ignore", "pipe"] });
    let errors = "";
    client.stderr.on("data", (data) => { errors += data; });
    await until(() => format(pane, "session_attached") === "1");
    assert.equal(tmux("show-options", "-v", "-t", pane, "mouse"), "on", errors);
    client.stdin.write("\x1b[<64;5;5M");
    await until(() => format(pane, "pane_in_mode") === "1");
    tmux("send-keys", "-X", "-t", pane, "cancel");
    const exited = new Promise((resolve) => client.once("exit", resolve));
    tmux("detach-client", "-s", session);
    assert.equal(await exited, 0, errors);
    client = undefined;
    assert.ok(tmux("capture-pane", "-p", "-S", "-", "-t", pane).includes("retained-line-001"));
  }
  console.log("PASS: attach repairs mouse mode; wheel enters copy mode; history survives detach/reattach");

  const alternateAttach = attach.map((arg) => arg.replace(session, "alternate"));
  const alternateCommand = ["tmux", "-S", socket, ...alternateAttach].map(quote).join(" ");
  client = spawn("script", ["-q", "-c", alternateCommand, "/dev/null"], { env, stdio: ["pipe", "ignore", "ignore"] });
  await until(() => format("=alternate:", "session_attached") === "1");
  const wheel = "\x1b[<64;5;5M";
  client.stdin.write(wheel);
  const received = join(directory, "mouse-events");
  await until(() => existsSync(received) && readFileSync(received, "utf8").includes(wheel));
  assert.equal(format("=alternate:", "pane_in_mode"), "0");
  const exited = new Promise((resolve) => client.once("exit", resolve));
  tmux("detach-client", "-s", "alternate");
  assert.equal(await exited, 0);
  client = undefined;
  console.log("PASS: wheel events reach a fullscreen application that requests mouse input");

} finally {
  client?.kill();
  try { tmux("kill-server"); } finally { await rm(directory, { recursive: true, force: true }); }
}
