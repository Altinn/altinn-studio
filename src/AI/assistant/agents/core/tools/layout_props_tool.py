"""`altinn_layout_props` — the allowed properties of a layout component type.

Replaces the MCP wrapper of the same name, so the system prompt's
guidance ("call `altinn_layout_props` before layout edits") keeps
working unchanged.  Logic lives in `agents.altinn.layout`; this class is
a thin `Tool` shim.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from agents.altinn.layout import get_layout_schema
from agents.altinn.layout.properties import layout_properties_tool
from agents.core.tool import LoopContext, Tool, ToolResult


class LayoutPropsArgs(BaseModel):
    component_type: str = Field(
        description="Layout component type exactly as it appears in `\"type\"`, e.g. 'Input', 'Checkboxes', 'NavigationButtons'."
    )


class LayoutPropsTool(Tool[LayoutPropsArgs]):
    """Canonical property list for a layout component type."""

    name = "altinn_layout_props"
    description = (
        "Get the canonical schema for one layout component type: allowed "
        "properties, required properties, and their types — extracted live "
        "from the official Altinn layout schema, plus `constraints`: the "
        "pairings the schema permits but the renderer rejects.  Call this "
        "BEFORE adding or editing any layout component; the validator "
        "rejects unknown properties and your memory of the schema may be "
        "stale."
    )
    input_schema = LayoutPropsArgs
    is_concurrency_safe = True

    async def run(self, args: LayoutPropsArgs, ctx: LoopContext) -> ToolResult:
        profile = ctx.app_version_profile
        try:
            schema = get_layout_schema(profile.layout_schema_location)
        except Exception as exc:  # schema load / parse errors
            return ToolResult(content=f"Could not load component schema: {exc}", is_error=True)
        result = layout_properties_tool(
            user_goal="agentic-loop",
            component_type=args.component_type,
            schema=schema,
            binding_constraints=profile.binding_constraints,
        )
        is_error = isinstance(result, dict) and result.get("status") == "error"
        return ToolResult(
            content=json.dumps(result, ensure_ascii=False),
            is_error=bool(is_error),
            metadata={
                "source": {
                    "title": f"Layout-skjema ({args.component_type})",
                    "url": profile.layout_schema_display_url,
                    "kind": "schema",
                }
            },
        )
