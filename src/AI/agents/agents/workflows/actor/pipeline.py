"""Actor workflow pipeline orchestrating planning, tool execution, and patch synthesis."""

from __future__ import annotations

import json
import re
from langfuse import get_client
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from textwrap import dedent

from shared.utils.logging_utils import get_logger
from shared.models import AgentAttachment
from agents.services.llm import LLMClient
from agents.prompts import get_prompt_content, render_template
from agents.services.telemetry import is_json
from agents.services.repo import ensure_text_resources_in_patch

log = get_logger(__name__)



def extract_tool_text(result: Any) -> str:
    """Extract text content from MCP tool response."""
    # Handle CallToolResult objects (newer MCP versions)
    if hasattr(result, 'structured_content') and result.structured_content:
        return str(result.structured_content)
    elif hasattr(result, 'content'):
        content = result.content
        if isinstance(content, str):
            return content
        elif isinstance(content, list) and content:
            first_item = content[0]
            if hasattr(first_item, 'text'):
                text_content = first_item.text
                try:
                    parsed = json.loads(text_content)
                    if isinstance(parsed, dict) and "content" in parsed:
                        return parsed["content"]
                except json.JSONDecodeError:
                    pass
                return text_content
            return str(first_item)
        return str(content)

    # Handle list responses (legacy format)
    if isinstance(result, list) and result:
        first = result[0]
        if hasattr(first, "text"):
            text_content = first.text
            try:
                parsed = json.loads(text_content)
                if isinstance(parsed, dict) and "content" in parsed:
                    return parsed["content"]
            except json.JSONDecodeError:
                pass
            return text_content
        return str(first)
    
    return str(result)


def extract_component_types_from_tool_results(tool_results: List[Dict[str, Any]]) -> Set[str]:
    """Extract component types from layout_components_tool results.
    
    Only looks at actual component types found in layout files via "type": "ComponentName" pattern.
    This is the only reliable source for component types.
    """
    component_types: Set[str] = set()
    
    for result in tool_results:
        tool_name = result.get("tool", "")
        if tool_name == "layout_components_tool":
            # Extract from the tool result text
            result_text = str(result.get("result", ""))
            # Find "type": "ComponentName" patterns
            type_pattern = r'"type"\s*:\s*"([A-Z][a-zA-Z0-9]+)"'
            matches = re.findall(type_pattern, result_text)
            component_types.update(matches)
    
    return component_types


def get_looked_up_component_types(tool_results: List[Dict[str, Any]]) -> Set[str]:
    """Extract component types that have already been looked up via layout_properties_tool."""
    looked_up: Set[str] = set()
    
    for result in tool_results:
        if result.get("tool") == "layout_properties_tool":
            # Extract component_type from arguments
            args = result.get("arguments", {})
            comp_type = args.get("component_type")
            if comp_type:
                looked_up.add(comp_type)
    
    return looked_up


