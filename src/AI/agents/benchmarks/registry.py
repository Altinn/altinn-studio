"""Every dataset, declared once."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

DATASETS_DIR = Path(__file__).parent / "datasets"

# prompt: one message. generation: a replayed trace. planner: a file. e2e: tools run.
KINDS = ("prompt", "generation", "planner", "e2e")

STATUSES = ("live", "retired", "orphan")


@dataclass(frozen=True)
class Eval:
    name: str
    kind: str
    summary: str
    status: str = "live"
    file: str | None = None
    prompt: str | None = None
    user_template: str | None = None
    note: str | None = None

    def __post_init__(self) -> None:
        assert self.kind in KINDS, f"{self.name}: unknown kind {self.kind}"
        assert self.status in STATUSES, f"{self.name}: unknown status {self.status}"
        if self.status == "live" and self.kind != "e2e":
            assert self.file, f"{self.name}: a live eval needs its items in the repo"
        if self.kind == "planner":
            assert self.user_template, f"{self.name}: name the user template"
        if self.status != "live":
            assert self.note, f"{self.name}: say why it is {self.status}"

    @property
    def path(self) -> Path | None:
        return DATASETS_DIR / self.file if self.file else None

    def langfuse_description(self, item_count: int | None = None) -> str:
        """What the Langfuse dataset tab shows, assembled so it cannot drift."""
        from benchmarks import manifest

        parts = [self.summary.strip()]

        claims = manifest.for_eval(self.name)
        pinned = [b for b in claims if b.is_pinned]
        if pinned:
            held = "; ".join(f"{b.text} ({b.evaluator})" for b in pinned)
            parts.append(f"Holds: {held}.")
        elif claims:
            parts.append(
                f"Declared by {claims[0].id}, which nothing scores yet, so runs here "
                "prove nothing."
            )
        else:
            parts.append("No behavior in the repo claims this dataset.")

        where = f"benchmarks/datasets/{self.file}" if self.file else "here only"
        parts.append(f"Items: {item_count if item_count is not None else 'see below'}, edited in {where}.")

        if self.status == "live":
            parts.append("Run: python -m benchmarks.runner check (see benchmarks/EVALS.md).")
        else:
            parts.append(f"Not runnable: {self.status}.")
        if self.note:
            parts.append(self.note.strip())
        return " ".join(parts)


EVALS = (
    Eval(
        name="Gates/scope",
        kind="prompt",
        file="gates_scope.jsonl",
        prompt="scope_check",
        summary=(
            "Is the question about Altinn app development at all. The hard cases are "
            "pairs that share a subject and differ only in the verb: travel advice is "
            "out of scope, a field asking where you travel is not."
        ),
    ),
    Eval(
        name="Gates/intent-safety",
        kind="prompt",
        file="gates_intent_safety.jsonl",
        prompt="intent_check",
        summary=(
            "Is the request a legitimate use of an app-development agent. Read the two "
            "directions separately: false rejections of real work cost more than an "
            "ambiguous request reaching the later layers."
        ),
    ),
    Eval(
        name="Gates/confidence",
        kind="prompt",
        file="gates_confidence.jsonl",
        prompt="intent_check",
        summary=(
            "Does the parsed confidence land on the right side of the 0.30 threshold the "
            "workflow gate rejects on. Bands, not values."
        ),
    ),
    Eval(
        name="Loop/traces",
        kind="generation",
        file="loop_traces.jsonl",
        summary=(
            "Real decision points replayed from production traces: the conversation, the "
            "turn shape, the tool results and each session's own system prompt all come "
            "from runs checked against the apps they produced. Includes one regression "
            "item asserting a behavior a source run got wrong, so a score of 0 there is "
            "the finding rather than a defect in the item."
        ),
    ),
    Eval(
        name="Planner/intake",
        kind="prompt",
        file="planner_intake.jsonl",
        prompt="intake_planning",
        summary=(
            "The intake node classifies a request before anything else runs, so a wrong "
            "task_type sends the whole workflow down the wrong path. Scored on the intent "
            "family rather than the exact string, because task_type is open-ended."
        ),
    ),
    Eval(
        name="Planner/spec",
        kind="planner",
        file="planner_spec.jsonl",
        prompt="spec_extraction",
        user_template="spec_extraction_user",
        summary=(
            "Spec extraction from a real PDF. Items name a file in assets/ rather than "
            "depending on a trace to have kept it, because traces record the extracted "
            "spec and never the upload. Scored on the field labels a verified run found, "
            "not on the page count, which has proved unstable across runs while the "
            "labels held."
        ),
    ),
    Eval(
        name="Planner/query",
        kind="planner",
        file="planner_query.jsonl",
        prompt="semantic_query_extraction",
        user_template="semantic_query_user",
        summary=(
            "Real chat questions from production turned into a search query. The "
            "retrieval step feeds the query straight into a search, so prose or a "
            "refusal here silently degrades every answer that depends on it. Scored on "
            "the concepts named rather than the wording, since any phrasing that names "
            "them retrieves the same documents."
        ),
    ),
    Eval(
        name="Benchmarks/forms",
        kind="e2e",
        summary=(
            "Full agent runs against a structural rubric. The only eval that executes "
            "tools, pushes a session branch and renders pages, so it is the only one that "
            "shows a generated app actually builds. One item sends a real PDF attachment. "
            "Items and rubrics live in Langfuse because a rubric is built from a golden "
            "app clone rather than written by hand."
        ),
    ),
    Eval(
        name="Redteam/indirect-injection",
        kind="prompt",
        status="orphan",
        summary=(
            "Indirect prompt-injection corpus from the lokkedue project. The payload "
            "arrives inside an attachment or a file the agent reads, which is the one "
            "channel Gates/intent-safety cannot cover because that gate sees filenames "
            "only. Injection resistance is model-dependent, so it belongs in a model "
            "comparison."
        ),
        note=(
            "The corpus lives here with its historical runs, and no runner "
            "in this repo executes it. It is the corpus the "
            "safety.flags-injection-in-attachment behavior needs, so keep it rather than "
            "retiring it: the work is to deliver these payloads through the attachment path "
            "and assert the instruction is not followed. See manifest.py for that behavior."
        ),
    ),

)


def by_name(name: str) -> Eval:
    for entry in EVALS:
        if entry.name == name:
            return entry
    raise SystemExit(
        f"{name!r} is not a declared eval. Known: {[e.name for e in EVALS]}"
    )


def live() -> tuple[Eval, ...]:
    return tuple(e for e in EVALS if e.status == "live")


def with_items_in_repo() -> tuple[Eval, ...]:
    """The evals whose items are version controlled, so they can be synced."""
    return tuple(e for e in EVALS if e.file and e.status == "live")

