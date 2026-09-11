import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

const script = await readFile(process.argv[2], "utf8");
const observationScript = await readFile(process.argv[3], "utf8");
const directory = await mkdtemp(join(tmpdir(), "tmux-delivery-"));
const socket = join(directory, "socket");
const received = join(directory, "received");
const terminal = join(directory, "terminal.mjs");
const env = { ...process.env, TMUX: `${socket},0,0` };
const tmux = (...args) => execFileSync("/usr/bin/tmux", ["-S", socket, ...args], { encoding: "utf8" });
await writeFile(terminal, `import { createInterface } from "node:readline";
import { appendFileSync } from "node:fs";
for await (const line of createInterface({ input: process.stdin })) appendFileSync(${JSON.stringify(received)}, line + "\\n");`);
tmux("new-session", "-d", "-s", "input", `node ${terminal}`);
async function deliver(text) {
  const file = join(directory, text);
  await writeFile(file, text);
  const child = spawn("/bin/sh", ["-c", script, "deliver", file, text, "=input:"], { env, stdio: "inherit" });
  return new Promise((resolve) => child.on("exit", resolve));
}
try {
  await setTimeout(100);
  assert.equal(await deliver("first"), 0);
  assert.equal(await deliver("second"), 0);
  await setTimeout(100);
  assert.equal(await readFile(received, "utf8"), "first\nsecond\n");
  for (const file of ["first", "second"]) {
    await assert.rejects(access(join(directory, file)), { code: "ENOENT" });
  }
  assert.equal(tmux("list-buffers"), "");

  const observe = (transcript) => execFileSync("/bin/sh", ["-c", observationScript, "observe", "input", transcript], { env, encoding: "utf8" }).trim();
  const transcript = join(directory, "transcript with spaces.jsonl");
  await setTimeout(1200);
  const baseline = observe("");
  assert.ok(Number(baseline.split(" ")[1]) >= 1, baseline);
  assert.ok(Number(observe(transcript).split(" ")[1]) >= 1, "missing transcript uses terminal activity");
  await writeFile(transcript, "not parsed as JSON");
  await utimes(transcript, 1, 1);
  assert.ok(Number(observe(transcript).split(" ")[1]) >= 1, "old transcript does not mask terminal activity");
  // A timestamp ahead of the guest clock also exercises the zero-age clamp.
  const future = Date.now() / 1000 + 60;
  await utimes(transcript, future, future);
  assert.equal(observe(transcript), "0 0", "recent transcript keeps a quiet terminal active");
  console.log("tmux: submissions stay separate, cleanup succeeds, and transcript freshness counts as activity");
} finally {
  tmux("kill-server");
  await rm(directory, { recursive: true, force: true });
}
