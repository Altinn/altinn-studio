"""Layout components tool - fetches all UI components from Altinn component library."""

import json
from typing import Dict, Any, Optional

from scripts.gitea_client import get_directory_files
from server.config import COMPONENT_SELECTION_CONFIG


def run_component_pipeline_no_llm(headers: Optional[dict] = None) -> Dict[str, Any]:
    """Run the component retrieval pipeline without LLM filtering.

    Args:
        headers: Optional HTTP headers for multi-tenant authentication

    Returns:
        Dictionary with status, message, and all components
    """
    try:
        print("Fetching all components from component library...")

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
                    "error_code": "EMPTY_REPOSITORY",
                    "message": "NO_COMPONENTS: No component files found in the component library repository. "
                               "This may indicate a configuration issue or the repository is empty.",
                    "hint": "This is likely a server configuration issue, not a usage error. Contact support if this persists.",
                    "retry_allowed": False
                }
                
            print(f"Fetched {len(all_components)} component files from repository")
        except Exception as e:
            # Use exception type name as status and full message as message
            error_type = type(e).__name__
            return {
                "status": "error",
                "error_code": f"API_ERROR_{error_type.upper()}",
                "message": f"API_ACCESS_ERROR: Failed to access Altinn Studio component library. Error: {str(e)}",
                "hint": "This may be a temporary network issue or authentication problem. "
                        "If using authenticated mode, verify your credentials are valid.",
                "retry_allowed": True  # Network errors may be transient
            }
        
        # Parse and extract all components from all files
        parsed_components = []
        for component_file in all_components:
            file_name = component_file.get("name", "")
            content = component_file.get("content", "")
            
            try:
                parsed_content = json.loads(content)
                # The layout components are nested under data.layout
                components = parsed_content.get("data", {}).get("layout", [])
                
                for component in components:
                    component_id = component.get("id", "")
                    component_type = component.get("type", "")
                    parsed_components.append({
                        "file_name": file_name,
                        "component_id": component_id,
                        "component_type": component_type,
                        "content": component
                    })
            except json.JSONDecodeError as e:
                print(f"Error parsing component file {file_name}: {e}")
                continue
        
        if parsed_components:
            return {
                "status": "success",
                "message": f"Retrieved {len(parsed_components)} components from {len(all_components)} files. Select the relevant components based on your needs.",
                "components": parsed_components
            }
        else:
            return {
                "status": "no_components_parsed",
                "message": "Could not parse any components from the repository files.",
                "components": []
            }
            
    except Exception as e:
        # Use exception type name as status and full message as message
        status = type(e).__name__.lower()
        message = str(e)
        return {"status": status, "message": message}
