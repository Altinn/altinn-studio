"""Actor workflow pipeline orchestrating planning, tool execution, and patch synthesis."""

from __future__ import annotations

import json
import mlflow
from pathlib import Path
from textwrap import dedent
from typing import Any, Dict, List, Optional

from agents.services.llm import LLMClient
from agents.services.telemetry import format_as_markdown, is_json
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)


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
) -> Dict[str, Any]:
    """Execute the full actor workflow pipeline."""

    # Ensure MCP client is connected and has available tools populated
    if not hasattr(mcp_client, '_available_tools') or not mcp_client._available_tools:
        await mcp_client.connect()

    general_plan = general_plan_override or await create_general_plan(user_goal, planner_step)
    tool_plan = tool_plan_override or await create_tool_plan(
        user_goal, general_plan, repo_facts, mcp_client._available_tools, planner_step
    )
    if tool_results_override is not None:
        tool_results = tool_results_override
    else:
        tool_results = await execute_tool_plan(
            mcp_client, repository_path, user_goal, repo_facts, tool_plan, planner_step, general_plan
        )
    implementation_plan = (
        implementation_plan_override
        or await create_implementation_plan(
            mcp_client, user_goal, repo_facts, tool_results, general_plan, planner_step
        )
    )
    patch = await synthesize_patch(
        user_goal, repo_facts, tool_results, implementation_plan, general_plan, planner_step, repository_path
    )

    return {
        "general_plan": general_plan,
        "tool_plan": tool_plan,
        "tool_results": tool_results,
        "implementation_plan": implementation_plan,
        "patch": patch,
    }


async def create_general_plan(user_goal: str, planner_step: Optional[str] = None) -> Dict[str, Any]:
    client = LLMClient(role="planner")
    system_prompt = (
        "You are the lead strategist for an Altinn multi-agent build system. "
        "Summarize the requested change, highlight key requirements, identify risks, "
        "and outline major subtasks. Respond with JSON only."
    )
    user_prompt = dedent(
        f"""
        USER GOAL:
        {user_goal}

        CURRENT PLAN STEP (if any):
        {planner_step or "No plan generated yet"}

        Return JSON with:
        {{
          "goal_summary": "one paragraph",
          "key_requirements": ["..."],
          "risks": ["..."],
          "suggested_subtasks": ["..."],
          "notes_for_team": "guidance for other agents"
        }}
        """
    ).strip()

    with mlflow.start_span(name="general_planning_llm", span_type="LLM") as span:
        metadata = client.get_model_metadata()
        span.set_attributes({**metadata, "user_goal_length": len(user_goal)})
        span.set_inputs({"user_goal": user_goal, "planner_step_present": bool(planner_step)})

        response = client.call_sync(system_prompt, user_prompt)
        span.set_outputs(
            {
                "raw_response": response[:5000],
                "formats": {"text": response, "markdown": "```\n" + response + "\n```"},
            }
        )

    return parse_json_response(response, "general plan")


