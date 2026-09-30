import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

// Arguments come from the runtime's actual command builders, not a copy of its policy.
const options = JSON.parse(process.argv[2]);
const attach = JSON.parse(process.argv[3]);
const session = process.argv[4];
const directory = await mkdtemp(join(tmpdir(), "tmux-suspend-"));
const socket = join(directory, "socket");
const env = { ...process.env, TERM: "xterm-256color", TMUX: "" };
const tmux = (...args) => execFileSync("tmux", ["-S", socket, "-f", "/dev/null", ...args], { encoding: "utf8", env }).trim();
const format = (target, value) => tmux("display-message", "-p", "-t", target, `#{${value}}`);
const stopped = (pid) => execFileSync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" }).trim().startsWith("T");
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await setTimeout(50);
  }
  assert.fail("terminal condition timed out");
}

// `cat -v` stands in for a harness or a foreground job and shows a delivered Ctrl-Z as `^Z`;
// `stty -isig` keeps the byte from raising a signal, so the capture reveals whether it arrived.
const HARNESS = "stty -isig; exec cat -v";
let client;
// Attachment is complete only once typed input reaches the pane: a key sent before the client
// has put its own terminal into raw mode is eaten by that terminal instead. The runtime's attach
// arguments name one session; retarget them by name to drive a second session with the same server.
async function attached(name, target, probe) {
  const args = attach.map((arg) => arg.replaceAll(session, name));
  const command = ["tmux", "-S", socket, ...args].map(quote).join(" ");
  client = spawn("script", ["-q", "-c", command, "/dev/null"], { env, stdio: ["pipe", "ignore", "ignore"] });
  await until(() => format(`=${name}:`, "session_attached") === "1");
  client.stdin.write(`${probe}\n`);
  await until(() => tmux("capture-pane", "-p", "-t", target).includes(probe));
}
async function detach(name) {
  const exited = new Promise((resolve) => client.once("exit", resolve));
  tmux("detach-client", "-s", name);
  await exited;
  client = undefined;
}
try {
  // 1. The Session's own harness pane: Ctrl-Z is swallowed and the harness keeps reading input.
  tmux(...options, "new-session", "-d", "-x", "80", "-y", "10", "-s", session, HARNESS);
  const pane = `=${session}:`;
  assert.notEqual(format(pane, "pane_start_command"), "", "a harness pane starts with a command");
  const paneOut = () => tmux("capture-pane", "-p", "-t", pane);
  await attached(session, pane, "probe-one");
  client.stdin.write("\x1a");
  client.stdin.write("first-line\n");
  await until(() => paneOut().includes("first-line"));
  assert.ok(!paneOut().includes("^Z"), `Ctrl-Z must not reach the harness pane:\n${paneOut()}`);
  await detach(session);
  console.log("PASS: Ctrl-Z in the harness pane is swallowed and the harness keeps reading input");

  // 2. A window opened with Ctrl-b c runs a shell; job control makes suspension recoverable there.
  tmux("new-window", "-d", "-t", pane);
  const shell = `=${session}:1`;
  assert.equal(format(shell, "pane_start_command"), "");
  tmux("send-keys", "-t", shell, "cat", "Enter");
  let job;
  await until(() => {
    try {
      job = Number(execFileSync("pgrep", ["-P", format(shell, "pane_pid"), "-x", "cat"], { encoding: "utf8" }));
      return true;
    } catch {
      return false;
    }
  });
  tmux("select-window", "-t", shell);
  await attached(session, shell, "probe-two");
  client.stdin.write("\x1a");
  await until(() => stopped(job));
  await detach(session);
  tmux("select-window", "-t", `=${session}:0`);
  console.log("PASS: Ctrl-Z still suspends a foreground job in a shell window");

  // 3. The binding is server-wide but scoped by session name, so a non-Agent session with a
  //    command-started pane still receives Ctrl-Z (proves the swallow above is not global).
  const other = "user-shell-x";
  tmux("new-session", "-d", "-x", "80", "-y", "10", "-s", other, HARNESS);
  const otherPane = `=${other}:`;
  const otherOut = () => tmux("capture-pane", "-p", "-t", otherPane);
  await attached(other, otherPane, "probe-three");
  client.stdin.write("\x1a");
  client.stdin.write("third-line\n");
  await until(() => otherOut().includes("third-line"));
  assert.ok(otherOut().includes("^Z"), `Ctrl-Z must reach a non-Agent pane:\n${otherOut()}`);
  await detach(other);
  console.log("PASS: Ctrl-Z reaches a command pane in a non-Agent session (binding is scoped)");
} finally {
  client?.kill();
  try { tmux("kill-server"); } finally { await rm(directory, { recursive: true, force: true }); }
}
