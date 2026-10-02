"""Which files move which axis."""

from __future__ import annotations

import ast
import fnmatch
import subprocess
import sys
import traceback
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from pathlib import Path

AGENTS_ROOT = Path(__file__).resolve().parents[1]

# The ref that a change is compared with, when the caller does not give one.
DEFAULT_BASE_REF = "origin/main"

# Takes an agents-relative path. Returns None when the file does not exist.
SourceReader = Callable[[str], str | None]

# Returns the digest of each axis in DIGESTS. A None value means that the digest failed.
Measure = Callable[[], dict[str, str | None]]

# The axes that the gate measures directly. `runner check` compares the same digests.
DIGESTS: tuple[tuple[str, str], ...] = (
    ("actor_prompt", "the actor's system prompt for every app version, and the skill listing"),
    ("tools", "the tool schemas the actor is shown, and the skill text for every app version"),
)

# The value in BASELINE.json when a run did not record an axis.
NOT_RECORDED = "not recorded"

# Agents-relative; first match wins. No path rule is necessary for actor_prompt or tools:
# the gate compares their digests with BASELINE.json, see DIGESTS.
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
        "agents/prompts/*.md",
        "prompts",
        "a published prompt one of the call sites uses",
    ),
    (
        "agents/prompts/*/*.md",
        "prompts",
        "a published prompt one of the call sites uses",
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
        "a gate or the client that calls the model",
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
class Drift:
    axis: str
    baseline: str
    # None when the digest failed.
    current: str | None
    because: str


@dataclass(frozen=True)
class Impact:
    hits: tuple[Hit, ...]
    # Python files that match a rule, but where only docstrings, comments or formatting changed.
    docs_only: tuple[str, ...] = field(default_factory=tuple)
    # Digests of this checkout that are not equal to the digests in BASELINE.json.
    drift: tuple[Drift, ...] = field(default_factory=tuple)

    @property
    def yardstick_hits(self) -> tuple[Hit, ...]:
        return tuple(h for h in self.hits if h.yardstick)

    @property
    def behavior_hits(self) -> tuple[Hit, ...]:
        return tuple(h for h in self.hits if not h.yardstick)

    @property
    def needs_rebaseline(self) -> bool:
        return bool(self.yardstick_hits or self.drift)

    @property
    def needs_check(self) -> bool:
        return bool(self.hits or self.drift)

    @property
    def axes(self) -> tuple[str, ...]:
        return tuple(sorted({h.axis for h in self.hits} | {d.axis for d in self.drift}))

    def explain(self, *, rebaselined: bool = False) -> tuple[str, ...]:
        lines: list[str] = []
        if self.docs_only:
            lines.append("Only docstrings, comments or formatting change in these files, so they move no axis:")
            lines.extend(f"  {path}" for path in self.docs_only)
        if not self.needs_check:
            lines.append("Nothing in this change moves an axis the harness measures.")
            return tuple(lines)
        if self.yardstick_hits:
            lines.append("This change moves what is measured:")
            for hit in self.yardstick_hits:
                lines.append(f"  {hit.path}  ({hit.axis}) {hit.because}")
        if self.drift:
            lines.append("These digests of this checkout are not equal to the digests in BASELINE.json:")
            for drift in self.drift:
                current = drift.current or "failed"
                lines.append(f"  {drift.axis}  baseline {drift.baseline}, this checkout {current}: {drift.because}")
            if any(drift.current is None for drift in self.drift):
                lines.append(
                    "A digest failed, so the gate cannot compare it. The error is in the log. "
                    "The digests are in benchmarks/provenance.py."
                )
            lines.append(
                "This change, or an earlier change on main, moved the digest. "
                "`runner check` refuses a comparison with this baseline."
            )
        if self.needs_rebaseline:
            if rebaselined and not self.drift:
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
                    "Run a full check and adopt it, and commit BASELINE.json in this pull request. See EVALS.md."
                )
        if self.behavior_hits:
            lines.append("This change moves the agent without moving the yardstick:")
            for hit in self.behavior_hits:
                lines.append(f"  {hit.path}  ({hit.axis}) {hit.because}")
            if not self.needs_rebaseline:
                lines.append("The baseline stays valid. Run a check and show it against the baseline.")
        return tuple(lines)


def _match(path: str, rules: tuple[tuple[str, str, str], ...]) -> tuple[str, str] | None:
    for pattern, axis, because in rules:
        if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, f"{pattern}/*"):
            return axis, because
    return None


def report(
    changed: list[str],
    *,
    strict: bool,
    before: SourceReader | None = None,
    measure: Measure | None = None,
) -> int:
    """Print what a change means for the baseline and return an exit code."""
    from benchmarks import baseline as pointer_file

    pointer = pointer_file.read()
    found = analyze(changed, before=before)
    if pointer:
        found = replace(found, drift=compare_digests(pointer.axes, (measure or current_digests)()))
    rebaselined = any(path.endswith("BASELINE.json") for path in changed)
    for line in found.explain(rebaselined=rebaselined):
        print(line)
    if not found.needs_rebaseline:
        return 0
    if rebaselined and not found.drift:
        return 0

    print()
    print("=" * 78)
    if rebaselined:
        print("THIS CHANGE RECORDS A NEW BASELINE, BUT NOT FOR THIS CODE")
    else:
        print("THIS CHANGE INVALIDATES THE BASELINE, AND NO NEW ONE IS RECORDED")
    print("=" * 78)
    print()
    print("You changed what the harness measures with. Every score the current baseline")
    print("holds was produced by a different instrument, so no comparison against it")
    print("means anything from here on, whatever the agent does.")
    print()
    print(f"BASELINE.json points at: {pointer.check_id if pointer else 'nothing'}")
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
    print("If you did not mean to change the yardstick, revert that change instead.")
    print("Details: src/AI/agents/benchmarks/EVALS.md")
    return 1 if strict else 0


