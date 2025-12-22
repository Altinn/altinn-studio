"""Prompt loader utility for managing system prompts"""
import yaml
from pathlib import Path
from typing import Dict, Any
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

PROMPTS_DIR = Path(__file__).parent


def load_prompt(prompt_name: str) -> Dict[str, Any]:
    """
    Load a prompt from a markdown file with YAML frontmatter.
    
    Args:
        prompt_name: Name of the prompt file (without .md extension)
        
    Returns:
        Dict with keys: content, role, version, name
        
    Example:
        >>> prompt = load_prompt("general_planning")
        >>> print(prompt["content"])
        >>> print(prompt["role"])  # "planner"
    """
    prompt_file = PROMPTS_DIR / f"{prompt_name}.md"
    
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
    
    content = prompt_file.read_text(encoding="utf-8")
    
    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter_text = parts[1].strip()
            prompt_content = parts[2].strip()
            
            try:
                metadata = yaml.safe_load(frontmatter_text) or {}
            except yaml.YAMLError as e:
                log.warning(f"Failed to parse YAML frontmatter in {prompt_name}.md: {e}")
                metadata = {}
        else:
            # No proper frontmatter, treat entire content as prompt
            metadata = {}
            prompt_content = content
    else:
        # No frontmatter at all
        metadata = {}
        prompt_content = content
    
    return {
        "content": prompt_content,
        "role": metadata.get("role", "assistant"),
        "version": metadata.get("version", "1.0"),
        "name": metadata.get("name", prompt_name),
    }


def get_prompt_content(prompt_name: str) -> str:
    """
    Convenience function to get just the prompt content as a string.
    
    Args:
        prompt_name: Name of the prompt file (without .md extension)
        
    Returns:
        Prompt content as string
    """
    return load_prompt(prompt_name)["content"]


def render_template(template_name: str, **variables) -> str:
    """
    Load and render a template with variable substitution.
    
    Templates are located in the templates/ subdirectory.
    Uses Python's str.format() for variable substitution.
    
    Args:
        template_name: Name of the template file (without .md extension)
        **variables: Keyword arguments to substitute into the template
        
    Returns:
        Rendered template string
        
    Example:
        >>> text = render_template("general_planning_user", 
        ...                        user_goal="Add a field",
        ...                        planner_step="Step 1")
    """
    template_file = PROMPTS_DIR / "templates" / f"{template_name}.md"
    
    if not template_file.exists():
        raise FileNotFoundError(f"Template file not found: {template_file}")
    
    template_content = template_file.read_text(encoding="utf-8")
    
    try:
        return template_content.format(**variables)
    except KeyError as e:
        raise ValueError(f"Missing required template variable: {e}")
