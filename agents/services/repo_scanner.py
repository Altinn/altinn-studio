"""
Repository Scanner Module
Analyzes Altinn repository structure and extracts metadata.
"""

import logging
import json
from pathlib import Path

log = logging.getLogger(__name__)


async def scan_repository(mcp_client, repository_path: str) -> dict:
    """
    Scan Altinn repository and extract structure information.
    
    Returns:
        Dictionary with layouts, models, resources, and app_type
    """
    try:
        result = await mcp_client.call_tool('scan_repository', {'repository_path': repository_path})
        
        # Check if tool call failed (MCP returns error in result)
        if isinstance(result, dict) and 'error' in result:
            log.warning(f"MCP scan_repository tool failed: {result['error']}, using fallback")
            return _fallback_scan(repository_path)
        
        # Extract from MCP response
        if isinstance(result, list) and len(result) > 0:
            result_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
            repo_facts = json.loads(result_text)
        else:
            repo_facts = result
        
        log.info(f"Scanned repo: {repo_facts}")
        return repo_facts
    
    except Exception as e:
        log.warning(f"Repository scan failed: {e}, using fallback")
        return _fallback_scan(repository_path)


def _fallback_scan(repository_path: str) -> dict:
    """Fallback repository scan if MCP tool fails."""
    
    repo_path = Path(repository_path)
    
    layouts = []
    models = []
    resources = []
    
    # Scan layouts
    layouts_dir = repo_path / "App" / "ui" / "form" / "layouts"
    if layouts_dir.exists():
        layouts = [str(f.relative_to(repo_path)) for f in layouts_dir.glob("*.json")]
    
    # Scan models
    models_dir = repo_path / "App" / "models"
    if models_dir.exists():
        models = [str(f.relative_to(repo_path)) for f in models_dir.glob("*") if f.suffix in ['.json', '.cs', '.xsd']]
    
    # Scan resources
    resources_dir = repo_path / "App" / "config" / "texts"
    if resources_dir.exists():
        resources = [str(f.relative_to(repo_path)) for f in resources_dir.glob("resource.*.json")]
    
    return {
        'layouts': layouts,
        'models': models,
        'resources': resources,
        'app_type': 'altinn'
    }


async def get_layout_context(mcp_client, repository_path: str, repo_facts: dict) -> dict:
    """Get existing layout structure for context."""
    
    layout_context = None
    
    if repo_facts.get('layouts'):
        first_layout = repo_facts['layouts'][0]
        layout_path = Path(repository_path) / first_layout
        
        try:
            if layout_path.exists():
                with open(layout_path, 'r') as f:
                    layout_context = json.load(f)
                    # Truncate to first few components for context
                    if 'data' in layout_context and 'layout' in layout_context['data']:
                        layout_context['data']['layout'] = layout_context['data']['layout'][:3]
        except Exception as e:
            log.warning(f"Could not load layout context: {e}")
    
    return layout_context
