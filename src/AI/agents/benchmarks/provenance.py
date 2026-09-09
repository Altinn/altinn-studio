"""What a run ran against."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

AGENTS_ROOT = Path(__file__).resolve().parents[1]

# code is deliberately not blocking.
BLOCKING_AXES = (
    "environment",
    "prompts",
    "actor_prompt",
    "tools",
    "dataset",
    "evaluators",
    "judge",
)

ENVIRONMENTS = ("local", "dev", "prod", "ci")

LIVE_ROLES = ("actor", "planner", "default")


def _git(*args: str) -> str | None:
    try:
        out = subprocess.run(
            ("git", *args),
            cwd=AGENTS_ROOT,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


@dataclass(frozen=True)
class Code:
    commit: str | None
    branch: str | None
    dirty: bool

    def __str__(self) -> str:
        if not self.commit:
            return "unknown"
        return f"{self.commit[:7]} {'dirty' if self.dirty else 'clean'}"


@dataclass(frozen=True)
class Provenance:
    """The state a run ran against. Compared axis by axis, never as a whole."""

    recorded_at: str
    environment: str
    code: Code
    models: dict[str, str]
    sampling: dict[str, str]
    prompts: dict[str, int]
    actor_prompt: str | None
    tools: str | None
    dataset: str | None
    evaluators: dict[str, int]
    judge: str | None
    notes: tuple[str, ...] = field(default_factory=tuple)

    def axis(self, name: str) -> object:
        if name == "code":
            return str(self.code)
        return getattr(self, name)

    def axes(self) -> dict[str, object]:
        return {
            "code": str(self.code),
            "environment": self.environment,
            "models": self.models,
            "sampling": self.sampling,
            "prompts": self.prompts,
            "actor_prompt": self.actor_prompt,
            "tools": self.tools,
            "dataset": self.dataset,
            "evaluators": self.evaluators,
            "judge": self.judge,
        }

    def differs_from(self, other: Provenance) -> tuple[str, ...]:
        return tuple(name for name, value in self.axes().items() if other.axes()[name] != value)

    def missing(self) -> tuple[str, ...]:
        """Axes we could not collect. An unrecorded axis is not a matching one."""
        return tuple(name for name, value in self.axes().items() if value in (None, {}, ""))

    def never_collected(self) -> tuple[str, ...]:
        """Axes with no value at all. An empty dict is a collected, empty answer."""
        return tuple(name for name, value in self.axes().items() if value is None)

    def to_dict(self) -> dict:
        data = asdict(self)
        data["code"] = asdict(self.code)
        return data

    @classmethod
    def from_dict(cls, data: dict) -> Provenance:
        payload = dict(data)
        payload["code"] = Code(**payload["code"])
        payload["notes"] = tuple(payload.get("notes") or ())
        return cls(**payload)

    def as_langfuse_metadata(self) -> dict[str, str]:
        """Langfuse run metadata is a flat string map, so nested axes are encoded."""
        flat: dict[str, str] = {
            "environment": self.environment,
            "code": str(self.code),
            "actor_prompt": self.actor_prompt or "unknown",
            "tools": self.tools or "unknown",
            "dataset": self.dataset or "unknown",
            "judge": self.judge or "none",
            "recorded_at": self.recorded_at,
        }
        for name in ("models", "sampling", "prompts", "evaluators"):
            value = getattr(self, name)
            flat[name] = json.dumps(value, sort_keys=True) if value else "unknown"
        return flat


def _code() -> Code:
    commit = _git("rev-parse", "HEAD")
    branch = _git("rev-parse", "--abbrev-ref", "HEAD")
    status = _git("status", "--porcelain")
    return Code(commit=commit, branch=branch, dirty=bool(status))


def _models_and_sampling() -> tuple[dict[str, str], dict[str, str]]:
    from shared.config import base_config

    resolved = base_config.resolved_role_models()
    models = {role: resolved[role] for role in LIVE_ROLES if role in resolved}
    config = base_config.BaseConfig
    sampling = {
        "temperature": _sampling_value(config.LLM_TEMPERATURE),
        "temperature_planner": _sampling_value(config.LLM_TEMPERATURE_PLANNER),
        # The live knob for the gpt-5 family, which the gates run on.
        "reasoning_effort": _sampling_value(config.LLM_REASONING_EFFORT),
    }
    return models, sampling


def _sampling_value(value: object) -> str:
    """Unset means the model's own default, which is a real setting, not a hole."""
    return "model default" if value is None else str(value)


