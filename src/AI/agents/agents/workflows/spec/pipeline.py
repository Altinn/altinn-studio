"""Spec extraction pipeline — parses attachments into a structured FormSpec."""

from __future__ import annotations

import json
from typing import Dict, List, Optional, Any

from shared.utils.langfuse_utils import trace_span

from agents.graph.state import FormSpec, FormSpecPage, FormSpecField
from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from shared.models import AgentAttachment
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


def run_spec_pipeline(
    user_goal: str,
    attachments: List[AgentAttachment],
) -> Optional[FormSpec]:
    """Extract a FormSpec from the provided attachments using vision LLM.

    Returns None if extraction fails or no usable spec can be produced.
    """
    if not attachments:
        log.info("No attachments provided — skipping spec extraction")
        return None

    system_prompt = get_prompt_content("spec_extraction")
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
                system_prompt, user_prompt, attachments=attachments
            )
            span.update(output={"response_length": len(raw_response)})
        except Exception as e:
            error_str = str(e)
            log.error(f"Spec extraction LLM call failed: {error_str}")
            span.update(output={"error": error_str})

            # If max_tokens was hit, retry with a shorter prompt asking for compact output
            if "max_tokens" in error_str or "output limit" in error_str:
                log.info("Retrying spec extraction with compact prompt...")
                compact_prompt = (
                    "Extract fields from the attached form. Return ONLY compact JSON: "
                    '{"title":"...","language":"nb","total_pages":N,'
                    '"pages":[{"page_name":"side1","title":"...","fields":'
                    '[{"id":"...","label":"...","field_type":"text","data_model_binding":"..."}]}]}'
                    "\nOmit description, options, required unless essential. Minimize whitespace."
                )
                try:
                    raw_response = client.call_sync(
                        "", compact_prompt, attachments=attachments
                    )
                    log.info(f"Retry succeeded, response length: {len(raw_response)}")
                    span.update(output={"response_length": len(raw_response), "retry": True})
                except Exception as retry_err:
                    log.error(f"Spec extraction retry also failed: {retry_err}")
                    return None
            else:
                return None

    # Parse the JSON response into FormSpec
    form_spec = _parse_spec_response(raw_response)

    if form_spec:
        log.info(
            f"✅ Spec extracted: \"{form_spec.title}\" — "
            f"{form_spec.total_pages} pages, {form_spec.field_count()} fields"
        )
    else:
        log.warning("⚠️ Could not parse spec from LLM response")

    return form_spec


def _try_parse_json(text: str) -> Optional[dict]:
    """Try to parse JSON, with repair strategies for truncated output."""
    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Extract between first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

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
        try:
            data = json.loads(repaired)
            log.info(f"Repaired truncated JSON (closed {max(opens,0)} braces, {max(open_sq,0)} brackets)")
            return data
        except json.JSONDecodeError:
            pass

    log.error("All JSON parse strategies failed")
    return None


def _parse_spec_response(raw: str) -> Optional[FormSpec]:
    """Parse raw LLM JSON response into a validated FormSpec."""
    # Strip markdown fences if present
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1 :]
    if text.endswith("```"):
        text = text[: -3]
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
                        options=f.get("options"),
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

    except Exception as e:
        log.error(f"Failed to construct FormSpec from parsed data: {e}")
        return None
