"""
Patch Generation Module
Handles LLM-based patch generation including planning and synthesis.
"""

import logging
import json
import time
import re
import mlflow
from agents.services.llm_client import LLMClient

log = logging.getLogger(__name__)


class PatchGenerator:
    """Generates patches using LLM planning and synthesis."""
    
    def __init__(self, mcp_client, repository_path: str):
        self.mcp_client = mcp_client
        self.repository_path = repository_path
    
    async def generate_patch(
        self, 
        task_context: str,
        repo_facts: dict,
        planning_guidance: str = None
    ) -> dict:
        """
        Generate a patch using LLM-based planning and synthesis.
        
        Returns:
            Patch data dictionary with 'files' and 'changes' arrays
        """
        
        # Step 1: Task Analysis & Tool Planning
        tool_results = await self._plan_and_execute_tools(task_context, planning_guidance)
        
        # Step 2: Synthesize Patch
        patch_data = await self._synthesize_patch(task_context, repo_facts, tool_results, planning_guidance)
        
        return patch_data
    
    async def _plan_and_execute_tools(self, task_context: str, planning_guidance: str) -> list[dict]:
        """Use LLM to plan and execute tools."""
        
        client = LLMClient(role="actor")
        
        analysis_system_prompt = """You are an Altinn app development assistant. Analyze the task and plan which tools to use.
Return JSON with: task_type, approach, and tools_sequence array."""
        
        analysis_user_prompt = f"""
Task: {task_context}

Planning Guidance: {planning_guidance if planning_guidance else "Use layout_components_tool, resource_tool, datamodel_tool as needed"}

Return JSON:
{{
  "task_type": "layout_change|resource_update|datamodel_change",
  "approach": "brief description",
  "tools_sequence": [
    {{"tool": "layout_components_tool", "reason": "why"}}
  ]
}}
"""
        
        with mlflow.start_span(name="task_analysis", span_type="LLM") as span:
            try:
                model_metadata = client.get_model_metadata()
                span.set_attributes(model_metadata)
                span.set_inputs({"messages": "analysis_messages"})  # Simplified to avoid serialization issues
                
                analysis_response = client.call_sync(analysis_system_prompt, analysis_user_prompt)
                span.set_outputs({"response_length": len(analysis_response)})  # Avoid storing large content
            except Exception as e:
                span.set_attribute("error", str(e))
                log.warning(f"MLflow span error: {e}")
                analysis_response = client.call_sync(analysis_system_prompt, analysis_user_prompt)
            
            # Parse response
            clean_response = analysis_response.strip()
            if "```json" in clean_response:
                start = clean_response.find("```json") + 7
                end = clean_response.find("```", start)
                clean_response = clean_response[start:end].strip()
            elif not clean_response.startswith('{'):
                start = clean_response.find('{')
                end = clean_response.rfind('}')
                if start != -1 and end != -1:
                    clean_response = clean_response[start:end+1]
            
            analysis = json.loads(clean_response)
            task_type = analysis.get('task_type', 'unknown')
            tools_sequence = analysis.get('tools_sequence', [])
            
            log.info(f"Task analysis: {task_type}")
        
        # Execute tools
        tool_results = []
        
        with mlflow.start_span(name="tool_execution_phase") as execution_span:
            for tool_plan in tools_sequence:
                tool_name = tool_plan.get('tool')
                reason = tool_plan.get('reason', '')
                
                log.info(f"Executing tool: {tool_name} for {reason}")
                
                try:
                    with mlflow.start_span(name=f"tool_{tool_name}", span_type="TOOL") as tool_span:
                        try:
                            tool_span.set_inputs({"tool": str(tool_name), "reason": str(reason)})
                        except Exception as e:
                            log.warning(f"MLflow tool span input error: {e}")
                        
                        # Build tool arguments based on the tool name
                        tool_args = self._build_tool_arguments(tool_name, task_context, reason)
                        
                        # Skip tool if arguments indicate it should be skipped
                        if tool_args is None:
                            log.info(f"Skipping tool {tool_name} during patch generation")
                            continue
                        
                        result = await self.mcp_client.call_tool(tool_name, tool_args)
                        
                        # Check if tool call failed
                        if isinstance(result, dict) and 'error' in result:
                            error_msg = f"MCP tool '{tool_name}' failed: {result['error']}"
                            log.error(error_msg)
                            try:
                                tool_span.set_outputs({"error": str(error_msg)})
                            except Exception as e:
                                log.warning(f"MLflow tool span output error: {e}")
                            raise Exception(error_msg)
                        
                        # Extract text from MCP response
                        if isinstance(result, list) and len(result) > 0:
                            if hasattr(result[0], 'text'):
                                result_text = result[0].text
                            else:
                                result_text = str(result[0])
                        else:
                            result_text = str(result)
                        
                        try:
                            tool_span.set_outputs({"result_length": len(result_text)})  # Just log length to avoid serialization issues
                        except Exception as e:
                            log.warning(f"MLflow tool span output error: {e}")
                        
                        tool_results.append({
                            'tool': tool_name,
                            'reason': reason,
                            'result': result_text[:5000]  # Keep reasonable length
                        })
                
                except Exception as e:
                    log.error(f"Tool {tool_name} failed: {e}")
                    # FAIL FAST - Don't continue if tools are broken
                    raise Exception(f"MCP tool execution failed for '{tool_name}': {str(e)}")
        
        return tool_results
    
    def _build_tool_arguments(self, tool_name: str, task_context: str, reason: str) -> dict:
        """Build appropriate arguments for each MCP tool."""
        
        # Extract key terms from task context for query
        query_text = task_context
        
        if tool_name == 'layout_components_tool':
            return {"query": "Input component"}
        elif tool_name == 'resource_tool':
            return {"query": "text resources"}
        elif tool_name == 'datamodel_tool':
            return {"query": "data model"}
        elif tool_name == 'layout_properties_tool':
            # Requires component_type and schema_url
            return {
                "component_type": "Input",
                "schema_url": "https://altinncdn.no/schemas/json/component/Input.schema.v1.json"
            }
        elif tool_name == 'planning_tool':
            return {}  # planning_tool doesn't need arguments
        elif tool_name == 'scan_repository':
            return {"repository_path": self.repository_path}
        elif tool_name == 'layout_validator_tool':
            # Would need actual layout JSON, skip for now
            return {"layout": {}}
        elif tool_name == 'schema_validator_tool':
            # Schema validator should not be used during patch generation
            # It's used for validation AFTER patches are applied
            log.warning(f"Skipping schema_validator_tool during patch generation - validation happens after")
            return None  # Signal to skip this tool
        else:
            # Generic fallback - try with query
            return {"query": query_text[:100]}
    
    async def _synthesize_patch(
        self,
        task_context: str,
        repo_facts: dict,
        tool_results: list[dict],
        planning_guidance: str
    ) -> dict:
        """Synthesize a patch from tool results."""
        
        client = LLMClient(role="actor")
        
        synthesis_system_msg = """You are an Altinn app code generator. Generate precise patches in JSON format."""
        
        # Format tool results
        serializable_tools = [
            {k: v for k, v in tr.items() if k != 'result' or len(str(v)) < 5000}
            for tr in tool_results
        ]
        
        synthesis_prompt = f"""
Create a patch to implement the task using the tool results and planning guidance.

TASK: {task_context}

PLANNING GUIDANCE (FROM MCP SERVER):
{str(planning_guidance)[:1500] if planning_guidance else "Study existing files to understand patterns"}

REPOSITORY CONTEXT:
- Available files: Layouts: {repo_facts.get('layouts', [])}, Resources: {repo_facts.get('resources', [])}, Models: {repo_facts.get('models', [])}

EXISTING LAYOUT STRUCTURE (study this to understand component order):
{json.dumps(repo_facts.get('layout_context'), indent=2) if repo_facts.get('layout_context') else "No layout context available"}

TOOL RESULTS:
{json.dumps(serializable_tools, indent=2) if serializable_tools else "No tools executed"}

REQUIRED FORMAT - Use GENERIC operations (Philosophy A: git_ops has NO domain knowledge):

AVAILABLE OPERATIONS:
1. insert_json_array_item: Add item to JSON array (layouts, resources)
2. insert_json_property: Add property to JSON object (schemas, models)
3. insert_text_at_pattern: Insert text at regex pattern (C#, XSD files)
4. replace_text: Replace text content (any file type)

EXAMPLE PATTERNS for common tasks:

ADD FIELD: Multi-file update (layout + resources + models)
{{
  "files": [relevant files based on task],
  "changes": [
    {{"file": "App/ui/form/layouts/[page].json", "operation": "insert_json_array_item", "path": ["data", "layout"], "insert_after_id": "[existing-component-id]", "item": {{...component definition...}}}},
    {{"file": "App/config/texts/resource.nb.json", "operation": "insert_json_array_item", "path": ["resources"], "item": {{"id": "[resource-key]", "value": "[norwegian text]"}}}},
    {{"file": "App/config/texts/resource.nn.json", "operation": "insert_json_array_item", "path": ["resources"], "item": {{"id": "[resource-key]", "value": "[nynorsk text]"}}}},
    {{"file": "App/models/model.schema.json", "operation": "insert_json_property", "path": ["properties"], "key": "[property-name]", "value": {{"type": "[type]"}}}},
    {{"file": "App/models/model.cs", "operation": "insert_text_at_pattern", "pattern": "public\\s+\\w+\\s+\\w+\\s*{{\\s*get;\\s*set;\\s*}}", "find_last": true, "text": "\\n\\n        public [Type] [PropertyName] {{ get; set; }}"}},
    {{"file": "App/models/model.xsd", "operation": "insert_text_at_pattern", "pattern": "<xs:element\\s+name=\"\\w+\"\\s+type=\"xs:\\w+\"\\s*/>", "find_last": true, "text": "\\n      <xs:element name=\"[PropertyName]\" type=\"xs:[xsd-type]\" />"}}
  ]
}}

UPDATE TEXT: Simple text replacement
{{
  "files": ["App/config/texts/resource.nb.json", "App/config/texts/resource.nn.json"],
  "changes": [
    {{"file": "App/config/texts/resource.nb.json", "operation": "replace_text", "pattern": "\"[resource-key]\"\\s*:\\s*\"[old-text]\"", "text": "\"[resource-key]\": \"[new-text]\""}},
    {{"file": "App/config/texts/resource.nn.json", "operation": "replace_text", "pattern": "\"[resource-key]\"\\s*:\\s*\"[old-text]\"", "text": "\"[resource-key]\": \"[new-text]\""}}
  ]
}}

GENERATE your specific changes based on the task context:

CRITICAL INSTRUCTIONS:
1. **GENERIC OPERATIONS ONLY**: Use insert_json_array_item, insert_json_property, insert_text_at_pattern, replace_text
   - DO NOT use old operations like add_component, add_resource, add_property
   - git_ops has NO Altinn knowledge - you must provide exact paths and values

2. **JSON OPERATIONS**: 
   - Use "path" array to navigate JSON structure (e.g., ["data", "layout"] or ["properties"])
   - For arrays: use insert_json_array_item with insert_after_id or insert_after_index
   - For objects: use insert_json_property with path, key, and value

3. **TEXT OPERATIONS** (for C#/XSD files):
   - Use insert_text_at_pattern with regex pattern
   - Set find_last: true to insert after the last match
   - Provide exact text with proper escaping (\\n for newlines, \\" for quotes)

4. **FORMATTING**:
   - Return VALID JSON only - NO comments, NO trailing commas, NO placeholders
   - Use '-' instead of '.' in component IDs (e.g., '1-3-Test-Input' not '1.3-Test')
   
5. **PLACEMENT**: Study the EXISTING LAYOUT STRUCTURE to determine where to insert.
   - Use "insert_after_id" to find component by ID
   - Match task requirements (e.g., "under 1.2 Navn" means insert_after_id = ID of "Navn" component)
"""
        
        with mlflow.start_span(name="patch_synthesis", span_type="LLM") as synthesis_span:
            try:
                model_metadata = client.get_model_metadata()
                synthesis_span.set_attributes(model_metadata)
                synthesis_span.set_inputs({"messages": "synthesis_messages"})  # Simplified to avoid serialization issues
                
                synthesis_response = client.call_sync(synthesis_system_msg, synthesis_prompt)
                synthesis_span.set_outputs({"response_length": len(synthesis_response)})  # Just log length
            except Exception as e:
                synthesis_span.set_attribute("error", str(e))
                log.warning(f"MLflow synthesis span error: {e}")
                synthesis_response = client.call_sync(synthesis_system_msg, synthesis_prompt)
        
        # Parse and clean response
        patch_data = self._parse_synthesis_response(synthesis_response)
        
        return patch_data
    
    def _parse_synthesis_response(self, response: str) -> dict:
        """Parse and clean LLM synthesis response."""
        
        clean_synthesis = response.strip()
        
        # Extract JSON from markdown code blocks
        if "```json" in clean_synthesis:
            start_idx = clean_synthesis.find("```json") + 7
            end_idx = clean_synthesis.find("```", start_idx)
            if end_idx != -1:
                clean_synthesis = clean_synthesis[start_idx:end_idx].strip()
        elif not clean_synthesis.startswith("{"):
            # Find JSON-like content
            start = clean_synthesis.find('{')
            end = clean_synthesis.rfind('}')
            if start != -1 and end != -1 and start < end:
                clean_synthesis = clean_synthesis[start:end+1]
        
        try:
            patch_data = json.loads(clean_synthesis)
            return patch_data
        except json.JSONDecodeError as e:
            log.error(f"Failed to parse patch synthesis: {e}")
            log.error(f"Response: {clean_synthesis[:500]}")
            raise Exception(f"Patch synthesis parsing failed: {str(e)}")
