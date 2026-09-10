"""Which files move which axis."""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass

# Agents-relative; first match wins.
YARDSTICK: tuple[tuple[str, str, str], ...] = (
    (
        "benchmarks/datasets/*",
        "dataset",
        "the items every score is computed over",
    ),
    (
        "benchmarks/gates.py",
        "evaluators",
        "how a gate verdict is scored",
    ),
    (
        "benchmarks/planner.py",
        "evaluators",
        "how a plan, a spec and a query are scored",
    ),
    (
        "benchmarks/generation.py",
        "evaluators",
        "how a replayed decision point is scored",
    ),
    (
        "benchmarks/evaluators.py",
        "evaluators",
        "the structural rubric a built app is scored against",
    ),
    (
        "benchmarks/outputs.py",
        "evaluators",
        "what counts as an output change rather than a rewording",
    ),
    (
        "benchmarks/preview_check.py",
        "evaluators",
        "what counts as a page that rendered",
    ),
    (
        "agents/core/context.py",
        "actor_prompt",
        "the actor's system prompt, which every turn of every session carries",
    ),
    (
        "agents/prompts/*.md",
        "prompts",
        "a published prompt one of the call sites uses",
    ),
    (
        "agents/prompts/*/*.md",
        "prompts",
        "a published prompt one of the call sites uses",
    ),
    (
        "agents/core/tools/*",
        "tools",
        "a tool schema the actor is shown",
    ),
    (
        "agents/core/registry.py",
        "tools",
        "which tools exist in a session",
    ),
)

# Documentation and loader code sit beside the prompts without being one.
CARRIES_NO_AXIS: tuple[str, ...] = ("*/README.md", "README.md", "agents/prompts/loader.py")

BEHAVIOR: tuple[tuple[str, str, str], ...] = (
    (
        "benchmarks/manifest.py",
        "manifest",
        "what the agent is declared to do, or what pins it",
    ),
    (
        "shared/config/base_config.py",
        "models",
        "which model a role resolves to, or how it is sampled",
    ),
    (
        "agents/core/*",
        "code",
        "the agentic loop or an adapter",
    ),
    (
        "agents/services/*",
        "code",
        "a gate, the semantic query or the client",
    ),
    (
        "agents/workflows/*",
        "code",
        "the intake or spec pipeline",
    ),
    (
        "agents/altinn/*",
        "code",
        "how a layout is written or validated",
    ),
)


@dataclass(frozen=True)
class Hit:
    path: str
    axis: str
    because: str
    yardstick: bool


@dataclass(frozen=True)
class Impact:
    hits: tuple[Hit, ...]

    @property
    def yardstick_hits(self) -> tuple[Hit, ...]:
        return tuple(h for h in self.hits if h.yardstick)

    @property
    def behavior_hits(self) -> tuple[Hit, ...]:
        return tuple(h for h in self.hits if not h.yardstick)

    @property
    def needs_rebaseline(self) -> bool:
        return bool(self.yardstick_hits)

    @property
    def needs_check(self) -> bool:
        return bool(self.hits)

    @property
    def axes(self) -> tuple[str, ...]:
        return tuple(sorted({h.axis for h in self.hits}))

    def explain(self, *, rebaselined: bool = False) -> tuple[str, ...]:
        lines: list[str] = []
        if not self.hits:
            lines.append("Nothing in this change moves an axis the harness measures.")
            return tuple(lines)
        if self.yardstick_hits:
            lines.append("This change moves what is measured:")
            for hit in self.yardstick_hits:
                lines.append(f"  {hit.path}  ({hit.axis}) {hit.because}")
            if rebaselined:
                lines.append(
                    "BASELINE.json moves in this change, so the baseline was measured with "
                    "this instrument and its scores are comparable."
                )
            else:
                lines.append(
                    "The baseline measured with a different instrument, so its scores are "
                    "not comparable to anything produced after this lands."
                )
                lines.append(
                    "Run a full check and adopt it, and commit BASELINE.json in this pull "
                    "request. See EVALS.md."
                )
        if self.behavior_hits:
            lines.append("This change moves the agent without moving the yardstick:")
            for hit in self.behavior_hits:
                lines.append(f"  {hit.path}  ({hit.axis}) {hit.because}")
            if not self.yardstick_hits:
                lines.append(
                    "The baseline stays valid. Run a check and show it against the baseline."
                )
        return tuple(lines)