def _actor_prompt_digest() -> str | None:
    """A hash of the actor's static system prompt."""
    try:
        from agents.core.context import stable_prefix_sections

        sections = stable_prefix_sections()
    except Exception:  # noqa: BLE001
        return None
    payload = "\n\n".join(sections).encode()
    return hashlib.sha256(payload).hexdigest()[:12]


def _tools_digest() -> str | None:
    """A hash of every tool schema the actor is shown."""
    try:
        from agents.graph.nodes.agentic_loop_node import _build_registry

        schema = _build_registry().to_schema()
    except Exception:  # noqa: BLE001
        return None
    payload = json.dumps(schema, sort_keys=True).encode()
    return hashlib.sha256(payload).hexdigest()[:12]


def _environment() -> str:
    declared = os.getenv("BENCHMARK_ENVIRONMENT")
    if declared in ENVIRONMENTS:
        return declared
    if os.getenv("GITHUB_ACTIONS"):
        return "ci"
    return "local"


def collect(
    *,
    prompts: dict[str, int] | None = None,
    dataset: str | None = None,
    evaluators: dict[str, int] | None = None,
    judge: str | None = None,
    agent_models: dict[str, str] | None = None,
) -> Provenance:
    """Everything knowable without a network call, plus what the caller knows."""
    models, sampling = _models_and_sampling()
    if agent_models:
        models = {**models, **{r: m for r, m in agent_models.items() if r in LIVE_ROLES}}
    provenance = Provenance(
        recorded_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        environment=_environment(),
        code=_code(),
        models=models,
        sampling=sampling,
        prompts=prompts or {},
        actor_prompt=_actor_prompt_digest(),
        tools=_tools_digest(),
        dataset=dataset,
        evaluators=evaluators or {},
        judge=judge,
    )
    missing = provenance.missing()
    if missing:
        provenance = Provenance(
            **{
                **provenance.to_dict(),
                "code": provenance.code,
                "notes": (f"axes not recorded: {', '.join(missing)}",),
            }
        )
    return provenance


MEASUREMENT_AXES = ("prompts", "actor_prompt", "tools", "dataset", "evaluators")


def blocking_differences(left: Provenance, right: Provenance, under_test: tuple[str, ...]) -> tuple[str, ...]:
    """Axes that differ, or that neither run recorded, and were not declared as the change."""
    suspect = set(left.differs_from(right)) | set(unverifiable(left, right))
    return tuple(a for a in BLOCKING_AXES if a in suspect and a not in under_test)


def unverifiable(left: Provenance, right: Provenance) -> tuple[str, ...]:
    """Blocking axes one side never recorded, so equality was never established."""
    blind = set(left.never_collected()) | set(right.never_collected())
    return tuple(a for a in BLOCKING_AXES if a in blind)


def remedy(refused: tuple[str, ...]) -> tuple[str, ...]:
    """What to do about a refused comparison, by what kind of axis moved."""
    lines: list[str] = []
    measurement = [a for a in refused if a in MEASUREMENT_AXES]
    if measurement:
        lines.append(
            "The baseline predates a change to what is measured ("
            + ", ".join(measurement)
            + "). Its scores are not comparable to today's, whatever the agent does."
        )
        lines.append(
            "Fix: run a full check on main, adopt it as the baseline, and commit the "
            "pointer. Then re-run your candidate against it."
        )
        lines.append(
            "Better: whoever changes a dataset, a prompt or an evaluator re-baselines in "
            "the same pull request, so the yardstick and the reference move together."
        )
    if "environment" in refused:
        lines.append(
            "The two runs are from different environments, so the difference includes the "
            "deployment. Run both in the same place."
        )
    if "judge" in refused:
        lines.append(
            "The judge model changed, so scores it produced are on a different scale. "
            "Re-run the baseline with today's judge."
        )
    lines.append(
        "If you changed one of these on purpose and want it compared anyway, declare it: "
        "--under-test " + " --under-test ".join(refused) + "."
    )
    return tuple(lines)
