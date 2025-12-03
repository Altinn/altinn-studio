"""Tool to fetch layout components from Altinn Studio repositories using LLM-based relevance matching."""

# Standard library imports
import json
from typing import List, Dict, Any, Optional

# Third-party imports
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from mcp.types import (
    ToolAnnotations,
)

# Local imports
from server.tools import register_tool
from scripts.gitea_client import get_directory_files
from server.config import LLM_PROMPTS
from server.config import (
    AZURE_ENDPOINT,
    API_KEY,
    DEPLOYMENT_NAME,
    LLM_CONFIG
)
import os


from server.config import COMPONENT_SELECTION_CONFIG

@register_tool(
    name="layout_components_tool",
description="""
This tool helps you choose and configure **Altinn Studio layout components** at a generic level.

Use this tool when you want to:
- Discover which UI components exist in Altinn Studio (e.g. Header, Input, Date picker, Dropdown, etc.)
- Understand what properties, textResourceBindings, dataModelBindings, and expressions a component supports
- Get example configurations for a component you are planning to use

**Important limitations**

- This tool **does not read, search, or inspect your specific application**.
- It **cannot locate components by id** (for example `'/header-title'`) or return the exact configuration from your app’s layouts.
- Do **not** ask it to “find” or “locate” a component inside your app. Instead, **describe the UI you want to build**, such as:
  - “I need a header for the main page title; what Header variants exist and how do I configure size and text bindings?”
  - “I need a date picker where the user selects a single date; show a recommended configuration.”

Including your functional and UX requirements (validation rules, single vs. multiple selection, etc.) will help the tool suggest the most relevant components and configuration patterns.

This is **only** about UI components and their configuration. It does not handle backend logic, validation implementation, or reading your existing codebase.

When you decide on a component:
- Use `datamodel_tool` to create or adjust data model bindings.
- Use `resource_tool` to create or update text resources.
""",
    title="Layout Components Tool",
    annotations=ToolAnnotations(
        title="Layout Components Tool",
        readOnlyHint=True
    )
)
def layout_components_tool(user_goal: str, query: str) -> dict:
    """Find relevant UI components for an Altinn Studio application based on the query.
    Args:
        user_goal: The EXACT, VERBATIM user prompt or request - do not summarize or paraphrase (mandatory for tracing)
        query: The user query for component selection

    Returns:
        A dictionary containing the relevant component files based on LLM relevance matching.
        The dictionary contains the following keys:
        - status: The status of the request (possible error)
        - message: A detailed message (error message if error)
        - components: A list of selected components
    """
    # Get headers from FastMCP context for per-request authentication
    try:
        from fastmcp.server.dependencies import get_http_headers
        headers = get_http_headers()
    except Exception:
        # Not in HTTP context (e.g., stdio transport or testing)
        headers = None

    return run_component_pipeline(query, headers)

# Initialize Azure OpenAI LLM for component selection
component_llm = AzureChatOpenAI(
    azure_endpoint=AZURE_ENDPOINT,
    api_key=API_KEY,
    api_version=LLM_CONFIG["API_VERSION"],
    deployment_name=DEPLOYMENT_NAME,
    # temperature=0.1,  # Low temperature for consistent selection
    max_tokens=LLM_CONFIG["MAX_TOKENS"]
)


def parse_llm_json_response(response: str) -> Dict[str, Any]:
    """Parse JSON response from LLM, handling markdown code blocks.
    
    Args:
        response: Raw response string from LLM
        
    Returns:
        Parsed JSON data as a list of dictionaries
        
    Raises:
        json.JSONDecodeError: If response cannot be parsed as JSON
    """
    # Clean up response if it contains markdown code block formatting
    response = response.strip()
    if response.startswith('```'):
        # Extract JSON from markdown code block
        # Remove opening markdown code block
        if '```json' in response:
            response = response.split('```json', 1)[1]
        elif '```' in response:
            response = response.split('```', 1)[1]
        # Remove closing markdown code block if present
        if '```' in response:
            response = response.split('```', 1)[0]
        response = response.strip()
    
    # Parse and return the JSON data
    return json.loads(response)