async def create_tool_plan(
    user_goal: str,
    general_plan: Dict[str, Any],
    repo_facts: Dict[str, Any],
    available_tools: List[str] = None,
    planner_step: Optional[str] = None,
) -> List[Dict[str, Any]]:
    client = LLMClient(role="planner")
    system_prompt = (
        "You manage tool orchestration for Altinn automation. Based on the goal, "
        "general plan, and repository facts, propose an ordered list of tools to gather the necessary "
        "context before implementation. Only suggest tools that are actually available and relevant."
    )

    # Create repo summary for context
    repo_summary = {
        "layouts": len(repo_facts.get("layouts", [])),
        "models": len(repo_facts.get("models", [])),
        "resources": len(repo_facts.get("resources", [])),
        "sample_layout_files": repo_facts.get("layouts", [])[:3] if repo_facts.get("layouts") else [],
        "sample_model_files": repo_facts.get("models", [])[:2] if repo_facts.get("models") else [],
    }

    # Extract tool names from available_tools (which may be dicts with name/description)
    if available_tools:
        if isinstance(available_tools[0], dict):
            # Available tools are in dict format: [{"name": "...", "description": "..."}]
            available_tools_list = [tool["name"] for tool in available_tools if "name" in tool]
        else:
            # Available tools are already a list of strings
            available_tools_list = available_tools
    else:
        # Fallback to hardcoded list if no tools provided
        available_tools_list = [
            "layout_components_tool", "resource_tool", "datamodel_tool",
            "layout_properties_tool", "planning_tool", "scan_repository"
        ]

    user_prompt = dedent(
        f"""
        USER GOAL:
        {user_goal}

        GENERAL PLAN:
        {json.dumps(general_plan, indent=2)}

        REPOSITORY FACTS:
        {json.dumps(repo_summary, indent=2)}

        AVAILABLE TOOLS:
        {", ".join(available_tools_list)}

        CURRENT PLAN STEP (if any):
        {planner_step or "None"}

        CRITICAL INSTRUCTIONS:
        - Select ONLY planning tools needed for gathering information BEFORE implementation
        - DO NOT select validator tools (*_validator_tool) - they are for verification phase only
        - DO NOT select tools that modify generated files (.cs, .xsd) - only modify source files
        - Focus on tools that gather context: layout_components_tool, resource_tool, datamodel_tool
        - Consider what information is already available in repo_facts vs what needs to be gathered
        - Be selective - prefer fewer, more relevant tools over exhaustive lists
        - For layout_components_tool: Use the goal_summary from GENERAL PLAN as the query - it provides rich context about user intent
        - For other tools: Generate SIMPLE, DIRECT queries like "data model", "text resources"
        - CHECK GENERAL PLAN: If key_requirements mention "datamodel", "data model", "model.cs", "model.xsd", or "model.schema.json" - ALWAYS include datamodel_tool
        - CHECK GENERAL PLAN: If key_requirements mention "datamodelbinding" or "dataModelBindings" - ALWAYS include datamodel_tool

        Return JSON with:
          "tool_sequence": [
            {{
              "tool": "tool_name",
              "objective": "why this tool is needed for information gathering",
              "query": "goal_summary for layout_components_tool, simple terms for others"
            }}
          ]
        }}
        """
    ).strip()

    with mlflow.start_span(name="tool_strategy_llm", span_type="LLM") as span:
        metadata = client.get_model_metadata()
        span.set_attributes({**metadata, "user_goal_length": len(user_goal)})
        span.set_inputs(
            {
                "general_plan_keys": list(general_plan.keys()),
                "planner_step_present": bool(planner_step),
            }
        )

        response = client.call_sync(system_prompt, user_prompt)
        span.set_outputs(
            {
                "raw_response": response[:5000],
                "formats": {"text": response, "markdown": "```\n" + response + "\n```"},
            }
        )

    tool_plan_data = parse_json_response(response, "tool plan")

    # Check if datamodel_tool should be included based on general_plan requirements
    key_requirements = ""
    if general_plan:
        key_requirements = " ".join(general_plan.get("key_requirements", []))
    
    datamodel_keywords = ["datamodel", "data model", "model.cs", "model.xsd", "model.schema.json", "datamodelbinding", "dataModelBindings"] # TODO: Check if this really is needed
    needs_datamodel = any(keyword in key_requirements.lower() for keyword in datamodel_keywords)
    
    if needs_datamodel and not any(entry.get("tool") == "datamodel_tool" for entry in tool_plan_data.get("tool_sequence", [])):
        log.info("Adding datamodel_tool based on plan requirements")
        tool_plan_data["tool_sequence"].append({
            "tool": "datamodel_tool",
            "objective": "Gather datamodel structure and binding information for required attributes",
            "query": "data model structure"
        })

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

    return filtered_tool_sequence


