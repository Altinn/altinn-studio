"""Spec extraction pipeline — parses attachments into a structured FormSpec."""

from __future__ import annotations

import contextlib
import json
from typing import Any

from agents.graph.state import FormSpec, FormSpecField, FormSpecPage
from agents.prompts import get_prompt_with_langfuse, render_template
from agents.services.llm import LLMClient
from shared.models import AgentAttachment
from shared.utils.langfuse_utils import trace_span
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def run_spec_pipeline(
    user_goal: str,
    attachments: list[AgentAttachment],
) -> FormSpec | None:
    """Extract a FormSpec from the provided attachments using vision LLM.

    Returns None if extraction fails or no usable spec can be produced.
    """
    if not attachments:
        return None

    system_prompt, lf_prompt = get_prompt_with_langfuse("spec_extraction")
    user_prompt = render_template("spec_extraction_user", user_goal=user_goal)

    client = LLMClient(role="planner")  # Vision-capable model
    with trace_span(
        "spec_extraction_llm",
        metadata={
            "span_type": "GENERATION",
            "attachment_count": len(attachments),
            **client.get_model_metadata(),
        },
        input={"user_goal": user_goal, "attachment_count": len(attachments)},
    ) as span:
        try:
            raw_response = client.call_sync(
                system_prompt,
                user_prompt,
                attachments=attachments,
                langfuse_prompt=lf_prompt,
            )
        except Exception as e:
            error_str = str(e)
            span.update(output={"error": error_str})

            # If max_tokens was hit, retry with a shorter prompt asking for compact output
            if "max_tokens" in error_str or "output limit" in error_str:
                log.warning("The spec extraction hit the output limit, so it retries with a compact prompt")
                compact_prompt = (
                    "Extract fields from the attached form. Return ONLY compact JSON: "
                    '{"title":"...","language":"nb","total_pages":N,'
                    '"pages":[{"page_name":"side1","title":"...","fields":'
                    '[{"id":"...","label":"...","field_type":"text","data_model_binding":"..."}]}]}'
                    "\nOmit description, options, required unless essential. Minimize whitespace."
                )
                try:
                    raw_response = client.call_sync("", compact_prompt, attachments=attachments)
                except Exception as retry_err:
                    span.update(output={"error": str(retry_err), "retry_failed": True})
                    return None
            else:
                return None

        # Parse inside the span so we can record the result
        form_spec = _parse_spec_response(raw_response)

        if form_spec:
            span.update(
                output={
                    "response_length": len(raw_response),
                    "parse_success": True,
                    "spec_title": form_spec.title,
                    "spec_pages": form_spec.total_pages,
                    "spec_fields": form_spec.field_count(),
                }
            )
        else:
            span.update(
                output={
                    "response_length": len(raw_response),
                    "parse_success": False,
                    "response_preview": raw_response[:1000],
                }
            )

    return form_spec


def _try_parse_json(text: str) -> dict | None:
    """Try to parse JSON, with repair strategies for truncated output."""
    # 1. Direct parse
    with contextlib.suppress(json.JSONDecodeError):
        return json.loads(text)

    # 2. Extract between first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        with contextlib.suppress(json.JSONDecodeError):
            return json.loads(text[start : end + 1])

    # 3. Truncated JSON — try closing open brackets/braces
    if start != -1:
        fragment = text[start:]
        # Count unclosed brackets
        opens = 0
        open_sq = 0
        for ch in fragment:
            if ch == "{":
                opens += 1
            elif ch == "}":
                opens -= 1
            elif ch == "[":
                open_sq += 1
            elif ch == "]":
                open_sq -= 1

        # Try closing them
        repaired = fragment.rstrip(", \n\t")
        repaired += "]" * max(open_sq, 0)
        repaired += "}" * max(opens, 0)
        with contextlib.suppress(json.JSONDecodeError):
            return json.loads(repaired)

    # 4. Last resort: a permissive JSON repairer handles the model quirks
    #    the strict strategies miss — trailing commas, unescaped newlines
    #    in strings, single quotes, missing commas between objects, etc.
    #    Haiku-class models emit these more often than Sonnet, so without
    #    this fallback spec extraction silently fails on the Haiku path.
    with contextlib.suppress(Exception):
        from json_repair import repair_json

        repaired_text = repair_json(text, return_objects=False)
        if repaired_text and repaired_text != "{}":
            data = json.loads(repaired_text)
            if isinstance(data, dict):
                return data

    return None


def _normalize_options(options: Any) -> Any:
    """Coerce option entries into the `{label, value}` shape FormSpecField
    requires.

    Haiku (and to a lesser extent Sonnet) sometimes emits options as
    `{"id": ..., "label": ...}` instead of `{"label": ..., "value": ...}`,
    which trips pydantic's `value` required-field check and kills the
    whole spec.  We accept either shape and derive `value` from `id` (or
    a kebab-cased label) when missing.  Non-dict entries pass through
    unchanged; the model layer will surface a clearer error if they
    actually break validation.
    """
    if not isinstance(options, list):
        return options
    normalized = []
    for opt in options:
        if not isinstance(opt, dict):
            normalized.append(opt)
            continue
        if "value" in opt and opt["value"] not in (None, ""):
            normalized.append(opt)
            continue
        fallback = opt.get("id")
        if not isinstance(fallback, str) or not fallback:
            label = opt.get("label", "")
            fallback = (
                "".join(c if c.isalnum() else "-" for c in str(label).lower()).strip("-").replace("--", "-") or "value"
            )
        normalized.append({**opt, "value": fallback})
    return normalized


def _parse_spec_response(raw: str) -> FormSpec | None:
    """Parse raw LLM JSON response into a validated FormSpec."""
    # Strip markdown fences if present
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        text = text[first_newline + 1 :] if first_newline != -1 else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    data = _try_parse_json(text)
    if data is None:
        return None

    try:
        pages = []
        for p in data.get("pages", []):
            fields = []
            for f in p.get("fields", []):
                fields.append(
                    FormSpecField(
                        id=f.get("id", "unknown"),
                        label=f.get("label", ""),
                        description=f.get("description"),
                        field_type=f.get("field_type", "text"),
                        options=_normalize_options(f.get("options")),
                        required=f.get("required", False),
                        data_model_binding=f.get("data_model_binding"),
                    )
                )
            pages.append(
                FormSpecPage(
                    page_name=p.get("page_name", f"side{len(pages) + 1}"),
                    title=p.get("title", ""),
                    section_id=p.get("section_id"),
                    fields=fields,
                )
            )

        spec = FormSpec(
            title=data.get("title", "Untitled Form"),
            language=data.get("language", "nb"),
            total_pages=data.get("total_pages", len(pages)),
            pages=pages,
            metadata=data.get("metadata", {}),
        )
        return spec

    except Exception:
        return None