def current_digests() -> dict[str, str | None]:
    """The digests of this checkout. They import the agent code, so they need requirements.txt."""
    from benchmarks import provenance

    return provenance.digests(on_failure=print_digest_failure)


def print_digest_failure(axis: str, error: Exception) -> None:
    print(f"The {axis} digest failed:", file=sys.stderr)
    traceback.print_exception(error, file=sys.stderr)


def compare_digests(recorded: dict[str, str], current: dict[str, str | None]) -> tuple[Drift, ...]:
    """The digests that are not equal to the baseline. A failed or unrecorded digest is not equal."""
    drift: list[Drift] = []
    for axis, because in DIGESTS:
        baseline = recorded.get(axis, NOT_RECORDED)
        value = current.get(axis)
        if value != baseline:
            drift.append(Drift(axis, baseline, value, because))
    return tuple(drift)


def analyze(
    changed: list[str],
    *,
    before: SourceReader | None = None,
    after: SourceReader | None = None,
) -> Impact:
    """What a set of changed paths means for the baseline.

    Without `before`, the paths alone decide. With `before`, a Python file
    moves no axis when only its docstrings, comments or formatting change.
    """
    prefix = "src/AI/agents/"
    hits: list[Hit] = []
    docs_only: list[str] = []
    for raw in changed:
        path = raw[len(prefix) :] if raw.startswith(prefix) else raw
        if not path or path.startswith("tests/"):
            continue
        if any(fnmatch.fnmatch(path, rule) for rule in CARRIES_NO_AXIS):
            continue
        yardstick = True
        found = _match(path, YARDSTICK)
        if not found:
            yardstick = False
            found = _match(path, BEHAVIOR)
        if not found:
            continue
        if before and _is_docs_only_change(path, before, after or read_working_tree):
            docs_only.append(path)
            continue
        hits.append(Hit(path, found[0], found[1], yardstick=yardstick))
    return Impact(hits=tuple(hits), docs_only=tuple(docs_only))


def _is_docs_only_change(path: str, before: SourceReader, after: SourceReader) -> bool:
    if not path.endswith(".py"):
        return False
    old_source, new_source = before(path), after(path)
    if old_source is None or new_source is None:
        return False
    old_tree, new_tree = _code_without_docstrings(old_source), _code_without_docstrings(new_source)
    return old_tree is not None and old_tree == new_tree


def _code_without_docstrings(source: str) -> str | None:
    """The AST dump of the source, without module and function docstrings.

    The dump has no comments, no formatting and no line numbers. Class
    docstrings stay, because pydantic copies them into a tool's input schema.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return None
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef)) and ast.get_docstring(
            node, clean=False
        ):
            node.body = node.body[1:] or [ast.Pass()]
    return ast.dump(tree)


def read_working_tree(path: str) -> str | None:
    try:
        return (AGENTS_ROOT / path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def git_reader(against: str) -> SourceReader | None:
    """Reads a file as it was where this branch left `against`."""
    merge_base = _git("merge-base", against, "HEAD")
    if merge_base is None:
        return None
    return lambda path: _git("show", f"{merge_base}:./{path}", strip=False)


def _git(*args: str, strip: bool = True) -> str | None:
    try:
        out = subprocess.run(("git", *args), cwd=AGENTS_ROOT, capture_output=True, text=True, check=False)
    except OSError:
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip() if strip else out.stdout


def _main() -> int:
    """The CI entry point. The digests import the agent code, so CI installs requirements.txt."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="changed paths, default stdin or a git diff")
    parser.add_argument("--against", default=DEFAULT_BASE_REF, help="the base ref of the change")
    parser.add_argument("--strict", action="store_true", help="exit non-zero when a re-baseline is missing")
    args = parser.parse_args()

    if args.paths:
        changed = args.paths
    elif not sys.stdin.isatty():
        changed = [line.strip() for line in sys.stdin if line.strip()]
    else:
        diff = subprocess.run(
            ("git", "diff", "--name-only", f"{args.against}...HEAD"),
            capture_output=True,
            text=True,
            check=False,
        )
        if diff.returncode != 0:
            print(
                "Could not work out what changed, so this gate proves nothing:\n"
                + (diff.stderr.strip() or f"git diff {args.against}...HEAD failed"),
                file=sys.stderr,
            )
            return 1
        changed = [line for line in diff.stdout.splitlines() if line.strip()]
    return report(changed, strict=args.strict, before=git_reader(args.against))


if __name__ == "__main__":
    raise SystemExit(_main())
