"""The planner's two remaining call sites: spec extraction and semantic query."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from langfuse import Evaluation

ASSETS_DIR = Path(__file__).parent / "assets"

LABEL_MATCH_CHARS = 24


def _first_json_object(text: str) -> dict[str, Any] | None:
    match = re.search(r"\{.*\}", text or "", re.S)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def spec_labels(spec: dict[str, Any]) -> list[str]:
    return [
        str(field.get("label") or "")
        for page in spec.get("pages") or []
        for field in page.get("fields") or []
    ]


def _shortened(label: str) -> str:
    return " ".join(label.lower().split())[:LABEL_MATCH_CHARS]


def spec_parses(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Did the extraction return a usable FormSpec."""
    if not (expected_output or {}).get("labels"):
        return []
    spec = (output or {}).get("spec") if isinstance(output, dict) else None
    missing = [] if spec else ["not JSON"]
    if spec:
        missing = [key for key in ("title", "pages") if key not in spec]
        if not spec_labels(spec):
            missing.append("no fields in any page")
    return [
        Evaluation(
            name="spec_parses",
            value=0.0 if missing else 1.0,
            data_type="BOOLEAN",
            comment="; ".join(missing) if missing else "a usable spec",
        )
    ]


def spec_label_coverage(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
    """How much of the form it actually found."""
    expected = (expected_output or {}).get("labels")
    if not expected:
        return []
    spec = (output or {}).get("spec") if isinstance(output, dict) else None
    if not spec:
        return [
            Evaluation(
                name="spec_label_coverage",
                value=0.0,
                data_type="NUMERIC",
                comment="no spec to inspect",
            )
        ]
    found = [_shortened(label) for label in spec_labels(spec)]
    missing = [
        label for label in expected if not any(_shortened(label) in f or f in _shortened(label) for f in found)
    ]
    return [
        Evaluation(
            name="spec_label_coverage",
            value=round((len(expected) - len(missing)) / len(expected), 4),
            data_type="NUMERIC",
            comment=f"{len(expected) - len(missing)}/{len(expected)} known labels found"
            + (f"; missing e.g. {missing[:3]}" if missing else ""),
        )
    ]


def spec_field_count(
    *, output: Any = None, expected_output: Any = None, **_: Any
) -> list[Evaluation]:
    """Roughly the right number of fields, not exactly."""
    expected = (expected_output or {}).get("field_count")
    if not expected:
        return []
    spec = (output or {}).get("spec") if isinstance(output, dict) else None
    actual = len(spec_labels(spec)) if spec else 0
    ratio = actual / expected if expected else 0
    return [
        Evaluation(
            name="spec_field_count",
            value=round(min(ratio, 2.0), 4),
            data_type="NUMERIC",
            comment=f"{actual} fields against {expected} known"
            + (" (well above, check for invented fields)" if ratio > 1.4 else ""),
        )
    ]


def query_terms(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """Does the search query carry the terms that would retrieve the right docs."""
    expected = (expected_output or {}).get("any_of")
    if not expected:
        return []
    text = ((output or {}).get("text") or "").lower()
    hits = [group for group in expected if any(word.lower() in text for group in [group] for word in group)]
    return [
        Evaluation(
            name="query_terms",
            value=round(len(hits) / len(expected), 4),
            data_type="NUMERIC",
            comment=f"{len(hits)}/{len(expected)} concept(s) named in {text[:56]!r}",
        )
    ]


def query_is_a_query(*, output: Any = None, expected_output: Any = None, **_: Any) -> list[Evaluation]:
    """A search query, not a sentence or an answer."""
    if not (expected_output or {}).get("any_of"):
        return []
    text = ((output or {}).get("text") or "").strip()
    words = text.split()
    problems = []
    if not words:
        problems.append("empty")
    if len(words) > 12:
        problems.append(f"{len(words)} words, expected a short query")
    if text.endswith((".", "?", "!")) or text.startswith(("I ", "Jeg ", "The user")):
        problems.append("reads as prose rather than a query")
    return [
        Evaluation(
            name="query_is_a_query",
            value=0.0 if problems else 1.0,
            data_type="BOOLEAN",
            comment="; ".join(problems) if problems else f"{len(words)} terms",
        )
    ]


ITEM_EVALUATORS = [
    spec_parses,
    spec_label_coverage,
    spec_field_count,
    query_terms,
    query_is_a_query,
]


@dataclass
class PlannerTask:
    """One planner call: the published prompt, the production user message, and the
    attachment when the item names one."""

    prompt_name: str
    model: str
    user_template: str | None = None
    max_tokens: int = 8000

    async def __call__(self, *, item: Any, **_: Any) -> dict[str, Any]:
        import asyncio

        from agents.prompts.loader import get_prompt_with_langfuse, render_template

        from .agent_task import item_field

        item_input = item_field(item, "input") or {}
        system_prompt, lf_prompt = get_prompt_with_langfuse(self.prompt_name)
        user_prompt = (
            render_template(self.user_template, **item_input["template_vars"])
            if self.user_template
            else item_input["user_message"]
        )

        client = _planner_client_for(self.model)
        attachments = _attachments(item_input.get("attachments") or [])

        text = await asyncio.to_thread(
            client.call_sync,
            system_prompt,
            user_prompt,
            attachments=attachments or None,
            langfuse_prompt=lf_prompt,
        )
        return {"text": text, "spec": _first_json_object(text), "model": self.model}


def _planner_client_for(model: str) -> Any:
    """An LLMClient for the planner role, pinned to one model."""
    from agents.services.llm import llm_client

    previous = llm_client.config.LLM_MODEL_PLANNER
    llm_client.config.LLM_MODEL_PLANNER = model
    try:
        client = llm_client.LLMClient(role="planner")
    finally:
        llm_client.config.LLM_MODEL_PLANNER = previous
    if client.model != model:
        raise RuntimeError(
            f"asked for {model} and the client resolved {client.model}; the planner "
            "role is not reading the pinned model"
        )
    return client


def _attachments(names: list[str]) -> list[Any]:
    """The PDFs an item names, read from `assets/`."""
    import base64
    import mimetypes

    from shared.models import AgentAttachment

    built = []
    for name in names:
        path = ASSETS_DIR / name
        if not path.is_file():
            raise FileNotFoundError(
                f"{name!r} is not in {ASSETS_DIR}. Spec extraction needs the file, so "
                "the asset has to be present."
            )
        data = path.read_bytes()
        built.append(
            AgentAttachment(
                name=name,
                mime_type=mimetypes.guess_type(name)[0] or "application/pdf",
                size=len(data),
                path=path,
                data_base64=base64.b64encode(data).decode(),
            )
        )
    return built

SCORE_NAMES = (
    "query_is_a_query",
    "query_terms",
    "spec_field_count",
    "spec_label_coverage",
    "spec_parses",
)