async def execute_tool_plan(
    mcp_client,
    repository_path: str,
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_plan: List[Dict[str, Any]],
    planner_step: Optional[str] = None,
    general_plan: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    with mlflow.start_span(name="tool_execution_phase", span_type="TOOL") as span:
        span.set_attributes({"tools_requested": len(tool_plan)})
        span.set_inputs(
            {
                "tool_names": [entry.get("tool") for entry in tool_plan],
                "planner_step_present": bool(planner_step),
            }
        )

        for entry in tool_plan:
            tool_name = entry.get("tool")
            if not tool_name:
                continue

            arguments = entry.get("arguments") or build_tool_arguments(
                tool_name, user_goal, repo_facts, planner_step, repository_path, general_plan, results, tool_plan
            )
            if arguments is None:
                log.info("Skipping tool %s (arguments indicate skip)", tool_name)
                continue

            objective = entry.get("objective", "")
            with mlflow.start_span(name=f"tool::{tool_name}", span_type="TOOL") as tool_span:
                tool_span.set_attributes({"tool": tool_name, "objective": objective})
                tool_span.set_inputs({"arguments": arguments})

                result = await mcp_client.call_tool(tool_name, arguments)
                if isinstance(result, dict) and "error" in result:
                    error_message = result["error"]
                    tool_span.set_status("ERROR")
                    tool_span.set_outputs({"success": False, "error": error_message})
                    raise Exception(f"MCP tool '{tool_name}' failed: {error_message}")

                result_text = extract_tool_text(result)
                json_payload = None
                if is_json(result_text):
                    try:
                        json_payload = json.loads(result_text)
                    except json.JSONDecodeError:
                        json_payload = None

                tool_span.set_outputs(
                    {
                        "success": True,
                        "raw_result": result_text[:5000],
                        "formats": {
                            "text": result_text,
                            "markdown": format_as_markdown(result_text),
                            "json": json_payload,
                        },
                    }
                )

                results.append(
                    {
                        "tool": tool_name,
                        "objective": objective,
                        "arguments": arguments,
                        "result": result_text,
                    }
                )

    return results


async def create_implementation_plan(
    mcp_client,
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_results: List[Dict[str, Any]],
    general_plan: Dict[str, Any],
    planner_step: Optional[str] = None,
) -> Dict[str, Any]:
    payload = {
        "user_goal": user_goal,
        "general_plan": general_plan,
        "tool_results": tool_results,
        "repository_facts": repo_facts,
        "planner_step": planner_step,
    }

    with mlflow.start_span(name="implementation_planning_tool", span_type="TOOL") as span:
        span.set_inputs(
            {
                "payload_keys": list(payload.keys()),
                "files_known": len(repo_facts.get("files", [])) if isinstance(repo_facts, dict) else 0,
            }
        )

        planning_result = await mcp_client.call_tool("planning_tool", payload)
        if isinstance(planning_result, dict) and "error" in planning_result:
            error_message = planning_result["error"]
            span.set_status("ERROR")
            span.set_outputs({"success": False, "error": error_message})
            raise Exception(f"planning_tool failed: {error_message}")

        planning_text = extract_tool_text(planning_result)
        
        # Check if planning_text is markdown documentation instead of JSON
        if planning_text.strip().startswith("#") or not planning_text.strip().startswith("{"):
            planning_text = await generate_implementation_plan_from_docs(
                planning_text, user_goal, repo_facts, tool_results, general_plan
            )
        
        span.set_outputs(
            {
                "raw_result": planning_text[:5000],
                "formats": {"text": planning_text, "markdown": "```\n" + planning_text + "\n```"},
            }
        )

    return parse_json_response(planning_text, "implementation plan")


async def generate_implementation_plan_from_docs(
    documentation: str,
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_results: List[Dict[str, Any]],
    general_plan: Dict[str, Any],
) -> str:
    """Generate a structured implementation plan from MCP documentation using LLM."""
    
    client = LLMClient(role="actor")
    
    # Get summary of available tools
    tool_summary = "\n".join([
        f"- {result.get('tool', 'unknown')}: {result.get('result', '')[:100]}..."
        for result in tool_results[:5]  # Limit to first 5 tools
    ]) if tool_results else "No tools used yet"
    
    prompt = f"""
Based on the following Altinn documentation and context, create a detailed JSON implementation plan for: {user_goal}

DOCUMENTATION:
{documentation[:3000]}

GENERAL PLAN:
{json.dumps(general_plan, indent=2)}

TOOL RESULTS SUMMARY:
{tool_summary}

REPOSITORY FACTS:
- Layouts: {len(repo_facts.get('layouts', []))} files
- Models: {len(repo_facts.get('models', []))} files  
- Resources: {len(repo_facts.get('resources', []))} files

Create a JSON implementation plan with these fields:
{{
  "goal_analysis": "Brief analysis of what needs to be implemented",
  "components_needed": ["List of Altinn components to add/modify"],
  "data_model_changes": ["List of data model field additions"],
  "layout_changes": ["List of layout modifications needed"],
  "resource_changes": ["List of text resource additions"],
  "implementation_steps": [
    {{
      "step": "Brief description",
      "component": "What component this affects",
      "action": "What to do",
      "details": "Specific implementation details"
    }}
  ],
  "validation_requirements": ["List of things to validate"],
  "risks": ["Potential issues or edge cases"]
}}

Focus on the specific user goal and be concrete about file paths, component IDs, and data bindings. Use the documentation to understand Altinn best practices.
"""

    try:
        response = await client.call_async(
            system_prompt="You are an expert Altinn developer creating implementation plans. Be specific, practical, and follow Altinn conventions.",
            user_prompt=prompt
        )
        return response.strip()
    except Exception as e:
        log.error(f"Failed to generate implementation plan from docs: {e}")
        # Don't provide a generic fallback - if planning fails, let the user know
        raise Exception(f"Failed to generate implementation plan from MCP documentation: {e}. The planning tool returned unusable documentation.")


async def create_implementation_plan(
    mcp_client,
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_results: List[Dict[str, Any]],
    general_plan: Dict[str, Any],
    planner_step: Optional[str] = None,
) -> Dict[str, Any]:
    payload = {
        "user_goal": user_goal,
        "general_plan": general_plan,
        "tool_results": tool_results,
        "repository_facts": repo_facts,
        "planner_step": planner_step,
    }

    with mlflow.start_span(name="implementation_planning_tool", span_type="TOOL") as span:
        span.set_inputs(
            {
                "payload_keys": list(payload.keys()),
                "files_known": len(repo_facts.get("files", [])) if isinstance(repo_facts, dict) else 0,
            }
        )

        planning_result = await mcp_client.call_tool("planning_tool", payload)
        if isinstance(planning_result, dict) and "error" in planning_result:
            error_message = planning_result["error"]
            span.set_status("ERROR")
            span.set_outputs({"success": False, "error": error_message})
            raise Exception(f"planning_tool failed: {error_message}")

        planning_text = extract_tool_text(planning_result)
        log.info(f"Planning tool result type: {type(planning_result)}")
        log.info(f"Planning text length: {len(planning_text)}")
        log.info(f"Planning text preview: {planning_text[:200]}")
        
        # Check if planning_text is markdown documentation instead of JSON
        if planning_text.strip().startswith("#") or not planning_text.strip().startswith("{"):
            log.info("Planning tool returned documentation, generating implementation plan from documentation")
            planning_text = await generate_implementation_plan_from_docs(
                planning_text, user_goal, repo_facts, tool_results, general_plan
            )
        
        span.set_outputs(
            {
                "raw_result": planning_text[:5000],
                "formats": {"text": planning_text, "markdown": "```\n" + planning_text + "\n```"},
            }
        )

    return parse_json_response(planning_text, "implementation plan")


async def synthesize_patch(
    user_goal: str,
    repo_facts: Dict[str, Any],
    tool_results: List[Dict[str, Any]],
    implementation_plan: Dict[str, Any],
    general_plan: Dict[str, Any],
    planner_step: Optional[str] = None,
    repository_path: Optional[str] = None,
) -> Dict[str, Any]:
    client = LLMClient(role="actor")
    system_prompt = (
        "You are the implementation agent for Altinn apps. Your ONLY task is to produce a JSON patch using EXACTLY these generic operations: "
        "insert_json_array_item, insert_json_property, insert_text_at_pattern, replace_text. "
        "DO NOT call any MCP tools. DO NOT use tool calls. DO NOT mention any tools. "
        "DO NOT include any explanatory text. Output ONLY valid JSON with 'files' and 'changes' keys."
        "\n\n"
        "CRITICAL CONSTRAINTS FOR ALTINN COMPONENTS:"
        "- ONLY use properties that are explicitly mentioned as valid in the layout_properties_tool results"
        "- NEVER add properties like 'inputMode', 'validation', or any other properties not validated by the schema"
        "- For Input components, only use: id, type, textResourceBindings, dataModelBindings, required, readOnly" # TODO: Too hardcoded imo, should be dynamic
        "- Check the layout_properties_tool results for the exact allowed properties for each component type"
        "- If unsure about a property, DO NOT include it"
    )

    serializable_tools = [
        {k: v for k, v in result.items() if k != "result" or len(str(v)) < 10000}  # Increased limit
        for result in tool_results
    ]
    repo_summary = {
        "layouts": repo_facts.get("layouts", []),
        "resources": repo_facts.get("resources", []),
        "models": repo_facts.get("models", []),
        "schemas": repo_facts.get("schemas", []),
    }

    # Filter implementation_plan to remove irrelevant fields for patch synthesis
    filtered_implementation_plan = {k: v for k, v in implementation_plan.items() 
                                   if k not in ["notes_for_team", "risks", "suggested_subtasks"]}
    
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

    user_prompt = dedent(
        f"""
        USER GOAL:
        {user_goal}

        GENERAL PLAN:
        {json.dumps(general_plan, indent=2)}

        IMPLEMENTATION PLAN:
        {json.dumps(filtered_implementation_plan, indent=2)}

        TOOL RESULTS:
        {json.dumps(serializable_tools, indent=2) if serializable_tools else "[]"}

        CURRENT LAYOUT CONTENT (for component placement reference):
        {current_layout_content[:3000] if current_layout_content else "Not available"}

        CURRENT MODEL SCHEMA (for datamodel updates):
        {current_model_content[:3000] if current_model_content else "Not available"}

        REPOSITORY FACTS SUMMARY:
        {json.dumps(repo_summary, indent=2)}

        CRITICAL: Generate the patch JSON with EXACTLY these keys: "files" (array of strings) and "changes" (array of objects).

        IMPORTANT: Before creating any component properties, check the TOOL RESULTS section for layout_properties_tool results to see what properties are valid for each component type. Only use properties that are explicitly validated by the schema.

        For datamodel updates, use the CURRENT MODEL SCHEMA to understand the existing structure and add new fields to appropriate schema objects. Follow JSON Schema conventions and avoid unnecessary nesting.

        IMPORTANT: For Altinn datamodels, you should ONLY update the .schema.json file. The .cs and .xsd files will be automatically regenerated from the .schema.json using MCP tools. Do NOT manually update .cs or .xsd files in your patch.

        When placing components "after" another field, use the CURRENT LAYOUT CONTENT to identify the correct component ID by finding the component with the matching textResourceBindings.title value.

        Each change object MUST have these exact fields:
        - "file": relative path string (e.g., "App/ui/form/layouts/1.json")
        - "op": operation name (one of: "insert_json_array_item", "insert_json_property", "insert_text_at_pattern", "replace_text")

        OPERATION FORMATS (follow EXACTLY):

        For insert_json_property:
        {{
          "file": "path/to/file.json",
          "op": "insert_json_property",
          "path": ["properties"],  // array of strings
          "key": "fieldName",       // string
          "value": "fieldValue"     // any type
        }}

        For insert_json_array_item:
        {{
          "file": "path/to/file.json",
          "op": "insert_json_array_item",
          "path": ["data", "layout"],  // array of strings pointing to array
          "value": {{"id": "component_id", "type": "Input"}},  // object to insert
          "insert_after_index": 2     // optional number
        }}

        For insert_text_at_pattern:
        {{
          "file": "path/to/file.cs",
          "op": "insert_text_at_pattern",
          "pattern": "regex_pattern",  // string
          "text": "text_to_insert",     // string
          "find_last": false           // optional boolean
        }}

        For replace_text:
        {{
          "file": "path/to/file.json",
          "op": "replace_text",
          "old_text": "text to replace",    // string
          "new_text": "replacement text"    // string
        }}

        RULES:
        - All paths must be valid JSON paths (arrays of strings)
        - All required fields must be present
        - Values can be strings, numbers, booleans, objects, or arrays
        - Files array should list all files being modified
        - Each change must modify exactly one file
        """
    ).strip()

    with mlflow.start_span(name="patch_synthesis", span_type="LLM") as span:
        metadata = client.get_model_metadata()
        span.set_attributes({**metadata, "tool_results_count": len(tool_results)})
        span.set_inputs(
            {
                "implementation_plan_keys": list(implementation_plan.keys()),
                "planner_step_present": bool(planner_step),
            }
        )

        response = client.call_sync(system_prompt, user_prompt)
        span.set_outputs(
            {
                "raw_response": response[:5000],
                "formats": {"text": response, "markdown": "```\n" + response + "\n```"},
            }
        )

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
            if not path or not isinstance(path, list):
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


def extract_tool_text(result: Any) -> str:
    """Extract text content from MCP tool response."""
    # Handle CallToolResult objects (newer MCP versions)
    if hasattr(result, 'structured_content') and result.structured_content:
        # Some CallToolResult objects have pre-parsed structured content
        return str(result.structured_content)
    elif hasattr(result, 'content'):
        content = result.content
        if isinstance(content, str):
            return content
        elif isinstance(content, list) and content:
            first_item = content[0]
            if hasattr(first_item, 'text'):
                text_content = first_item.text
                # Check if this is a JSON wrapper with content field
                try:
                    parsed = json.loads(text_content)
                    if isinstance(parsed, dict) and "content" in parsed:
                        return parsed["content"]
                except json.JSONDecodeError:
                    pass  # Not JSON, use as-is
                return text_content
            return str(first_item)
        return str(content)

    # Handle list responses (legacy format)
    if isinstance(result, list) and result:
        first = result[0]
        if hasattr(first, "text"):
            text_content = first.text
            # Check if this is a JSON wrapper with content field
            try:
                parsed = json.loads(text_content)
                if isinstance(parsed, dict) and "content" in parsed:
                    return parsed["content"]
            except json.JSONDecodeError:
                pass  # Not JSON, use as-is
            return text_content
        return str(first)
    
    return str(result)


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

    try:
        parsed = json.loads(clean)
    except json.JSONDecodeError as exc:
        log.error("Failed to parse %s: %s", context, exc)
        log.error("Response snippet: %s", clean[:500])
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
        # Get the tool query from tool_plan
        tool_query = ""
        if tool_plan:
            for entry in tool_plan:
                if entry.get("tool") == "layout_components_tool":
                    tool_query = entry.get("query", "")
                    break
        
        # If no specific query, try to use goal_summary from general_plan
        if not tool_query and general_plan:
            goal_summary = general_plan.get("goal_summary", "")
            if goal_summary:
                tool_query = goal_summary
        
        # Use the specified query or fallback
        if tool_query:
            query = tool_query
        else:
            query = "available layout components"
        
        return {"query": query}

    if tool_name == "resource_tool":
        # Get the tool query from tool_plan
        tool_query = ""
        if tool_plan:
            for entry in tool_plan:
                if entry.get("tool") == "resource_tool":
                    tool_query = entry.get("query", "")
                    break
        
        # Use the specified query or fallback
        if tool_query:
            query = tool_query
        else:
            query = "text resources for form field labels"
        
        return {"query": query}

    if tool_name == "datamodel_tool":
        # Get the tool query from tool_plan
        tool_query = ""
        if tool_plan:
            for entry in tool_plan:
                if entry.get("tool") == "datamodel_tool":
                    tool_query = entry.get("query", "")
                    break
        
        # Use the specified query or fallback
        if tool_query:
            query = tool_query
        else:
            query = "data model structure for numeric fields"
        
        return {"query": query}

    if tool_name == "layout_properties_tool":
        # Get the tool query from tool_plan
        tool_query = ""
        if tool_plan:
            for entry in tool_plan:
                if entry.get("tool") == "layout_properties_tool":
                    tool_query = entry.get("query", "")
                    break
        
        # Try to determine component type from layout_components_tool results
        component_type = "Input"  # default fallback
        
        if tool_results:
            # Look for layout_components_tool results
            for result in tool_results:
                if result.get("tool") == "layout_components_tool":
                    try:
                        result_data = json.loads(result.get("result", "{}"))
                        components = result_data.get("components", [])
                        
                        # Find most relevant component for the user goal
                        # TODO: Find a better way to determine component type
                        if "input" in user_goal.lower() or "number" in user_goal.lower() or "numeric" in user_goal.lower():
                            # Look for Input components
                            for comp in components:
                                if comp.get("content", {}).get("type") == "Input":
                                    component_type = "Input"
                                    break
                        elif "button" in user_goal.lower():
                            component_type = "Button"
                        elif "text" in user_goal.lower() and "area" in user_goal.lower():
                            component_type = "Textarea"
                        # Add more component type detection logic as needed
                        
                    except (json.JSONDecodeError, KeyError):
                        pass  # Fall back to default
        
        # If we couldn't determine from tool results, use goal-based detection
        if component_type == "Input":  # Still default, try goal detection
            if "button" in user_goal.lower():
                component_type = "Button"
            elif "text" in user_goal.lower() and "area" in user_goal.lower():
                component_type = "Textarea"
            # Keep Input as default

        # Use the correct Altinn layout schema URL
        schema_url = "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json"

        # Use the specified query or generate simple one
        if tool_query:
            query = tool_query
        else:
            query = f"properties for {component_type} component"

        return {
            "component_type": component_type,
            "schema_url": schema_url,
            "query": query
        }

    if tool_name == "planning_tool":
        return {}

    if tool_name == "scan_repository":
        return {"repository_path": repository_path}

    if tool_name in {"schema_validator_tool", "resource_validator_tool", "policy_validation_tool"}:
        return None

    # Default: use goal-based query
    return {"query": user_goal[:120]}
