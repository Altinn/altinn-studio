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
// `cat -v` stands in for the harness and makes a delivered Ctrl-Z visible as `^Z`. Job
// control is off in that pane on purpose: the harness pane's process group is orphaned, so
// the kernel discards terminal stop signals there anyway, and the harness that stops itself
// is what leaves the Session unusable; what matters is whether the key reaches the pane.
let client;
const command = ["tmux", "-S", socket, ...attach].map(quote).join(" ");
// Attachment is complete only once typed input reaches the pane: a key sent before the
// client has put its own terminal into raw mode is eaten by that terminal instead.
async function attached(target, probe) {
  client = spawn("script", ["-q", "-c", command, "/dev/null"], { env, stdio: ["pipe", "ignore", "ignore"] });
  await until(() => format(`=${session}:`, "session_attached") === "1");
  client.stdin.write(`${probe}\n`);
  await until(() => tmux("capture-pane", "-p", "-t", target).includes(probe));
}
async function detach() {
  const exited = new Promise((resolve) => client.once("exit", resolve));
  tmux("detach-client", "-s", session);
  await exited;
  client = undefined;
}
try {
  const harness = "stty -isig; exec cat -v";
  tmux(...options, "new-session", "-d", "-x", "80", "-y", "10", "-s", session, harness);
  const pane = `=${session}:`;
  assert.notEqual(format(pane, "pane_start_command"), "", "a harness pane starts with a command");
  const output = () => tmux("capture-pane", "-p", "-t", pane);

  await attached(pane, "probe-one");
  client.stdin.write("\x1a");
  client.stdin.write("first-line\n");
  await until(() => output().includes("first-line"));
  assert.ok(!output().includes("^Z"), `Ctrl-Z must not reach the harness pane:\n${output()}`);
  await detach();
  console.log("PASS: Ctrl-Z in the harness pane is refused and the harness keeps reading input");

  // A window opened with Ctrl-b c runs a shell; job control makes suspension recoverable there.
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
  await attached(shell, "probe-two");
  client.stdin.write("\x1a");
  await until(() => stopped(job));
  await detach();
  tmux("select-window", "-t", `=${session}:0`);
  console.log("PASS: Ctrl-Z still suspends a foreground job in a shell window");

  // Reattaching re-applies the binding, so unbind only after the client is attached to
  // prove the pane-refusal check above is not vacuous: the same key then reaches the pane.
  await attached(pane, "probe-three");
  tmux("unbind-key", "-n", "C-z");
  client.stdin.write("\x1a");
  client.stdin.write("second-line\n");
  await until(() => output().includes("second-line"));
  assert.ok(output().includes("^Z"), `Ctrl-Z must reach an unprotected pane:\n${output()}`);
  await detach();
  console.log("PASS: the binding is what keeps Ctrl-Z away from the harness");
} finally {
  client?.kill();
  try { tmux("kill-server"); } finally { await rm(directory, { recursive: true, force: true }); }
}