def _match(path: str, rules: tuple[tuple[str, str, str], ...]) -> tuple[str, str] | None:
    for pattern, axis, because in rules:
        if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, f"{pattern}/*"):
            return axis, because
    return None


def report(changed: list[str], *, strict: bool) -> int:
    """Print what a change means for the baseline and return an exit code."""
    from benchmarks import baseline as pointer_file

    found = analyze(changed)
    rebaselined = any(path.endswith("BASELINE.json") for path in changed)
    for line in found.explain(rebaselined=rebaselined):
        print(line)
    if not found.needs_rebaseline:
        return 0
    if rebaselined:
        return 0

    pointer = pointer_file.read()
    print()
    print("=" * 78)
    print("THIS CHANGE INVALIDATES THE BASELINE, AND NO NEW ONE IS RECORDED")
    print("=" * 78)
    print()
    print("You changed what the harness measures with. Every score the current baseline")
    print("holds was produced by a different instrument, so no comparison against it")
    print("means anything from here on, whatever the agent does.")
    print()
    print(f"BASELINE.json still points at: {pointer.check_id if pointer else 'nothing'}")
    if pointer:
        print(f"  adopted because: {pointer.why}")
    print()
    print("CI does not run the bench, and cannot decide this for you. Record it yourself:")
    print()
    print('  1. python -m benchmarks.runner check --label "<what this is>"')
    print("  2. read benchmarks/reports/workbench.html, and satisfy yourself that the")
    print("     numbers are what the agent should now be held to")
    print('  3. python -m benchmarks.runner baseline <check id> --why "<why>"')
    print("  4. commit benchmarks/BASELINE.json in this pull request")
    print()
    print("If you did not mean to change the yardstick, revert the file above instead.")
    print("Details: src/AI/agents/benchmarks/EVALS.md")
    return 1 if strict else 0


def analyze(changed: list[str]) -> Impact:
    """What a set of changed paths means for the baseline."""
    prefix = "src/AI/agents/"
    hits: list[Hit] = []
    for raw in changed:
        path = raw[len(prefix) :] if raw.startswith(prefix) else raw
        if not path or path.startswith("tests/"):
            continue
        if any(fnmatch.fnmatch(path, rule) for rule in CARRIES_NO_AXIS):
            continue
        found = _match(path, YARDSTICK)
        if found:
            hits.append(Hit(path, found[0], found[1], yardstick=True))
            continue
        found = _match(path, BEHAVIOR)
        if found:
            hits.append(Hit(path, found[0], found[1], yardstick=False))
    return Impact(hits=tuple(hits))


def _main() -> int:
    """Runnable with no dependencies, so the CI gate needs no install."""
    import subprocess
    import sys

    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    strict = "--strict" in sys.argv
    if args:
        changed = args
    elif not sys.stdin.isatty():
        changed = [line.strip() for line in sys.stdin if line.strip()]
    else:
        diff = subprocess.run(
            ("git", "diff", "--name-only", "origin/main...HEAD"),
            capture_output=True,
            text=True,
            check=False,
        )
        if diff.returncode != 0:
            print(
                "Could not work out what changed, so this gate proves nothing:\n"
                + (diff.stderr.strip() or "git diff origin/main...HEAD failed"),
                file=sys.stderr,
            )
            return 1
        changed = [line for line in diff.stdout.splitlines() if line.strip()]
    return report(changed, strict=strict)


if __name__ == "__main__":
    raise SystemExit(_main())
