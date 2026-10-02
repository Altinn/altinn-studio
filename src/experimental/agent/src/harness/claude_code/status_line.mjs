import { execFileSync } from "node:child_process";
import { homedir } from "node:os";

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let state;
try {
  state = JSON.parse(raw);
} catch {
  process.exit(0);
}

const clean = (value) => String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
const percentage = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.min(100, Math.max(0, number))) : null;
};
const remaining = (window) => {
  const used = percentage(window?.used_percentage);
  return used === null ? null : 100 - used;
};
const compactPath = (path) => {
  const home = homedir();
  if (path === home) return "~";
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
};
const branch = (cwd) => {
  try {
    return execFileSync("git", ["-C", cwd, "symbolic-ref", "--quiet", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 250,
    }).trim();
  } catch {
    return "";
  }
};

const segments = [];
const model = [state.model?.display_name, state.effort?.level].filter(Boolean).map(clean).join(" ");
if (model) segments.push(model);

const cwd = state.workspace?.current_dir ?? state.cwd;
if (cwd) {
  segments.push(clean(compactPath(cwd)));
  const currentBranch = branch(cwd);
  if (currentBranch) segments.push(clean(currentBranch));
}

const contextUsed = percentage(state.context_window?.used_percentage);
if (contextUsed !== null) segments.push(`Context ${contextUsed}% used`);

const fiveHourLeft = remaining(state.rate_limits?.five_hour);
if (fiveHourLeft !== null) segments.push(`5h ${fiveHourLeft}% left`);
const weeklyLeft = remaining(state.rate_limits?.seven_day);
if (weeklyLeft !== null) segments.push(`weekly ${weeklyLeft}% left`);

if (state.version) segments.push(clean(state.version));
if (typeof state.fast_mode === "boolean") segments.push(`Fast ${state.fast_mode ? "on" : "off"}`);

process.stdout.write(segments.join(" · "));