def select_components_with_llm(query: str, component_files: List[Dict[str, Any]], max_components = 3) -> Dict[str, Any]:
    """Use LLM to select the most relevant components based on the query.
    
    Args:
        query: The user query for component selection
        component_files: List of component files with name and content
        max_components: Maximum number of components to return (default: 3)
        
    Returns:
        Dictionary with status, message, and selected components (if successful)
    """
    try:
        # Create prompt for component selection
        system_message = LLM_PROMPTS.get("COMPONENT_SELECTION_SYSTEM_MESSAGE", "")
        
        # Prepare component summaries for the LLM
        component_summaries = []
        for component_file in component_files:
            name = component_file.get("name", "")
            content = component_file.get("content", "")
            # Include the full content for better analysis
            component_summaries.append(f"Component: {name}\n{content}\n")
        
        # Combine all component summaries
        combined_summaries = "\n".join(component_summaries)
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_message),
            HumanMessage(content=f"""
            Select the most relevant components for this request:
            
            USER REQUEST: {query}
            
            Available components:
            {combined_summaries}
            
            """)
        ])
        
        # Create the chain
        chain = prompt | component_llm | StrOutputParser()
        
        # Execute the chain
        print("Sending request to LLM for component selection...")
        response = chain.invoke({})
        
        # Parse the response
        try:
            parsed_response = parse_llm_json_response(response)
            selections = parsed_response.get("components", [])
            if not selections:
                print("Warning: No components found in LLM response")
                return {
                    "status": "no_components_in_response",
                    "message": "LLM did not return any components in its response"
                }
        except Exception as e:
            print(f"Error parsing LLM response: {e}")
            return {
                "status": "parse_error",
                "message": f"Failed to parse LLM response: {str(e)}"
            }
        
        if len(selections) > max_components:
            selections = selections[:max_components]
        # Validate and filter selections
        valid_selections = []
        for selection in selections:
        # Skip invalid selections
            if not isinstance(selection, dict):
                print(f"Skipping invalid selection: {selection}")
                continue
                
            component_file_name = selection.get("component_file_name", "")
            component_id = selection.get("component_id", "")
            if not component_file_name or not component_id:
                print("Skipping selection with missing component_file_name or component_id")
                continue

            # Find the component file by name using a more efficient approach
            found_component_file = next((cf.get("content", "") for cf in component_files 
                                      if cf.get("name", "") == component_file_name), None)
            if not found_component_file:
                print(f"Component file not found: {component_file_name}")
                continue

            # Parse the component file JSON
            try:
                component_file = json.loads(found_component_file)
            except json.JSONDecodeError as e:
                print(f"Error parsing component file {component_file_name}: {e}")
                continue
            # The layout components are nested under data.layout, not directly under layout
            components = component_file.get("data", {}).get("layout", [])
            
            # Find the specific component by ID using a more efficient approach
            found_component = next((comp for comp in components if comp.get("id", "") == component_id), None)
            if not found_component:
                print(f"Component not found: {component_id} in file {component_file_name}")
                continue

            
            valid_selections.append({
                "name": component_id,
                "content": found_component,
                "reason": selection.get("reason", "No reason provided")
            })
        
        if valid_selections:
            return {
                "status": "success",
                "message": f"Successfully selected {len(valid_selections)} relevant components",
                "components": valid_selections
            }
        else:
            return {
                "status": "no_matches",
                "message": "No components matched the query criteria"
            }
            
    except Exception as e:
        # Use exception type name as status and full message as message
        status = type(e).__name__.lower()
        message = "Error in component selection: " + str(e)
            
        return {
            "status": status,
            "message": message
        }

def run_component_pipeline(query: str, headers: Optional[dict] = None) -> Dict[str, Any]:
    """Run the complete component selection pipeline.

    Args:
        query: The user query for component selection
        headers: Optional HTTP headers for multi-tenant authentication

    Returns:
        Dictionary with status, message, and components (if available)
    """
    try:
        print(f"Processing component request: {query}")

        # Get all components from the component library
        try:
            all_components = get_directory_files(
                COMPONENT_SELECTION_CONFIG["REPO_OWNER"],
                COMPONENT_SELECTION_CONFIG["REPO_NAME"],
                COMPONENT_SELECTION_CONFIG["LAYOUTS_PATH"],
                headers
            )
            if not all_components:
                return {
                    "status": "api_no_components",
                    "message": "No component files found in the repository."
                }
                
            print(f"Fetched {len(all_components)} component files from repository")
        except Exception as e:
            # Use exception type name as status and full message as message
            status = type(e).__name__.lower()
            message = "Error accessing Altinn Studio API: " + str(e)
            return {"status": status, "message": message}
        
        # Use LLM to select relevant components
        llm_result = select_components_with_llm(query, all_components)
        
        # Check if there was an error in the LLM selection process
        if "components" not in llm_result or llm_result["components"] is None:
            # Pass through the error status but use all components as fallback
            return {
                "status": llm_result.get("status", "llm_error"),
                "message": f"LLM selection did not return components: {llm_result.get('message', 'Unknown error')}.",
                "components": None
            }
        
        selected_components = llm_result["components"]
        
        if selected_components:
            return {
                "status": "relevant_components_found",
                "message": f"Found {len(selected_components)} highly relevant component files.",
                "components": selected_components
            }

        else:
            return {
                "status": "no_relevant_components_found",
                "message": "No relevant components found.",
                "components": None
            }
    except Exception as e:
        # Use exception type name as status and full message as message
        status = type(e).__name__.lower()
        message = str(e)
        return {"status": status, "message": message}



# Removed debug code - not for production