async def ensure_component_schemas_looked_up(
    mcp_client,
    tool_results: List[Dict[str, Any]],
    gitea_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Ensure all component types found in layout files have their schemas looked up.
    
    Only looks at actual component types from layout_components_tool results.
    Returns updated tool_results with any additional schema lookups.
    """
    needed_types = extract_component_types_from_tool_results(tool_results)
    looked_up_types = get_looked_up_component_types(tool_results)
    
    missing_types = needed_types - looked_up_types
    
    if not missing_types:
        log.info("✅ All component types have been looked up")
        return tool_results
    
    log.warning(f"🚨 Missing schema lookups for component types: {missing_types}")
    log.info(f"📋 Auto-fetching schemas for: {missing_types}")
    
    schema_url = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
    
    for comp_type in missing_types:
        try:
            log.info(f"🔍 Looking up schema for {comp_type}...")
            result = await mcp_client.call_tool(
                "layout_properties_tool",
                {
                    "component_type": comp_type,
                    "schema_url": schema_url,
                },
                gitea_token=gitea_token,
            )
            
            # Extract text from result
            result_text = extract_tool_text(result)
            
            tool_results.append({
                "tool": "layout_properties_tool",
                "objective": f"Auto-fetched schema for {comp_type} (was missing)",
                "arguments": {
                    "component_type": comp_type,
                    "schema_url": schema_url,
                },
                "result": result_text,
            })
            log.info(f"✅ Fetched schema for {comp_type}")
            
        except Exception as e:
            log.error(f"❌ Failed to fetch schema for {comp_type}: {e}")
    
    return tool_results


async def run_actor_pipeline(
    mcp_client,
    repository_path: str,
    user_goal: str,
    repo_facts: Dict[str, Any],
    planner_step: Optional[str] = None,
    *,
    general_plan_override: Optional[Dict[str, Any]] = None,
    tool_plan_override: Optional[List[Dict[str, Any]]] = None,
    tool_results_override: Optional[List[Dict[str, Any]]] = None,
    implementation_plan_override: Optional[Dict[str, Any]] = None,
    attachments: Optional[List[AgentAttachment]] = None,
    gitea_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the full actor workflow pipeline."""

    # Ensure MCP client is connected and has available tools populated
    if not hasattr(mcp_client, '_available_tools') or not mcp_client._available_tools:
        await mcp_client.connect(gitea_token)

    attachments = attachments or repo_facts.get("attachments")
    general_plan = general_plan_override or await create_general_plan(user_goal, planner_step, attachments=attachments)
    tool_plan = tool_plan_override or await create_tool_plan(
        user_goal, general_plan, repo_facts, mcp_client._available_tools, planner_step, attachments=attachments
    )
    if tool_results_override is not None:
        tool_results = tool_results_override
    else:
        tool_results = await execute_tool_plan(
            mcp_client, repository_path, user_goal, repo_facts, tool_plan, planner_step, general_plan, gitea_token
        )
    
    # 🚨 CRITICAL: Ensure all component types found in layout files have their schemas looked up
    # This prevents issues like Datepicker defaulting to timeStamp=true when data model expects date format
    # Only looks at actual component types from layout_components_tool results
    tool_results = await ensure_component_schemas_looked_up(
        mcp_client,
        tool_results,
        gitea_token,
    )
    
    # Skip the separate implementation_planning_llm step - it was taking ~99s and only
    # passing truncated data anyway. patch_synthesis now handles planning inline with
    # full tool results context.
    implementation_plan = implementation_plan_override or {}
    
    patch = await synthesize_patch(
        user_goal,
        repo_facts,
        tool_results,
        implementation_plan,
        general_plan,
        planner_step,
        repository_path,
        attachments=attachments,
    )

    if repository_path:
        added_keys = ensure_text_resources_in_patch(
            patch,
            repository_path,
            resource_files=repo_facts.get("resources"),
            available_locales=repo_facts.get("available_locales"),
        )
        if added_keys:
            log.info(
                "Ensured %d missing text resource bindings: %s",
                len(added_keys),
                ", ".join(added_keys[:10]) + ("..." if len(added_keys) > 10 else ""),
            )

    return {
        "general_plan": general_plan,
        "tool_plan": tool_plan,
        "tool_results": tool_results,
        "implementation_plan": implementation_plan,
        "patch": patch,
    }


async def create_general_plan(user_goal: str, planner_step: Optional[str] = None, *, attachments: Optional[List[AgentAttachment]] = None) -> Dict[str, Any]:
    client = LLMClient(role="planner")
    system_prompt = get_prompt_content("general_planning")
    user_prompt = render_template(
        "general_planning_user",
        user_goal=user_goal,
        planner_step=planner_step or "No plan generated yet"
    )

    langfuse = get_client()
    with langfuse.start_as_current_observation(
        name="general_planning_llm",
        as_type="generation",
        model=client.model,
        input={"user_goal": user_goal, "planner_step_present": bool(planner_step)},
        metadata={**client.get_model_metadata(), "user_goal_length": len(user_goal)}
    ) as span:
        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        span.update(output={"response": response[:5000]})

    return parse_json_response(response, "general plan")


async def create_tool_plan(
    user_goal: str,
    general_plan: Dict[str, Any],
    repo_facts: Dict[str, Any],
    available_tools: List[str] = None,
    planner_step: Optional[str] = None,
    *,
    attachments: Optional[List[AgentAttachment]] = None,
) -> List[Dict[str, Any]]:
    client = LLMClient(role="tool_planner")
    system_prompt = get_prompt_content("tool_planning")

    # Create repo summary for context
    repo_summary = {
        "layouts": len(repo_facts.get("layouts", [])),
        "models": len(repo_facts.get("models", [])),
        "resources": len(repo_facts.get("resources", [])),
        "sample_layout_files": repo_facts.get("layouts", [])[:3] if repo_facts.get("layouts") else [],
        "sample_model_files": repo_facts.get("models", [])[:2] if repo_facts.get("models") else [],
    }

    # Extract tool names from available_tools (which may be dicts with name/description)
    # Tools that should NOT be shown to the tool planner (internal/validation tools)
    hidden_tools = {"schema_validator_tool", "resource_validator_tool", "policy_validation_tool", "layout_validator_tool"}
    
    if available_tools:
        if isinstance(available_tools[0], dict):
            # Available tools are list of dicts with 'name' key - filter out hidden tools
            available_tools_list = [
                tool.get("name") for tool in available_tools 
                if tool.get("name") and tool.get("name") not in hidden_tools and "validator" not in tool.get("name", "").lower()
            ]
        else:
            # Available tools are already a list of strings - filter out hidden tools
            available_tools_list = [t for t in available_tools if t not in hidden_tools and "validator" not in t.lower()]
    else:
        # Fallback to hardcoded list if no tools provided
        available_tools_list = [
            "layout_components_tool", "resource_tool", "datamodel_tool",
            "layout_properties_tool", "planning_tool", "scan_repository"
        ]

    goal_summary = ""
    key_requirements = []
    risks = []
    notes_for_team = ""

    if isinstance(general_plan, dict):
        goal_summary = str(general_plan.get("goal_summary", "")).strip()
        key_requirements = general_plan.get("key_requirements", []) or []
        risks = general_plan.get("risks", []) or []
        notes_for_team = str(general_plan.get("notes_for_team", "")).strip()

    condensed_plan = {
        "goal_summary": goal_summary or user_goal[:280],
        "key_requirements": key_requirements[:6],
        "risks": risks[:4],
        "notes_for_team": notes_for_team[:280] if notes_for_team else "",
    }

    repo_lines = dedent(
        f"""
        - Layout files: {repo_summary['layouts']} (samples: {', '.join(repo_summary['sample_layout_files']) or 'none'})
        - Data models: {repo_summary['models']} (samples: {', '.join(repo_summary['sample_model_files']) or 'none'})
        - Resource bundles: {repo_summary['resources']}
        """
    ).strip()

    tool_catalog = "- None provided"
    # Reuse hidden_tools defined above for filtering tool catalog
    if available_tools and isinstance(available_tools[0], dict):
        tool_catalog_lines: List[str] = []
        for tool in available_tools:
            name = tool.get("name")
            if not name:
                continue
            # Skip validation/internal tools - they should not be in the tool plan
            if name in hidden_tools or "validator" in name.lower():
                continue
            description = tool.get("description", "") or "No description provided."
            tool_catalog_lines.append(f"- {name}: {description}")
        if tool_catalog_lines:
            tool_catalog = "\n".join(tool_catalog_lines)

    attachments_hint = "Yes" if attachments else "No"

    user_prompt = render_template(
        "tool_planning_user",
        goal_summary=condensed_plan['goal_summary'],
        key_requirements=json.dumps(condensed_plan['key_requirements']),
        risks=json.dumps(condensed_plan['risks']),
        notes_for_team=condensed_plan['notes_for_team'] or "None",
        user_goal_trimmed=user_goal[:600],
        available_tools=", ".join(available_tools_list),
        tool_catalog=tool_catalog,
        repo_lines=repo_lines,
        planner_step=planner_step or "None",
        attachments_hint=attachments_hint
    )

    langfuse = get_client()
    with langfuse.start_as_current_observation(
        name="tool_strategy_llm",
        as_type="generation",
        model=client.model,
        input={
            "general_plan_keys": list(general_plan.keys()),
            "planner_step_present": bool(planner_step),
        },
        metadata={**client.get_model_metadata(), "user_goal_length": len(user_goal)}
    ) as span:
        response = client.call_sync(system_prompt, user_prompt, attachments=attachments)
        span.update(output={"response": response[:5000]})

    tool_plan_data = parse_json_response(response, "tool plan")

    def _ensure_layout_component_queries(plan: Dict[str, Any]) -> None:
        existing_queries = [
            entry.get("query", "")
            for entry in plan.get("tool_sequence", [])
            if entry.get("tool") == "layout_components_tool"
        ]
        if existing_queries:
            return

        subsections = []
        text_parts = [general_plan or {}, planner_step or "", user_goal]
        for part in text_parts:
            if isinstance(part, dict):
                source = json.dumps(part)
            else:
                source = str(part)
            subsections.extend(re.findall(r"\b\d+(?:\.\d+)?\s*\.\s*[^\n:,;]+", source))

        cleaned = []
        for section in subsections:
            prefix, _, title = section.partition(".")
            label = title.strip()
            if not label:
                continue
            cleaned.append(label)

        important_phrases = sorted({label for label in cleaned}, key=len)[:5]
        if not important_phrases:
            return

        plan.setdefault("tool_sequence", [])
    # Filter and validate tool sequence
    filtered_tool_sequence = []
    available_tool_names = [tool["name"] for tool in available_tools] if available_tools and isinstance(available_tools[0], dict) else available_tools_list

    for tool_entry in tool_plan_data.get("tool_sequence", []):
        tool_name = tool_entry.get("tool")
        if tool_name in available_tool_names:
            filtered_tool_sequence.append(tool_entry)
        else:
            log.warning(f"Skipping unavailable tool: {tool_name}")

    # Ensure we have at least one context-gathering tool (not validators)
    context_tools = [t for t in filtered_tool_sequence if not t["tool"].endswith("_validator_tool")]
    if not context_tools:
        log.warning("No context-gathering tools selected, adding scan_repository")
        filtered_tool_sequence.append({
            "tool": "scan_repository",
            "objective": "Gather repository structure and file information",
            "arguments": {}
        })

    deduped_sequence: List[Dict[str, Any]] = []
    seen_keys: Set[str] = set()

    for entry in filtered_tool_sequence:
        tool_name = entry.get("tool", "")
        query = entry.get("query") or json.dumps(entry.get("arguments", {}), sort_keys=True)
        key = f"{tool_name}::{query}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped_sequence.append(entry)

    return deduped_sequence


async def execute_tool_plan(
    mcp_client,
    repository_path: str,
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_plan: List[Dict[str, Any]],
    planner_step: Optional[str] = None,
    general_plan: Optional[Dict[str, Any]] = None,
    gitea_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    langfuse = get_client()
    with langfuse.start_as_current_span(
        name="tool_execution_phase",
        input={
            "tool_names": [entry.get("tool") for entry in tool_plan],
            "planner_step_present": bool(planner_step),
        },
        metadata={"span_type": "TOOL", "tools_requested": len(tool_plan)}
    ) as span:

        pending_entries = list(tool_plan)
        datamodel_queries_enqueued: Set[str] = set()
        properties_enqueued_ids: Set[str] = set()

        for entry in pending_entries:
            if entry.get("tool") == "datamodel_tool":
                # datamodel_tool takes NO parameters - it returns static documentation
                # Mark it as enqueued to avoid duplicate calls
                datamodel_queries_enqueued.add("__static_doc__")
            elif entry.get("tool") == "layout_properties_tool":
                comp_id = entry.get("arguments", {}).get("component_id") or entry.get("query", "")
                if comp_id:
                    properties_enqueued_ids.add(str(comp_id).strip().lower())

        while pending_entries:
            entry = pending_entries.pop(0)
            tool_name = entry.get("tool")
            if not tool_name:
                continue

            # DEBUG: Log every tool being processed
            log.info(f"🔧 Processing tool: '{tool_name}' (type: {type(tool_name).__name__})")

            arguments = entry.get("arguments")
            
            # Skip validation tools - they require specific file content, not queries
            validation_tools = {"schema_validator_tool", "resource_validator_tool", "policy_validation_tool"}
            if tool_name in validation_tools:
                log.info("Skipping %s (validation tools are called by verifier, not tool planner)", tool_name)
                continue
            
            # Extra safety check for any tool containing "validator"
            if "validator" in tool_name.lower():
                log.warning(f"⚠️ Skipping unexpected validator tool: {tool_name}")
                continue
            
            if arguments is None:
                query = entry.get("query")
                if query and tool_name not in {"layout_properties_tool", "layout_components_tool", "datamodel_tool", "prefill_tool", "dynamic_expression", "resource_tool"}:
                    arguments = {"query": query}
            # Documentation tools take no parameters
            if tool_name in {"datamodel_tool", "prefill_tool", "dynamic_expression", "resource_tool"}:
                arguments = {}
            elif arguments is None:
                arguments = build_tool_arguments(
                    tool_name,
                    user_goal,
                    repo_facts,
                    planner_step,
                    repository_path,
                    general_plan,
                    results,
                    tool_plan,
                )
            if arguments is None:
                log.info("Skipping tool %s (arguments indicate skip)", tool_name)
                continue

            entry["arguments"] = arguments

            objective = entry.get("objective", "")
            with langfuse.start_as_current_span(
                name=f"tool::{tool_name}",
                input={"arguments": arguments},
                metadata={"span_type": "TOOL", "tool": tool_name, "objective": objective}
            ) as tool_span:
                result = await mcp_client.call_tool(tool_name, arguments, gitea_token=gitea_token)
                if isinstance(result, dict) and "error" in result:
                    error_message = result["error"]
                    tool_span.update(output={"success": False, "error": error_message})
                    raise Exception(f"MCP tool '{tool_name}' failed: {error_message}")

                result_text = extract_tool_text(result)
                result_summary = result_text[:500] + "..." if len(result_text) > 500 else result_text

                json_payload = None
                if result_text:
                    try:
                        json_payload = json.loads(result_text)
                    except json.JSONDecodeError:
                        json_payload = None

                tool_span.update(output={
                    "success": True,
                    "result": json_payload if json_payload else result_text[:5000],
                    "result_summary": result_summary,
                })

                results.append(
                    {
                        "tool": tool_name,
                        "objective": objective,
                        "arguments": arguments,
                        "result": result_text,
                    }
                )

                # Auto-enqueue layout_properties_tool after layout_components_tool
                if tool_name == "layout_components_tool":
                    log.info(f"🔍 layout_components_tool returned, checking for components to enqueue properties...")
                    component_ids = []
                    components_data = []
                    
                    # Try to extract components from JSON payload
                    if json_payload and isinstance(json_payload, dict):
                        for key in ("components", "items", "results"):
                            if key in json_payload and isinstance(json_payload[key], list):
                                for component in json_payload[key]:
                                    if not isinstance(component, dict):
                                        continue

                                    content = component.get("content")
                                    if isinstance(content, dict) and content:
                                        component_data = dict(content)
                                        component_data.setdefault("id", component.get("id") or component.get("componentId") or component.get("name"))
                                        component_data.setdefault("type", component.get("type") or content.get("componentType"))
                                    else:
                                        component_data = dict(component)

                                    component_id = component_data.get("id") or component_data.get("componentId") or component.get("name")
                                    if not component_id and "name" in component:
                                        component_id = component["name"]
                                    if not component_id:
                                        continue

                                    component_data["id"] = component_id
                                    component_data.setdefault("type", component_data.get("componentType"))

                                    component_ids.append(component_id)
                                    components_data.append(component_data)
                    
                    # If no JSON structure found, try to extract component types from the result text
                    # The MCP tool might return markdown/text with component examples
                    if not component_ids and result_text:
                        log.info(f"🔍 No JSON components found, extracting component types from text...")
                        # Common component types to look for
                        component_types_to_check = ["Datepicker", "Input", "RadioButtons", "Checkboxes", "Dropdown", "Header", "Paragraph", "TextArea"]
                        for comp_type in component_types_to_check:
                            # Check if this component type is relevant to the user goal
                            if comp_type.lower() in user_goal.lower() or comp_type in result_text:
                                normalized_type = comp_type.lower()
                                if normalized_type not in properties_enqueued_ids:
                                    properties_enqueued_ids.add(normalized_type)
                                    schema_url = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
                                    log.info(f"📋 Auto-enqueuing layout_properties_tool for component type: {comp_type}")
                                    pending_entries.insert(
                                        0,
                                        {
                                            "tool": "layout_properties_tool",
                                            "objective": f"Retrieve schema and allowed props for {comp_type} component",
                                            "arguments": {
                                                "component_type": comp_type,
                                                "schema_url": schema_url,
                                                "user_goal": user_goal,
                                            },
                                        },
                                    )

                    # Process components found from JSON
                    unique_ids = sorted({cid for cid in component_ids if cid})[:10]
                    for component_id in unique_ids:
                        normalized_id = str(component_id).strip().lower()
                        if not normalized_id or normalized_id in properties_enqueued_ids:
                            continue
                        properties_enqueued_ids.add(normalized_id)
                        component_data = next(
                            (
                                comp
                                for comp in components_data
                                if (comp.get("id") or comp.get("componentId")) == component_id
                            ),
                            {},
                        )
                        component_type = (
                            component_data.get("type")
                            or component_data.get("componentType")
                            or component_data.get("_componentType")
                            or "Input"
                        )
                        schema_url = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"
                        log.info(f"📋 Auto-enqueuing layout_properties_tool for component: {component_id} (type: {component_type})")
                        pending_entries.insert(
                            0,
                            {
                                "tool": "layout_properties_tool",
                                "objective": f"Retrieve schema and allowed props for component {component_id}",
                                "arguments": {
                                    "component_id": component_id,
                                    "component_type": component_type,
                                    "schema_url": schema_url,
                                    "user_goal": user_goal,
                                },
                            },
                        )

    return results


async def synthesize_patch(
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_results: List[Dict[str, Any]],
    implementation_plan: Dict[str, Any],
    general_plan: Dict[str, Any],
    planner_step: Optional[str] = None,
    repository_path: Optional[str] = None,
    *,
    attachments: Optional[List[AgentAttachment]] = None,
) -> Dict[str, Any]:
    client = LLMClient(role="actor")
    system_prompt = get_prompt_content("patch_synthesis")

    # Documentation tools need full content preserved
    documentation_tools = {"datamodel_tool", "prefill_tool", "planning_tool", "dynamic_expression", "resource_tool"}
    # Schema tools are critical for implementation - preserve their results
    schema_tools = {"layout_properties_tool", "layout_components_tool"}
    
    serializable_tools = []
    max_result_size = 15000  # Increased limit for schema tools
    
    for result in tool_results:
        tool_name = result.get("tool", "")
        if tool_name in documentation_tools:
            # Preserve full content for documentation tools - they contain critical implementation guidance
            serializable_tools.append(result)
        elif tool_name in schema_tools:
            # Schema tools are critical - truncate but don't remove
            result_copy = dict(result)
            if "result" in result_copy and len(str(result_copy["result"])) > max_result_size:
                result_copy["result"] = str(result_copy["result"])[:max_result_size] + "\n... [truncated]"
            serializable_tools.append(result_copy)
        else:
            # For other tools, truncate large results
            result_copy = dict(result)
            if "result" in result_copy and len(str(result_copy["result"])) > 10000:
                result_copy["result"] = str(result_copy["result"])[:10000] + "\n... [truncated]"
            serializable_tools.append(result_copy)
    repo_summary = {
        "layouts": repo_facts.get("layouts", []),
        "resources": repo_facts.get("resources", []),
        "models": repo_facts.get("models", []),
        "schemas": repo_facts.get("schemas", []),
    }
    
    # Get current layout content to help with component placement
    current_layout_content = ""
    if repository_path and repo_facts.get("layouts"):
        # Use the first available layout file (no hardcoded naming assumption)
        layout_file = repo_facts["layouts"][0]
        layout_path = Path(repository_path) / layout_file
        if layout_path.exists():
            try:
                with open(layout_path, 'r') as f:
                    current_layout_content = f.read()
            except Exception as e:
                log.warning(f"Could not read layout file {layout_file}: {e}")

    # Get current model file contents to help with datamodel updates
    current_model_content = ""
    if repository_path:
        for model_file in repo_facts.get("models", []):
            if model_file.endswith(".schema.json"):  # JSON schema file (any file ending with .schema.json)
                model_path = Path(repository_path) / model_file
                if model_path.exists():
                    try:
                        with open(model_path, 'r') as f:
                            current_model_content = f.read()
                        break
                    except Exception as e:
                        log.warning(f"Could not read model file {model_file}: {e}")

    user_prompt = render_template(
        "patch_synthesis_user",
        user_goal=user_goal,
        general_plan=json.dumps(general_plan, indent=2),
        tool_results=json.dumps(serializable_tools, indent=2) if serializable_tools else "[]",
        current_layout_content=current_layout_content[:3000] if current_layout_content else "Not available",
        current_model_content=current_model_content[:3000] if current_model_content else "Not available",
        repo_summary=json.dumps(repo_summary, indent=2)
    )

    langfuse = get_client()
    with langfuse.start_as_current_observation(
        name="patch_synthesis",
        as_type="generation",
        model=client.model,
        input={
            "general_plan_keys": list(general_plan.keys()) if general_plan else [],
            "planner_step_present": bool(planner_step),
        },
        metadata={**client.get_model_metadata(), "tool_results_count": len(tool_results)}
    ) as span:
        response = client.call_sync(system_prompt, user_prompt)
        span.update(output={"response": response[:5000]})

    patch_data = parse_json_response(response, "patch synthesis")

    # Validate patch operations if repository_path provided
    if repository_path:
        validation_errors = validate_patch_operations(patch_data, repo_facts, repository_path)
        if validation_errors:
            log.warning(f"Patch validation found {len(validation_errors)} issues:")
            for error in validation_errors:
                log.warning(f"  - {error}")
            # Continue anyway but log the issues

    return patch_data


def validate_patch_operations(patch: Dict[str, Any], repo_facts: Dict[str, Any], repository_path: str) -> List[str]:
    """Validate patch operations against known repository structure."""
    errors = []
    changes = patch.get("changes", [])

    layout_files = repo_facts.get("layouts", [])
    resource_files = repo_facts.get("resources", [])
    model_files = repo_facts.get("models", [])

    for change in changes:
        file_path = change.get("file", "")
        operation = change.get("op", "")

        # Check file exists in repo
        full_path = Path(repository_path) / file_path
        if not full_path.exists():
            errors.append(f"File does not exist: {file_path}")
            continue

        # Validate operation-specific requirements
        if operation == "insert_json_array_item":
            path = change.get("path", [])
            # Empty path [] is valid for root-level arrays (e.g., text resource files)
            if path is None or not isinstance(path, list):
                errors.append(f"Invalid path for {operation} in {file_path}: {path}")

        elif operation == "insert_json_property":
            path = change.get("path", [])
            key = change.get("key")
            if not path or not isinstance(path, list):
                errors.append(f"Invalid path for {operation} in {file_path}: {path}")
            if not key:
                errors.append(f"Missing key for {operation} in {file_path}")

        elif operation == "insert_text_at_pattern":
            pattern = change.get("pattern")
            text = change.get("text")
            if not pattern:
                errors.append(f"Missing pattern for {operation} in {file_path}")
            if not text:
                errors.append(f"Missing text for {operation} in {file_path}")

        elif operation == "replace_text":
            old_text = change.get("old_text")
            new_text = change.get("new_text")
            if not old_text:
                errors.append(f"Missing old_text for {operation} in {file_path}")
            if new_text is None:
                errors.append(f"Missing new_text for {operation} in {file_path}")

    return errors


def parse_json_response(response: str, context: str) -> Dict[str, Any]:
    clean = response.strip()
    
    # Check if response is a JSON wrapper with content field (from MCP tools)
    try:
        wrapper = json.loads(clean)
        if isinstance(wrapper, dict) and "content" in wrapper:
            # Extract content and parse it as the actual response
            content = wrapper["content"]
            if isinstance(content, str):
                clean = content
            else:
                # Content is already parsed
                return wrapper
    except json.JSONDecodeError:
        # Not a JSON wrapper, continue with normal parsing
        pass
    
    if "```json" in clean:
        start = clean.find("```json") + 7
        end = clean.find("```", start)
        if end != -1:
            clean = clean[start:end].strip()
    elif not clean.startswith("{") and not clean.startswith("["):
        start = clean.find("{")
        end = clean.rfind("}")
        if start != -1 and end != -1 and start < end:
            clean = clean[start:end + 1]
        else:
            # No JSON found in response - LLM returned text instead of JSON
            log.error("No JSON found in %s response. LLM returned text instead of JSON.", context)
            log.error("Response snippet: %s", response[:500])
            raise Exception(f"{context} failed: LLM returned text instead of JSON. Response started with: {response[:100]!r}")

    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError as exc:
        log.error("Failed to parse %s: %s", context, exc)
        log.error("Response snippet: %s", clean[:500])

        # Fallback: try to salvage by trimming to the last closing brace/bracket.
        # General planning sometimes returns almost-correct JSON with trailing garbage.
        for closing in ('}', ']'):
            idx = clean.rfind(closing)
            if idx == -1:
                continue
            candidate = clean[: idx + 1]
            try:
                salvaged = json.loads(candidate)
                log.warning(
                    "Salvaged %s JSON by trimming to last '%s' at position %d",
                    context,
                    closing,
                    idx,
                )
                if isinstance(salvaged, dict):
                    return salvaged
                if isinstance(salvaged, list):
                    return {"items": salvaged}
            except json.JSONDecodeError:
                continue

        # If salvage also failed, surface the original error
        raise Exception(f"{context} parsing failed: {exc}")

    if isinstance(parsed, dict):
        return parsed
    if isinstance(parsed, list):
        return {"items": parsed}
    raise Exception(f"{context} must be JSON object or list, got {type(parsed)}")


def build_tool_arguments(
    tool_name: str,
    user_goal: str,
    repo_facts: Dict[str, Any],
    planner_step: Optional[str],
    repository_path: str,
    general_plan: Optional[Dict[str, Any]] = None,
    tool_results: Optional[List[Dict[str, Any]]] = None,
    tool_plan: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    """Build dynamic tool arguments based on context."""

    # Extract relevant context from repo_facts and general_plan
    layout_files = repo_facts.get("layouts", [])
    resource_files = repo_facts.get("resources", [])
    model_files = repo_facts.get("models", [])

    if tool_name == "layout_components_tool":
        # layout_components_tool does NOT accept a query parameter.
        # It returns ALL available component examples from the library.
        # Only user_goal is required (verbatim user request).
        return {"user_goal": user_goal}

    if tool_name == "resource_tool":
        # Get the tool query from tool_plan
        tool_query = ""
        if tool_plan:
            for entry in tool_plan:
                if entry.get("tool") == "resource_tool":
                    tool_query = entry.get("query", "")
                    break
        
        # If the planner provided an explicit query, use it.
        # Otherwise, respect that decision and call the tool with only the user_goal,
        # letting the MCP-side implementation interpret the goal.
        if tool_query:
            return {"query": tool_query, "user_goal": user_goal}

        return {"user_goal": user_goal}

    if tool_name in {"datamodel_tool", "prefill_tool", "dynamic_expression"}:
        # Documentation tools now require user_goal parameter
        return {"user_goal": user_goal}

    if tool_name == "layout_properties_tool":
        # layout_properties_tool has a strict MCP schema (component_id, component_type, schema_url)
        # and does NOT accept a free-form `query` argument. We normally enqueue it with
        # fully-specified arguments right after layout_components_tool has discovered
        # concrete component IDs:
        #
        #     {
        #         "tool": "layout_properties_tool",
        #         "arguments": {
        #             "component_id": ...,
        #             "component_type": ...,
        #             "schema_url": ...,
        #         },
        #     }
        #
        # If we get here, there were no explicit arguments on the plan entry, and trying
        # to synthesize them from a textual `query` would produce invalid MCP calls
        # (and Pydantic errors about unexpected keyword argument `query`).
        #
        # To keep runs robust, we skip such calls and rely solely on the auto-enqueued
        # layout_properties_tool invocations that already have proper arguments.
        return None

    if tool_name == "planning_tool":
        return {"user_goal": user_goal}

    if tool_name == "scan_repository":
        return {"repository_path": repository_path, "user_goal": user_goal}

    if tool_name in {"schema_validator_tool", "resource_validator_tool", "policy_validation_tool"}:
        return None

    # Default: use goal-based query
    return {"query": user_goal[:120], "user_goal": user_goal}
